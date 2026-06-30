import nodemailer from "nodemailer";

let reusableTransporter = null;

function getTransporter() {
  if (reusableTransporter) return reusableTransporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE } = process.env;

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    const error = new Error(
      "SMTP email configuration is missing. Add SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and EMAIL_FROM in backend-prisma/.env."
    );
    error.statusCode = 500;
    throw error;
  }

  console.log("=== FINAL SMTP CONFIG ===");
  console.log({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    user: SMTP_USER,
    hasPassword: !!SMTP_PASS,
  });

  reusableTransporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: SMTP_SECURE === "true",
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
    connectionTimeout: 30000,
    greetingTimeout: 30000,
    socketTimeout: 30000,
  });

  return reusableTransporter;
}

export async function sendEmail({ to, subject, text, html }) {
  try {
    console.log("=== SENDING EMAIL ===");
    console.log("To:", to);
    console.log("Subject:", subject);
    console.log("From:", process.env.EMAIL_FROM || process.env.SMTP_USER);

    const transporter = getTransporter();

    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.SMTP_USER,
      to,
      subject,
      text,
      html,
    });

    console.log("=== EMAIL SENT SUCCESSFULLY ===");
    console.log("Message ID:", info.messageId);
    console.log("Accepted:", info.accepted);
    console.log("Rejected:", info.rejected);
    console.log("Response:", info.response);

    return info;
  } catch (error) {
    console.error("=== EMAIL SEND ERROR ===");
    console.error("Message:", error.message);
    console.error("Code:", error.code);
    console.error(error);

    throw error;
  }
}