import { PrismaClient } from "@prisma/client";
import {
  requestPasswordReset,
  resetPasswordWithToken,
} from "../services/passwordResetService.js";

const prisma = new PrismaClient();

export async function lookupResetEmail(req, res) {
  try {
    console.log("=== LOOKUP RESET EMAIL REQUEST ===");
    console.log("Body:", req.body);

    const { username, userId } = req.body;

    if (!username && !userId) {
      return res
        .status(400)
        .json({ message: "Username or user ID is required" });
    }

    const user = await prisma.user.findFirst({
      where: userId
        ? { id: parseInt(userId) }
        : { username: String(username).trim() },
      select: {
        id: true,
        username: true,
        email: true,
      },
    });

    console.log("User found:", user);

    if (!user) {
      return res
        .status(404)
        .json({ message: "No account found for this username" });
    }

    return res.json({
      userId: user.id,
      username: user.username,
      email: user.email,
    });
  } catch (error) {
    console.error("=== LOOKUP RESET EMAIL ERROR ===");
    console.error(error);
    console.error(error.stack);

    return res.status(500).json({ message: "Unable to find account email" });
  }
}

export async function forgotPassword(req, res) {
  try {
    console.log("=================================");
    console.log("FORGOT PASSWORD REQUEST RECEIVED");
    console.log("=================================");

    console.log("Request Body:", req.body);
    console.log("Email:", req.body?.email);

    console.log("Environment Check:");
    console.log("JWT_SECRET exists:", !!process.env.JWT_SECRET);
    console.log("DATABASE_URL exists:", !!process.env.DATABASE_URL);
    console.log("SMTP_HOST:", process.env.SMTP_HOST);
    console.log("SMTP_PORT:", process.env.SMTP_PORT);
    console.log("SMTP_SECURE:", process.env.SMTP_SECURE);
    console.log("SMTP_USER:", process.env.SMTP_USER);
    console.log("SMTP_PASS exists:", !!process.env.SMTP_PASS);
    console.log("EMAIL_FROM:", process.env.EMAIL_FROM);
    console.log(
      "PASSWORD_RESET_URL_BASE:",
      process.env.PASSWORD_RESET_URL_BASE
    );

    const { email } = req.body;

    await requestPasswordReset({
      prisma,
      email,
      req,
    });

    console.log("Password reset email request completed successfully.");

    return res.json({
      message:
        "If an account exists for this email, a reset email has been sent.",
    });
  } catch (error) {
    console.error("=================================");
    console.error("FORGOT PASSWORD ERROR");
    console.error("=================================");

    console.error("Message:", error.message);
    console.error("Name:", error.name);

    if (error.code) {
      console.error("Code:", error.code);
    }

    console.error("Full Error:", error);
    console.error("Stack:", error.stack);

    return res.status(error.statusCode || 500).json({
      message: error.statusCode
        ? error.message
        : "Unable to send reset email",
    });
  }
}

export async function resetPassword(req, res) {
  try {
    console.log("=== RESET PASSWORD REQUEST ===");
    console.log("Body:", req.body);
    console.log("Token exists:", !!req.body?.token);

    const { token, newPassword } = req.body;

    await resetPasswordWithToken({
      prisma,
      token,
      newPassword,
    });

    console.log("Password reset successful.");

    return res.json({
      message: "Your password has been reset successfully.",
    });
  } catch (error) {
    console.error("=== RESET PASSWORD ERROR ===");
    console.error("Message:", error.message);
    console.error(error);
    console.error(error.stack);

    return res.status(error.statusCode || 500).json({
      message: error.statusCode ? error.message : "Unable to reset password",
    });
  }
}