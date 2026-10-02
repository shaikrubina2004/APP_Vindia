// ===== FILE: APP_Vindia/backend/utils/mailer.js =====
const nodemailer = require("nodemailer");

// Generic SMTP transport. Works with any provider — SendGrid, Mailgun,
// SES, Gmail, etc. — by just setting these in .env:
//   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM
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

/**
 * Send one email. Never throws — always resolves with { success, error }
 * so callers can log the attempt either way instead of crashing a request.
 */
const sendMail = async ({ to, subject, html }) => {
  try {
    await transporter.sendMail({ from: FROM, to, subject, html });
    return { success: true, error: null };
  } catch (err) {
    console.error("MAILER ERROR:", err.message);
    return { success: false, error: err.message };
  }
};

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

const offerReleaseEmailTemplate = (candidateName, jobTitle, offeredRole, offeredSalary, joiningDate) => ({
  subject: `Offer of Employment — ${offeredRole}`,
  html: `
    <p>Hi ${candidateName},</p>
    <p>Congratulations! We're pleased to offer you the position of
    <strong>${offeredRole}</strong> at Vindia Technologies.</p>
    <ul>
      <li><strong>Role:</strong> ${offeredRole}</li>
      <li><strong>Annual Salary:</strong> ₹${Number(offeredSalary).toLocaleString("en-IN")}</li>
      <li><strong>Joining Date:</strong> ${new Date(joiningDate).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}</li>
    </ul>
    <p>We're excited to have you join the team. Further onboarding details will follow.</p>
    <p>Best regards,<br/>Vindia Technologies HR Team</p>
  `,
});

module.exports = {
  sendMail,
  qualifiedEmailTemplate,
  rejectedEmailTemplate,
  aptitudeTestEmailTemplate,
  offerReleaseEmailTemplate,
};