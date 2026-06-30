import express from "express";
import { PrismaClient } from "@prisma/client";
import { verifyToken } from "../middlewares/authMiddleware.js";

const prisma = new PrismaClient();
const router = express.Router();

const normalizeSharedItem = (i) => ({
  ...i,
  quantity: i.quantity || 1,
  specification: i.specification || "None",
  categoryName: i.categoryName || "Uncategorized",
  selectedShopId: i.selectedShopId || null,
  selectedShopName: i.selectedShopName || null,
  selectedShopPrice: i.selectedShopPrice || null,
  selectedShopLatitude: i.selectedShopLatitude || null,
  selectedShopLongitude: i.selectedShopLongitude || null,
  selectedShopPhone: i.selectedShopPhone || null,
  selectedShopTiming: i.selectedShopTiming || null,
  availableQuantity: i.availableQuantity || null,
  lineTotal: i.lineTotal || null,
  buyingLocationLat: i.buyingLocationLat || null,
  buyingLocationLng: i.buyingLocationLng || null,
  buyingLocationLabel: i.buyingLocationLabel || null,
  deliveryLocationLat: i.deliveryLocationLat || null,
  deliveryLocationLng: i.deliveryLocationLng || null,
  deliveryLocationLabel: i.deliveryLocationLabel || null,
  customerOptimizerStopOrder: i.customerOptimizerStopOrder || null,
  customerOptimizerDone: Boolean(i.customerOptimizerDone),
  customerOptimizerDoneAt: i.customerOptimizerDoneAt || null,
});

router.get("/conversation/:userId", verifyToken, async (req, res) => {
  try {
    const myId = req.user.id;
    const otherId = Number(req.params.userId);

    const lists = await prisma.sharedList.findMany({
      where: {
        OR: [
          { senderId: myId, receiverId: otherId },
          { senderId: otherId, receiverId: myId },
        ],
      },
      include: {
        items: true,
        messages: { orderBy: { createdAt: "asc" } },
      },
      orderBy: { createdAt: "asc" },
    });

    let timeline = [];

    for (let list of lists) {
      timeline.push({
        id: `list-${list.id}`,
        type: "LIST",
        createdAt: list.createdAt,
        senderId: list.senderId,
        listData: {
          ...list,
          items: list.items.map(normalizeSharedItem),
        },
      });

      for (let msg of list.messages) {
        timeline.push({
          id: msg.id,
          type: "TEXT",
          createdAt: msg.createdAt,
          senderId: msg.senderId,
          text: msg.text,
        });
      }
    }

    timeline.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    res.json(timeline);
  } catch (e) {
    console.log("CHAT FETCH ERROR:", e);
    res.status(500).json({ error: e.message });
  }
});

router.post("/send", verifyToken, async (req, res) => {
  try {
    const { listId, text } = req.body;
    const senderId = req.user.id;

    const newMsg = await prisma.message.create({
      data: {
        listId: Number(listId),
        senderId,
        text,
        status: "SENT",
      },
    });

    // Find the shared list
    const sharedList = await prisma.sharedList.findUnique({
      where: { id: Number(listId) },
    });

    if (sharedList) {
      const receiverId =
        sharedList.senderId === senderId
          ? sharedList.receiverId
          : sharedList.senderId;

      // Get sender details
      const sender = await prisma.user.findUnique({
        where: { id: senderId },
        select: {
          id: true,
          username: true,
        },
      });

      await prisma.notification.create({
        data: {
          userId: receiverId,
          type: "MESSAGE",
          title: "New Message",
          message: `${sender.username}: ${text}`,
        },
      });
    }

    res.json(newMsg);
  } catch (e) {
    console.log("SEND MESSAGE ERROR:", e);
    res.status(500).json({ error: e.message });
  }
});

router.delete("/delete/:id", verifyToken, async (req, res) => {
  try {
    const msgId = Number(req.params.id);
    const userId = req.user.id;

    const msg = await prisma.message.findUnique({ where: { id: msgId } });
    if (!msg) return res.status(404).json({ error: "Message not found" });
    if (msg.senderId !== userId) {
      return res
        .status(403)
        .json({ error: "You can only delete your own message" });
    }

    await prisma.message.delete({ where: { id: msgId } });
    res.json({ success: true });
  } catch (e) {
    console.log("DELETE ERROR:", e);
    res.status(500).json({ error: e.message });
  }
});

export default router;
