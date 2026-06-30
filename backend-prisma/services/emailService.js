import nodemailer from "nodemailer";

let reusableTransporter = null;

function getTransporter() {
  if (reusableTransporter) return reusableTransporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE } = process.env;

  console.log("Creating transporter...");
  console.log("SMTP_HOST:", SMTP_HOST);
  console.log("SMTP_PORT:", SMTP_PORT);
  console.log("SMTP_SECURE:", SMTP_SECURE);
  console.log("SMTP_USER:", SMTP_USER);
  console.log("SMTP_PASS exists:", !!SMTP_PASS);

  reusableTransporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: SMTP_SECURE === "true",
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
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