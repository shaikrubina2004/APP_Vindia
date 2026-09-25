/* ══════════════════════════════════════════════════════════
   BDA FOLLOW-UP ESCALATION CONFIG

   Defines what happens when a BDA misses a follow-up: the lead
   is automatically reassigned so nothing falls through the cracks.

   This is fully automatic — no need to list names here. When a
   follow-up goes overdue, bdaNotificationsController.js looks up
   every active user with the "bda" role (from the users/roles
   tables) and reassigns the lead to whichever one currently has
   the fewest active leads, excluding whoever the lead is already
   assigned to. That keeps leads spread evenly across the team and
   works for any BDA, current or future, with zero manual setup.

   The only thing to tune here is how long to wait before
   escalating.
══════════════════════════════════════════════════════════ */

/* How many days PAST the due date a follow-up can sit before it
   auto-escalates to another BDA. 0 = escalate the day after it
   was due. Keep this at 1+ in practice so a BDA has a real chance
   to act before losing the lead. */
const ESCALATION_GRACE_DAYS = 1;

module.exports = { ESCALATION_GRACE_DAYS };