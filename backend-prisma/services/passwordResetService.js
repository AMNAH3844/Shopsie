// import crypto from "crypto";
// import bcrypt from "bcryptjs";
// import { passwordResetEmailTemplate } from "../emailTemplates/passwordResetEmail.js";
// import { sendEmail } from "./emailService.js";

// const RESET_TOKEN_BYTES = 32;
// const RESET_TOKEN_EXPIRY_MINUTES = 60;

// function hashResetToken(token) {
//   return crypto.createHash("sha256").update(token).digest("hex");
// }

// function buildResetUrl(req, token) {
//   const baseUrl =
//     process.env.PASSWORD_RESET_URL_BASE ||
//     process.env.APP_RESET_PASSWORD_URL ||
//     `${req.protocol}://${req.get("host")}/reset-password`;

//   const separator = baseUrl.includes("?") ? "&" : "?";
//   return `${baseUrl}${separator}token=${encodeURIComponent(token)}`;
// }

// export async function requestPasswordReset({ prisma, email, req }) {
//   const normalizedEmail = String(email || "").trim().toLowerCase();
//   const resetUrl = buildResetUrl(req, token);

//   if (!normalizedEmail) {
//     const error = new Error("Email is required");
//     error.statusCode = 400;
//     throw error;
//   }

//   const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

//   if (!user) {
//     return;
//   }

//   await prisma.passwordResetToken.updateMany({
//     where: {
//       userId: user.id,
//       usedAt: null,
//       expiresAt: { gt: new Date() },
//     },
//     data: { usedAt: new Date() },
//   });

//   const token = crypto.randomBytes(RESET_TOKEN_BYTES).toString("hex");
//   const tokenHash = hashResetToken(token);
//   const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000);

//   await prisma.passwordResetToken.create({
//     data: {
//       userId: user.id,
//       tokenHash,
//       expiresAt,
//     },
//   });

//   const resetUrl = buildResetUrl(req, token);
//   const emailContent = passwordResetEmailTemplate(resetUrl);

//   await sendEmail({
//     to: user.email,
//     ...emailContent,
//   });
// }

// export async function resetPasswordWithToken({ prisma, token, newPassword }) {
//   if (!token || !newPassword) {
//     const error = new Error("Token and new password are required");
//     error.statusCode = 400;
//     throw error;
//   }

//   if (newPassword.length < 5) {
//     const error = new Error("Password must be at least 5 characters");
//     error.statusCode = 400;
//     throw error;
//   }

//   const tokenHash = hashResetToken(token);

//   const resetToken = await prisma.passwordResetToken.findUnique({
//     where: { tokenHash },
//     include: { user: true },
//   });

//   if (!resetToken || resetToken.usedAt || resetToken.expiresAt <= new Date()) {
//     const error = new Error("Invalid or expired reset link");
//     error.statusCode = 400;
//     throw error;
//   }

//   const hashedPassword = await bcrypt.hash(newPassword, 10);

//   await prisma.$transaction([
//     prisma.user.update({
//       where: { id: resetToken.userId },
//       data: { password: hashedPassword },
//     }),
//     prisma.passwordResetToken.update({
//       where: { id: resetToken.id },
//       data: { usedAt: new Date() },
//     }),
//   ]);
// }
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { passwordResetEmailTemplate } from "../emailTemplates/passwordResetEmail.js";
import { sendEmail } from "./emailService.js";

const RESET_TOKEN_BYTES = 32;
const RESET_TOKEN_EXPIRY_MINUTES = 60;

function hashResetToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function buildResetUrl(req, token) {
  const baseUrl =
    process.env.PASSWORD_RESET_URL_BASE ||
    process.env.APP_RESET_PASSWORD_URL ||
    `${req.protocol}://${req.get("host")}/reset-password`;

  const separator = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${separator}token=${encodeURIComponent(token)}`;
}

export async function requestPasswordReset({ prisma, email, req }) {
  const normalizedEmail = String(email || "").trim().toLowerCase();

  if (!normalizedEmail) {
    const error = new Error("Email is required");
    error.statusCode = 400;
    throw error;
  }

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    return;
  }

  await prisma.passwordResetToken.updateMany({
    where: {
      userId: user.id,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    data: { usedAt: new Date() },
  });

  const token = crypto.randomBytes(RESET_TOKEN_BYTES).toString("hex");
  const tokenHash = hashResetToken(token);
  const expiresAt = new Date(
    Date.now() + RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000
  );

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt,
    },
  });

  const resetUrl = buildResetUrl(req, token);

  console.log("=================================");
  console.log("RESET URL:", resetUrl);
  console.log("USER EMAIL:", user.email);
  console.log("=================================");

  const emailContent = passwordResetEmailTemplate(resetUrl);

  await sendEmail({
    to: user.email,
    ...emailContent,
  });
}

export async function resetPasswordWithToken({ prisma, token, newPassword }) {
  if (!token || !newPassword) {
    const error = new Error("Token and new password are required");
    error.statusCode = 400;
    throw error;
  }

  if (newPassword.length < 5) {
    const error = new Error("Password must be at least 5 characters");
    error.statusCode = 400;
    throw error;
  }

  const tokenHash = hashResetToken(token);

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!resetToken || resetToken.usedAt || resetToken.expiresAt <= new Date()) {
    const error = new Error("Invalid or expired reset link");
    error.statusCode = 400;
    throw error;
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetToken.userId },
      data: { password: hashedPassword },
    }),
    prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    }),
  ]);
}