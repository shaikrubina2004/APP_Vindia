// ===== FILE: APP_Vindia/backend/utils/mailer.js =====
const nodemailer = require("nodemailer");

// Generic SMTP transport. Works with any provider — SendGrid, Mailgun,
// SES, Gmail, etc. — by just setting these in .env:
//   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM
// Optional: APP_URL = the address employees open to sign in
//   (default http://localhost:5173 — set the real one in production)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: Number(process.env.SMTP_PORT) === 465, // true for port 465, false for 587/others
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM = process.env.MAIL_FROM || process.env.SMTP_USER;
const APP_URL = (process.env.APP_URL || "http://localhost:5173").replace(/\/$/, "");

/**
 * Send one email. Never throws — always resolves with { success, error }
 * so callers can log the attempt either way instead of crashing a request.
 * `text` is an optional plain-text version (better deliverability).
 */
const sendMail = async ({ to, subject, html, text }) => {
  try {
    await transporter.sendMail({ from: FROM, to, subject, html, text });
    return { success: true, error: null };
  } catch (err) {
    console.error("MAILER ERROR:", err.message);
    return { success: false, error: err.message };
  }
};

// Escape anything that comes from a user/database before it goes into HTML.
const esc = (v) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/* ═══════════════════════════════════════
   TEMPLATES
   Each returns { subject, html } — kept simple and readable rather
   than heavily styled, since these are transactional notices.
═══════════════════════════════════════ */

const qualifiedEmailTemplate = (candidateName, jobTitle) => ({
  subject: `You've moved forward — ${jobTitle}`,
  html: `
    <p>Hi ${candidateName},</p>
    <p>Thank you for applying for the <strong>${jobTitle}</strong> position. We've reviewed your
    application and would like to move forward with you to the next stage.</p>
    <p>Our team will be in touch shortly with next steps.</p>
    <p>Best regards,<br/>Vindia Technologies HR Team</p>
  `,
});

const rejectedEmailTemplate = (candidateName, jobTitle, reason) => ({
  subject: `Update on your application — ${jobTitle}`,
  html: `
    <p>Hi ${candidateName},</p>
    <p>Thank you for your interest in the <strong>${jobTitle}</strong> position and for the time
    you invested in the process.</p>
    <p>After careful consideration, we've decided not to move forward with your application
    at this time${reason ? `: ${reason}` : "."}</p>
    <p>We appreciate your interest in Vindia Technologies and wish you the best in your search.</p>
    <p>Best regards,<br/>Vindia Technologies HR Team</p>
  `,
});

const aptitudeTestEmailTemplate = (candidateName, jobTitle, testLink) => ({
  subject: `Aptitude test — ${jobTitle}`,
  html: `
    <p>Hi ${candidateName},</p>
    <p>As the next step for the <strong>${jobTitle}</strong> position, please complete the
    aptitude test using the link below:</p>
    <p><a href="${testLink}">${testLink}</a></p>
    <p>Please complete it at your earliest convenience.</p>
    <p>Best regards,<br/>Vindia Technologies HR Team</p>
  `,
});

const offerReleaseEmailTemplate = (
  candidateName,
  jobTitle,
  offeredRole,
  offeredSalary,
  joiningDate,
  extra = {},
) => {
  const { location, employmentType, managerName } = extra;
  const joining = joiningDate
    ? new Date(joiningDate).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "—";

  return {
    subject: `Offer of Employment — ${offeredRole}`,
    html: `
    <p>Hi ${esc(candidateName)},</p>
    <p>Congratulations! We're pleased to offer you the position of
    <strong>${esc(offeredRole)}</strong> at Vindia Technologies.</p>
    <ul>
      <li><strong>Role:</strong> ${esc(offeredRole)}</li>
      <li><strong>Annual Salary:</strong> ₹${Number(offeredSalary).toLocaleString("en-IN")}</li>
      <li><strong>Joining Date:</strong> ${esc(joining)}</li>
      ${location ? `<li><strong>Work Location:</strong> ${esc(location)}</li>` : ""}
      ${employmentType ? `<li><strong>Employment Type:</strong> ${esc(employmentType)}</li>` : ""}
      ${managerName ? `<li><strong>Reporting To:</strong> ${esc(managerName)}</li>` : ""}
    </ul>
    <p>We're excited to have you join the team. Please reply to this email to confirm your acceptance.</p>
    <p>Best regards,<br/>Vindia Technologies HR Team</p>
  `,
  };
};

// scheduledAt arrives as "YYYY-MM-DDTHH:mm", exactly as HR typed it.
const interviewScheduledEmailTemplate = ({
  candidateName,
  jobTitle,
  roundNumber,
  scheduledAt,
  mode,
  locationOrLink,
  interviewerName,
}) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(scheduledAt || "");
  const when = m
    ? new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]).toLocaleString("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    : scheduledAt;

  const isOnline = mode === "online";
  const where = isOnline
    ? `<a href="${esc(locationOrLink)}">${esc(locationOrLink)}</a>`
    : esc(locationOrLink);

  return {
    subject: `Interview scheduled — Round ${roundNumber} — ${jobTitle}`,
    html: `
    <p>Hi ${esc(candidateName)},</p>
    <p>Your <strong>Round ${esc(roundNumber)}</strong> interview for the
    <strong>${esc(jobTitle)}</strong> position has been scheduled.</p>
    <ul>
      <li><strong>Date &amp; time:</strong> ${esc(when)}</li>
      <li><strong>Mode:</strong> ${isOnline ? "Online" : "In person"}</li>
      <li><strong>${isOnline ? "Meeting link" : "Venue"}:</strong> ${where}</li>
      ${interviewerName ? `<li><strong>Interviewer:</strong> ${esc(interviewerName)}</li>` : ""}
    </ul>
    <p>Please be ready a few minutes early. Reply to this email if you need to reschedule.</p>
    <p>Best regards,<br/>Vindia Technologies HR Team</p>
  `,
    text: `Hi ${candidateName}, your Round ${roundNumber} interview for ${jobTitle} is on ${when}. ${isOnline ? "Link" : "Venue"}: ${locationOrLink}.`,
  };
};

/**
 * Welcome email with the employee's first login details.
 * The temporary password is shown ONLY here (it is stored hashed).
 */
const welcomeCredentialsEmailTemplate = ({ name, email, employeeCode, tempPassword }) => {
  const row = (label, value, mono) => `
    <tr>
      <td style="padding:8px 0;color:#64748b;font-size:13px;width:150px;vertical-align:top;">${label}</td>
      <td style="padding:8px 0;color:#0f172a;font-size:${mono ? "17px" : "14px"};font-weight:${mono ? "700" : "600"};${mono ? "font-family:Consolas,Menlo,monospace;letter-spacing:1px;" : ""}">${value}</td>
    </tr>`;

  const html = `
  <div style="background:#f4f6fb;padding:28px 12px;font-family:Segoe UI,Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e2e8f0;">
      <tr>
        <td style="background:#0f2a5e;padding:22px 28px;">
          <div style="color:#ffffff;font-size:20px;font-weight:700;">Vindia Technologies</div>
          <div style="color:#bfd0f5;font-size:13px;margin-top:2px;">Welcome to the team</div>
        </td>
      </tr>
      <tr>
        <td style="padding:28px;">
          <p style="margin:0 0 12px;font-size:16px;color:#0f172a;">Hi ${esc(name)},</p>
          <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#334155;">
            Welcome aboard! Your Vindia account is ready. Use the details below to sign in for the first time.
          </p>

          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f5f9;border-left:4px solid #2563eb;border-radius:8px;padding:8px 18px;margin-bottom:22px;">
            ${row("Employee ID", esc(employeeCode || "—"))}
            ${row("Login ID (email)", esc(email))}
            ${row("Temporary password", esc(tempPassword), true)}
          </table>

          <p style="margin:0 0 22px;text-align:center;">
            <a href="${esc(APP_URL)}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 28px;border-radius:8px;">Sign in to Vindia</a>
          </p>

          <ul style="margin:0 0 18px;padding-left:18px;font-size:13px;line-height:1.7;color:#475569;">
            <li>After you sign in we will invite you to set your own password. We recommend doing this right away.</li>
            <li>Your Employee ID and login ID stay the same and cannot be changed.</li>
            <li>Never share this password with anyone.</li>
          </ul>

          <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
            If you were not expecting this email, please contact the HR team.<br/>
            Vindia Technologies HR Team
          </p>
        </td>
      </tr>
    </table>
  </div>`;

  const text = [
    `Hi ${name},`,
    "",
    "Welcome aboard! Your Vindia account is ready. Use these details to sign in for the first time:",
    "",
    `Employee ID: ${employeeCode || "-"}`,
    `Login ID (email): ${email}`,
    `Temporary password: ${tempPassword}`,
    "",
    `Sign in: ${APP_URL}`,
    "",
    "After you sign in we will invite you to set your own password (recommended).",
    "Your Employee ID and login ID stay the same and cannot be changed.",
    "Never share this password with anyone.",
    "",
    "Vindia Technologies HR Team",
  ].join("\n");

  return { subject: "Welcome to Vindia — your login details", html, text };
};

module.exports = {
  sendMail,
  qualifiedEmailTemplate,
  rejectedEmailTemplate,
  aptitudeTestEmailTemplate,
  
  interviewScheduledEmailTemplate,
  offerReleaseEmailTemplate,
  welcomeCredentialsEmailTemplate,
};