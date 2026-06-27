import express from "express";
import { PrismaClient } from "@prisma/client";
import { verifyToken as authMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();
const prisma = new PrismaClient();

const cleanSpec = (value) => {
  const spec = value?.toString().trim();
  return spec ? spec : "None";
};

const createDownloadedItemPayload = (item) => ({
  name: item.name,
  quantity: item.quantity ? Number(item.quantity) : 1,
  specification: cleanSpec(item.specification),
  categoryName: item.categoryName || item.category || "Uncategorized",
  selectedShopId: item.selectedShopId ? Number(item.selectedShopId) : null,
  selectedShopName: item.selectedShopName || null,
  selectedShopPrice: item.selectedShopPrice != null ? Number(item.selectedShopPrice) : null,
  selectedShopLatitude: item.selectedShopLatitude != null ? Number(item.selectedShopLatitude) : null,
  selectedShopLongitude: item.selectedShopLongitude != null ? Number(item.selectedShopLongitude) : null,
  selectedShopPhone: item.selectedShopPhone || null,
  selectedShopTiming: item.selectedShopTiming || null,
  availableQuantity: item.availableQuantity != null ? Number(item.availableQuantity) : null,
  lineTotal: item.lineTotal != null ? Number(item.lineTotal) : null,
  buyingLocationLat: item.buyingLocationLat != null ? Number(item.buyingLocationLat) : null,
  buyingLocationLng: item.buyingLocationLng != null ? Number(item.buyingLocationLng) : null,
  buyingLocationLabel: item.buyingLocationLabel || null,
  deliveryLocationLat: item.deliveryLocationLat != null ? Number(item.deliveryLocationLat) : null,
  deliveryLocationLng: item.deliveryLocationLng != null ? Number(item.deliveryLocationLng) : null,
  deliveryLocationLabel: item.deliveryLocationLabel || null,
});

router.post("/share-list", authMiddleware, async (req, res) => {
  try {
    const { listId, receiverId, receiverType, listName, items } = req.body;
    const senderId = req.user.id;

    if (!receiverId) {
      return res.status(400).json({ message: "Missing receiverId" });
    }

    let finalName = listName || "Shared List";
    let finalItems = Array.isArray(items) ? items : [];
    let originalListId = listId ? Number(listId) : null;

    if (finalItems.length === 0 && listId) {
      const list = await prisma.list.findUnique({
        where: { id: Number(listId) },
        include: { items: true },
      });

      if (!list) return res.status(404).json({ message: "List not found" });

      finalName = list.name;
      finalItems = list.items;
      originalListId = list.id;
    }

    if (finalItems.length === 0) {
      return res.status(400).json({ message: "No items to share" });
    }

    const sender = await prisma.user.findUnique({ where: { id: senderId } });

    const sharedList = await prisma.downloadedList.create({
      data: {
        name: finalName,
        userId: Number(receiverId),
        originalListId,
        senderId,
        receiverId: Number(receiverId),
        receiverType: receiverType || "customer",
        senderName: sender?.username || "Shared User",
        items: {
          create: finalItems.map(createDownloadedItemPayload),
        },
      },
      include: { items: true },
    });

    return res.json({ success: true, sharedList });
  } catch (error) {
    console.log("SHARE ERROR:", error);
    return res.status(500).json({ message: "Share failed" });
  }
});

export default router;
