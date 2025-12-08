// src/utils/sendEmail.js
const nodemailer = require("nodemailer");

const sendEmail = async ({ email, subject, message }) => {
  // 👉 Production (Render) pe email send SKIP kar do
  if (process.env.NODE_ENV === "production") {
    console.log("📨 [MOCK EMAIL - PRODUCTION]");
    console.log("To:", email);
    console.log("Subject:", subject);
    console.log("Message:", message);
    return;
  }

  // 👉 Local development ke liye real email (agar kabhi sahi SMTP lagaoge)
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const mailOptions = {
    from: `"EaseHub" <${process.env.SMTP_USER}>`,
    to: email,
    subject,
    text: message,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
