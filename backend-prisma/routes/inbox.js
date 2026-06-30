import express from "express";
import { PrismaClient } from "@prisma/client";
import { verifyToken } from "../middlewares/authMiddleware.js";

const prisma = new PrismaClient();
const router = express.Router();

const cleanSpec = (value) => {
  const spec = value?.toString().trim();
  return spec ? spec : "None";
};

const cleanCategory = (item) =>
  item.categoryName || item.category || "Uncategorized";

const createSharedItemPayload = (i) => ({
  name: i.name,
  quantity: i.quantity ? Number(i.quantity) : 1,
  specification: cleanSpec(i.specification),
  categoryName: cleanCategory(i),
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

const getListLocationPreview = (items = [], kind) => {
  const latKey =
    kind === "delivery" ? "deliveryLocationLat" : "buyingLocationLat";
  const lngKey =
    kind === "delivery" ? "deliveryLocationLng" : "buyingLocationLng";
  const labelKey =
    kind === "delivery" ? "deliveryLocationLabel" : "buyingLocationLabel";
  const item = items.find((i) => i[latKey] && i[lngKey]);
  if (!item) return {};
  return {
    [`${kind}LocationLat`]: item[latKey],
    [`${kind}LocationLng`]: item[lngKey],
    [`${kind}LocationLabel`]: item[labelKey],
  };
};

router.get("/", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const lists = await prisma.sharedList.findMany({
      where: { OR: [{ senderId: userId }, { receiverId: userId }] },
      include: {
        sender: true,
        receiver: true,
        items: true,
        messages: { orderBy: { createdAt: "asc" } },
      },
    });

    const chatMap = {};

    for (let list of lists) {
      const isSender = list.senderId === userId;
      const otherUser = isSender ? list.receiver : list.sender;
      const otherUserId = otherUser.id;
      const buyingPreview = getListLocationPreview(list.items, "buying");
      const deliveryPreview = getListLocationPreview(list.items, "delivery");

      if (!chatMap[otherUserId]) {
        chatMap[otherUserId] = {
          id: otherUserId,
          userId: otherUserId,
          name: otherUser.username,
          profileImage: otherUser.profileImage
            ? `${req.protocol}://${req.get("host")}${otherUser.profileImage}`
            : null,
          lastMsg: "",
          lastMsgFrom: null,
          time: list.createdAt,
          unreadCount: 0,
          ...buyingPreview,
          ...deliveryPreview,
        };
      }

      let latestTime = list.createdAt;
      const lastMessage = list.messages.length
        ? list.messages[list.messages.length - 1]
        : null;

      const latestMsg = lastMessage
        ? lastMessage.text
        : isSender
          ? `You shared: ${list.name}`
          : `Shared a list: ${list.name}`;

      const lastMsgFrom = lastMessage
        ? lastMessage.senderId === userId
          ? "ME"
          : "THEM"
        : isSender
          ? "ME"
          : "THEM";

      if (lastMessage) latestTime = lastMessage.createdAt;

      const unreadMessages = list.messages.filter(
        (msg) => msg.senderId !== userId && msg.status === "SENT",
      );

      chatMap[otherUserId].unreadCount += unreadMessages.length;

      if (new Date(latestTime) > new Date(chatMap[otherUserId].time)) {
        chatMap[otherUserId].time = latestTime;
        chatMap[otherUserId].lastMsg = latestMsg;
        chatMap[otherUserId].lastMsgFrom = lastMsgFrom;
        chatMap[otherUserId].buyingLocationLat =
          buyingPreview.buyingLocationLat || null;
        chatMap[otherUserId].buyingLocationLng =
          buyingPreview.buyingLocationLng || null;
        chatMap[otherUserId].buyingLocationLabel =
          buyingPreview.buyingLocationLabel || null;
        chatMap[otherUserId].deliveryLocationLat =
          deliveryPreview.deliveryLocationLat || null;
        chatMap[otherUserId].deliveryLocationLng =
          deliveryPreview.deliveryLocationLng || null;
        chatMap[otherUserId].deliveryLocationLabel =
          deliveryPreview.deliveryLocationLabel || null;
      }
    }

    res.json(Object.values(chatMap));
  } catch (error) {
    console.error("INBOX ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/share", verifyToken, async (req, res) => {
  try {
    const senderId = req.user.id;
    const { receiverId, listName, items } = req.body;

    if (!receiverId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Invalid data" });
    }

    // Get sender username
    const sender = await prisma.user.findUnique({
      where: { id: senderId },
      select: {
        id: true,
        username: true,
      },
    });

    const newSharedList = await prisma.sharedList.create({
      data: {
        name: listName || "Shared List",
        senderId,
        receiverId: Number(receiverId),
        items: {
          create: items.map(createSharedItemPayload),
        },
      },
      include: { items: true },
    });

    await prisma.message.create({
      data: {
        listId: newSharedList.id,
        senderId,
        text: `Shared a list: ${listName || "Shared List"}`,
        status: "SENT",
      },
    });

    // Notification
    await prisma.notification.create({
      data: {
        userId: Number(receiverId),
        senderId: sender.id,
        senderName: sender.username,
        type: "LIST_SHARED",
        title: "List Shared",
        message: `${sender.username} shared a shopping list with you`,
      },
    });

    res.json(newSharedList);
  } catch (e) {
    console.error("SHARE LIST ERROR:", e);
    res.status(500).json({ error: e.message });
  }
});

export default router;
