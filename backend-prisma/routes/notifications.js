import express from "express";
import { PrismaClient } from "@prisma/client";
import { verifyToken } from "../middlewares/authMiddleware.js";

const router = express.Router();
const prisma = new PrismaClient();

router.get("/", verifyToken, async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: {
        userId: Number(req.user.id),
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.json(notifications);
  } catch (err) {
    console.log("NOTIFICATION FETCH ERROR");
    console.log(err);
    console.log(err.stack);

    return res.status(500).json({
      message: err.message,
    });
  }
});

router.patch("/read-all", verifyToken, async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: {
        userId: Number(req.user.id),
      },
      data: {
        isRead: true,
      },
    });

    return res.json({ success: true });
  } catch (err) {
    console.log("NOTIFICATION READ ERROR");
    console.log(err);
    console.log(err.stack);

    return res.status(500).json({
      message: err.message,
    });
  }
});

export default router;