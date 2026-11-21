const pool = require("../config/db");
const { CLOSED_STATUSES } = require("../utils/leadAssignment");
const { ensureLeadCoverSchema } = require("../utils/leadCover");
const leadCtrl = require("./leadController");
const { createNotification, notifyLeadAssigned } = require("./bdaNotificationsController");

/* The logged-in user comes from the JWT (not from the URL) */
async function currentUser(req) {
  const { rows } = await pool.query(
    "SELECT id, name, email FROM users WHERE id = $1", [req.user.id]
  );
  return rows[0];
}

/* GET /api/lead-cover/mine
   Leads the logged-in BDA has been asked to follow up for someone else. */
exports.mine = async (req, res) => {
  try {
    await ensureLeadCoverSchema();
    const me = await currentUser(req);
    if (!me) return res.status(404).json({ message: "User not found" });

    const { rows } = await pool.query(
      `SELECT l.id, l.name, l.phone, l.city, l.source, l.status,
              l.assigned_to  AS owner_name,
              l.snooze_until AS next_followup,
              l.cover_since,
              (SELECT f.note FROM followups f
                WHERE f.lead_id = l.id ORDER BY f.created_at DESC LIMIT 1) AS last_note
         FROM leads l
        WHERE LOWER(l.cover_email) = LOWER($1)
          AND l.deleted_by_admin = false
          AND LOWER(COALESCE(l.status, '')) <> ALL($2)
        ORDER BY l.snooze_until ASC NULLS LAST, l.cover_since ASC`,
      [me.email || "", CLOSED_STATUSES]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("Lead cover (mine) error:", err.message);
    res.status(500).json({ message: "Failed to load covered leads" });
  }
};

/* GET /api/lead-cover/outgoing
   The logged-in BDA's OWN leads that someone else is currently covering. */
exports.outgoing = async (req, res) => {
  try {
    await ensureLeadCoverSchema();
    const me = await currentUser(req);
    if (!me) return res.status(404).json({ message: "User not found" });

    const { rows } = await pool.query(
      `SELECT l.id, l.name, l.cover_name, l.snooze_until AS next_followup, l.cover_since
         FROM leads l
        WHERE l.cover_email IS NOT NULL
          AND l.deleted_by_admin = false
          AND LOWER(COALESCE(l.status, '')) <> ALL($3)
          AND ( LOWER(l.assigned_email) = LOWER($1)
                OR LOWER(TRIM(l.assigned_to)) = LOWER(TRIM($2)) )
        ORDER BY l.cover_since DESC`,
      [me.email || "", me.name || "", CLOSED_STATUSES]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("Lead cover (outgoing) error:", err.message);
    res.status(500).json({ message: "Failed to load covered leads" });
  }
};

/* POST /api/lead-cover/:leadId/follow-up   { note, status, nextFollowUp }
   The covering BDA logs the follow-up. The BDA who follows up keeps the lead:
     1. claim — the lead is assigned to the covering BDA (only if they ARE its cover)
     2. the normal follow-up save runs (leadController.addFollowUp)
     3. if that save fails, the claim is undone
   (If the OWNER logs a follow-up first, the DB trigger ends the cover and the
    owner simply keeps the lead — this endpoint then answers "already handled".) */
function runAddFollowUp(req, me, leadId, body) {
  return new Promise((resolve) => {
    const out = { statusCode: 200, body: null };
    const done = () => resolve(out);
    const fakeRes = {
      status(c) { out.statusCode = c; return fakeRes; },
      json(d)   { out.body = d; done(); return fakeRes; },
      send(d)   { out.body = d; done(); return fakeRes; },
    };
    const timer = setTimeout(() => { out.statusCode = 504; out.body = { error: "Follow-up save timed out" }; done(); }, 15000);
    Promise.resolve(
      leadCtrl.addFollowUp(
        { params: { leadId }, body, query: { role: req.user.role, name: me.name, email: me.email }, user: req.user },
        fakeRes
      )
    ).catch((e) => { out.statusCode = 500; out.body = { error: e.message }; done(); })
     .finally(() => clearTimeout(timer));
  });
}

exports.followUp = async (req, res) => {
  try {
    await ensureLeadCoverSchema();
    const me = await currentUser(req);
    if (!me) return res.status(404).json({ error: "User not found" });

    const { leadId } = req.params;
    const { note, status, nextFollowUp } = req.body || {};
    if (!String(note || "").trim()) return res.status(400).json({ error: "Note required" });

    const cur = await pool.query(
      `SELECT id, name, phone, assigned_to, assigned_email, assigned_at, assigned_by, last_assignee,
              cover_email, cover_name, cover_since, snooze_until
         FROM leads
        WHERE id = $1 AND deleted_by_admin = false AND LOWER(cover_email) = LOWER($2)`,
      [leadId, me.email || ""]
    );
    if (!cur.rows.length) {
      return res.status(409).json({
        error: "This lead is no longer waiting for you — its owner or another BDA already followed up on it.",
      });
    }
    const before = cur.rows[0];

    // 1) claim: the BDA who follows up keeps the lead
    const claim = await pool.query(
      `UPDATE leads
          SET last_assignee  = assigned_to,
              assigned_to    = $2,
              assigned_email = $3,
              assigned_by    = 'System (missed follow-up)',
              assigned_at    = NOW()
        WHERE id = $1 AND LOWER(cover_email) = LOWER($3)
      RETURNING id`,
      [leadId, me.name, me.email]
    );
    if (!claim.rows.length) {
      return res.status(409).json({ error: "This lead was just handled by someone else." });
    }

    // 2) the normal follow-up save
    const result = await runAddFollowUp(req, me, leadId, { note: String(note).trim(), status, nextFollowUp });

    // 3) undo the claim if the save failed
    if (result.statusCode >= 400) {
      await pool.query(
        `UPDATE leads SET assigned_to=$2, assigned_email=$3, assigned_by=$4, assigned_at=$5, last_assignee=$6 WHERE id=$1`,
        [leadId, before.assigned_to, before.assigned_email, before.assigned_by, before.assigned_at, before.last_assignee]
      );
      // (separate statement: changing assigned_to cleared the cover columns via trigger)
      await pool.query(
        `UPDATE leads SET cover_email=$2, cover_name=$3, cover_since=$4 WHERE id=$1`,
        [leadId, before.cover_email, before.cover_name, before.cover_since]
      );
      return res.status(result.statusCode).json(result.body || { error: "Failed to save follow-up" });
    }

    // tell both sides what happened
    notifyLeadAssigned({
      leadId: before.id, name: before.name, phone: before.phone,
      assigneeEmail: me.email, assignedByName: "The system (missed follow-up)",
    }).catch((e) => console.error("Cover notify (new owner) error:", e.message));

    let oldEmail = before.assigned_email;
    if (!oldEmail && before.assigned_to) {
      const u = await pool.query(
        `SELECT email FROM users WHERE LOWER(TRIM(name)) = LOWER(TRIM($1)) LIMIT 1`, [before.assigned_to]);
      oldEmail = u.rows[0]?.email || null;
    }
    if (oldEmail) {
      createNotification({
        type: "lead_assigned",
        title: `Lead moved: ${before.name}`,
        description: `${me.name} followed up ${before.name} after the missed follow-up. The lead is now ${me.name}'s.`,
        severity: "info",
        lead_id: before.id,
        bda_email: oldEmail,
      }).catch((e) => console.error("Cover notify (old owner) error:", e.message));
    }

    res.json({ success: true, message: `${before.name} is now your lead.` });
  } catch (err) {
    console.error("Lead cover (follow-up) error:", err.message);
    res.status(500).json({ error: "Failed to save follow-up" });
  }
};