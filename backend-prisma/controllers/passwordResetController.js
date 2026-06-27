import { PrismaClient } from "@prisma/client";
import {
  requestPasswordReset,
  resetPasswordWithToken,
} from "../services/passwordResetService.js";

const prisma = new PrismaClient();

export async function lookupResetEmail(req, res) {
  try {
    const { username, userId } = req.body;

    if (!username && !userId) {
      return res.status(400).json({ message: "Username or user ID is required" });
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

    if (!user) {
      return res.status(404).json({ message: "No account found for this username" });
    }

    return res.json({
      userId: user.id,
      username: user.username,
      email: user.email,
    });
  } catch (error) {
    console.error("Lookup reset email error:", error);
    return res.status(500).json({ message: "Unable to find account email" });
  }
}

export async function forgotPassword(req, res) {
  try {
    const { email } = req.body;

    await requestPasswordReset({ prisma, email, req });

    return res.json({
      message: "If an account exists for this email, a reset email has been sent.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return res
      .status(error.statusCode || 500)
      .json({ message: error.statusCode ? error.message : "Unable to send reset email" });
  }
}

export async function resetPassword(req, res) {
  try {
    const { token, newPassword } = req.body;

    await resetPasswordWithToken({ prisma, token, newPassword });

    return res.json({
      message: "Your password has been reset successfully.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return res
      .status(error.statusCode || 500)
      .json({ message: error.statusCode ? error.message : "Unable to reset password" });
  }
}
