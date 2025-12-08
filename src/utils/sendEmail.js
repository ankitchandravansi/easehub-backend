// src/utils/sendEmail.js
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false, // Gmail with STARTTLS
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    // ⚠️ Dev environment me self-signed / antivirus proxy ke issues avoid karega
    rejectUnauthorized: false,
  },
});

async function sendEmail({ to, subject, html }) {
  // Agar SMTP creds nahi diye, to sirf log karo, error mat throw karo
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log("⚠️ SMTP creds missing, skipping real email send");
    console.log("Email payload:", { to, subject });
    return;
  }

  try {
    const info = await transporter.sendMail({
      from: `"EaseHub" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });

    console.log("📧 Email sent:", info.messageId);
  } catch (err) {
    console.error("❌ Error sending email:", err.message);

    // Production me fail important hai, dev me mat todo flow
    if (process.env.NODE_ENV === "production") {
      throw err;
    } else {
      console.log("⚠️ Dev mode: email error ignored, continuing without throwing.");
    }
  }
}

module.exports = sendEmail;
