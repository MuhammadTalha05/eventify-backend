import nodemailer from "nodemailer";

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  SMTP_FROM,
} = process.env;

if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !SMTP_FROM) {
  console.warn("SMTP environment variables are not completely set. Emails may fail.");
}

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT || 587),
  secure: Number(SMTP_PORT || 587) === 465,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

export async function sendEmail(to: string, subject: string, text: string, html?: string) {
  return transporter.sendMail({
    from: SMTP_FROM,
    to,
    subject,
    text,
    html,
  });
}

export async function sendOtpEmail(to: string, otp: string, purpose = "verification", ttlMinutes = 10) {
  const subject = purpose === "password_reset" ? "Password reset code" : "Your OTP code";
  const text = `Your ${purpose} OTP: ${otp}. It will expire in ${ttlMinutes} minutes.`;
  const html = `<p>Your <strong>${purpose}</strong> OTP: <strong>${otp}</strong></p><p>It will expire in ${ttlMinutes} minutes.</p>`;
  return sendEmail(to, subject, text, html);
}
