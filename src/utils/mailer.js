// src/utils/sendEmail.js  (ya mailer.js agar uska naam yahi hai)
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,      // smtp.gmail.com
  port: Number(process.env.EMAIL_PORT) || 587,
  secure: process.env.EMAIL_SECURE === "true", // 587 -> false, 465 -> true
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  // local dev me certificate issue aa sakta hai, isliye:
  tls: {
    rejectUnauthorized: false,
  },
});

export async function sendVerificationEmail(toEmail, verifyLink) {
  const mailOptions = {
    from: `"EaseHub" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: "Verify your EaseHub account",
    text: `Click this link to verify your email: ${verifyLink}`,
    html: `
      <p>Hi,</p>
      <p>Thanks for signing up to <b>EaseHub</b>.</p>
      <p>Click the button below to verify your email:</p>
      <p>
        <a href="${verifyLink}" 
           style="background:#4f46e5;color:#fff;padding:10px 18px;
                  text-decoration:none;border-radius:6px;">
          Verify Email
        </a>
      </p>
      <p>Or open this link manually:</p>
      <p><a href="${verifyLink}">${verifyLink}</a></p>
    `,
  };

  const info = await transporter.sendMail(mailOptions);
  console.log("✅ Verification email sent:", info.messageId);
}
