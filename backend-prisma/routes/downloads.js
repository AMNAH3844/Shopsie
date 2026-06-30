import express from "express";
import { PrismaClient } from "@prisma/client";
import { verifyToken } from "../middlewares/authMiddleware.js";

const prisma = new PrismaClient();
const router = express.Router();

const cleanSpec = (value) => {
  const spec = value?.toString().trim();
  return spec ? spec : "None";
};

const createDownloadedItemPayload = (i) => ({
  name: i.name,
  quantity: i.quantity ? Number(i.quantity) : 1,
  specification: cleanSpec(i.specification),
  categoryName: i.categoryName || i.category || "Uncategorized",
  selectedShopId: i.selectedShopId ? Number(i.selectedShopId) : null,
  selectedShopName: i.selectedShopName || null,
  selectedShopPrice:
    i.selectedShopPrice != null ? Number(i.selectedShopPrice) : null,
  selectedShopLatitude:
    i.selectedShopLatitude != null ? Number(i.selectedShopLatitude) : null,
  selectedShopLongitude:
    i.selectedShopLongitude != null ? Number(i.selectedShopLongitude) : null,
  selectedShopPhone: i.selectedShopPhone || null,
  selectedShopTiming: i.selectedShopTiming || null,
  availableQuantity:
    i.availableQuantity != null ? Number(i.availableQuantity) : null,
  lineTotal: i.lineTotal != null ? Number(i.lineTotal) : null,
  buyingLocationLat:
    i.buyingLocationLat != null ? Number(i.buyingLocationLat) : null,
  buyingLocationLng:
    i.buyingLocationLng != null ? Number(i.buyingLocationLng) : null,
  buyingLocationLabel: i.buyingLocationLabel || null,
  deliveryLocationLat:
    i.deliveryLocationLat != null ? Number(i.deliveryLocationLat) : null,
  deliveryLocationLng:
    i.deliveryLocationLng != null ? Number(i.deliveryLocationLng) : null,
  deliveryLocationLabel: i.deliveryLocationLabel || null,
});

const normalizeDownloadedItem = (i) => ({
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

router.post("/", verifyToken, async (req, res) => {
  try {
    const userId = Number(req.user.id);
    const { list } = req.body;

    if (!list?.id || !Array.isArray(list.items)) {
      return res.status(400).json({ message: "Invalid list data" });
    }

    const existing = await prisma.downloadedList.findFirst({
      where: { userId, originalListId: Number(list.id) },
    });

    if (existing) {
      return res.status(400).json({ message: "Already downloaded" });
    }

    const sender = list.senderId
      ? await prisma.user.findUnique({ where: { id: Number(list.senderId) } })
      : null;

    const newList = await prisma.downloadedList.create({
      data: {
        name: list.name,
        userId,
        originalListId: Number(list.id),
        senderId: list.senderId ? Number(list.senderId) : null,
        receiverId: userId,
        receiverType: "customer",
        senderName: sender?.username || "Unknown",
        items: {
          create: list.items.map(createDownloadedItemPayload),
        },
      },
      include: { items: true },
    });

    return res.json({
      ...newList,
      items: newList.items.map(normalizeDownloadedItem),
    });
  } catch (error) {
    console.log("DOWNLOAD ERROR:", error);
    return res.status(500).json({ error: "Something went wrong" });
  }
});

router.get("/", verifyToken, async (req, res) => {
  try {
    const userId = Number(req.user.id);

    const lists = await prisma.downloadedList.findMany({
      where: { userId },
      include: { items: true },
      orderBy: { createdAt: "desc" },
    });

    return res.json(
      lists.map((list) => ({
        ...list,
        items: list.items.map(normalizeDownloadedItem),
      })),
    );
  } catch (error) {
    console.log("FETCH ERROR:", error);
    return res.status(500).json({ error: "Failed to fetch lists" });
  }
});

router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const userId = Number(req.user.id);

    await prisma.downloadedList.deleteMany({
      where: { id, userId },
    });

    return res.json({ success: true });
  } catch (e) {
    console.log("DELETE DOWNLOAD ERROR:", e);
    return res.status(500).json({ error: e.message });
  }
});

export default router;
