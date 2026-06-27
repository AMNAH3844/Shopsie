import express from "express";
import { PrismaClient } from "@prisma/client";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = express.Router();
const prisma = new PrismaClient();

// Serve uploads folder publicly
router.use("/uploads", express.static("uploads"));

// ================= MULTER SETUP =================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "./uploads/profileImages";
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + ext);
  },
});
const upload = multer({ storage });

// ================= UPDATE USER =================
router.post("/update", upload.single("profileImage"), async (req, res) => {
  const { userId, field, value } = req.body;
  const file = req.file;

  if (!userId || !field) {
    return res.status(400).json({ error: "Missing userId or field" });
  }

  try {
    let data = {};

    // ✅ USERNAME CHECK
    if (field === "username") {
      const existing = await prisma.user.findFirst({
        where: {
          username: value,
          NOT: { id: parseInt(userId) },
        },
      });

      if (existing) {
        return res.status(400).json({ error: "Username already taken" });
      }

      data.username = value;
    }

    // ✅ EMAIL UPDATE
    if (field === "email") {
      data.email = value;
    }

    // ✅ IMAGE UPDATE
    if (field === "profileImage" && file) {
      // Delete old image
      const user = await prisma.user.findUnique({ where: { id: parseInt(userId) } });
      if (user && user.profileImage) {
        const oldImagePath = `.${user.profileImage}`;
        if (fs.existsSync(oldImagePath)) fs.unlinkSync(oldImagePath);
      }

      data.profileImage = `/uploads/profileImages/${file.filename}`;
    }

    const updatedUser = await prisma.user.update({
      where: { id: parseInt(userId) },
      data,
    });

    // Return full image URL
    if (updatedUser.profileImage) {
      updatedUser.profileImage = `${req.protocol}://${req.get("host")}${updatedUser.profileImage}`;
    }

    res.json({ message: "User updated", user: updatedUser });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Update failed" });
  }
});

// ================= UPDATE PASSWORD =================
import bcrypt from "bcryptjs";

router.post("/update-password", async (req, res) => {
  const { userId, currentPassword, newPassword } = req.body;

  if (!userId || !currentPassword || !newPassword) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // ✅ Compare hashed password
    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      return res.status(400).json({ error: "Current password is incorrect" });
    }

    // ✅ Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: parseInt(userId) },
      data: { password: hashedNewPassword },
    });

    res.json({ message: "Password updated successfully" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Password update failed" });
  }
});

// ================= DELETE ACCOUNT =================
router.delete("/delete-account", async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "User ID is required" });
  }

  try {
    const id = parseInt(userId);

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // 🗑 Delete profile image
    if (user.profileImage) {
      const imagePath = `.${user.profileImage}`;
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    // ✅ Delete related records FIRST (VERY IMPORTANT)
    await prisma.customer.deleteMany({ where: { userId: id } });
    await prisma.shopkeeper.deleteMany({ where: { userId: id } });
    await prisma.rider.deleteMany({ where: { userId: id } });

    // ✅ Finally delete user
    await prisma.user.delete({
      where: { id },
    });

    res.json({ message: "Account deleted successfully" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete account" });
  }
});

export default router;




