import express from "express";
import { PrismaClient } from "@prisma/client";
import { verifyToken } from "../middlewares/authMiddleware.js";

const prisma = new PrismaClient();
const router = express.Router();

router.use(verifyToken);

router.post("/add-product", async (req, res) => {
  try {
    const { name, price, quantity, threshold, brand, specification } = req.body;

    if (!name || price == null || quantity == null) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const parsedPrice = Number(price);
    const parsedQuantity = Number(quantity);
    const parsedThreshold =
      threshold == null || threshold === "" ? null : Number(threshold);

    if (!Number.isFinite(parsedPrice) || !Number.isFinite(parsedQuantity)) {
      return res
        .status(400)
        .json({ message: "Price and quantity must be valid numbers" });
    }

    const shopkeeper = await prisma.shopkeeper.findUnique({
      where: { userId: Number(req.user.id) },
    });

    if (!shopkeeper) {
      return res.status(404).json({ message: "Shopkeeper not found" });
    }

    const product = await prisma.product.create({
      data: {
        name: name.trim(),
        brand: brand?.trim() || null,
        specification: specification?.trim() || null,
        price: parsedPrice,
        quantity: parsedQuantity,
        threshold: Number.isFinite(parsedThreshold) ? parsedThreshold : null,
        shopkeeperId: shopkeeper.id,
      },
    });

    return res.status(201).json(product);
  } catch (error) {
    console.error("add-product error:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

router.get("/products", async (req, res) => {
  try {
    const shopkeeper = await prisma.shopkeeper.findUnique({
      where: { userId: Number(req.user.id) },
    });

    if (!shopkeeper) {
      return res.status(404).json({ message: "Shopkeeper not found" });
    }

    const products = await prisma.product.findMany({
      where: { shopkeeperId: shopkeeper.id },
      orderBy: { createdAt: "desc" },
    });

    return res.json(products);
  } catch (error) {
    console.error("products error:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

router.get("/orders", async (req, res) => {
  try {
    const shopkeeper = await prisma.shopkeeper.findUnique({
      where: { userId: Number(req.user.id) },
    });

    if (!shopkeeper) {
      return res.status(404).json({ message: "Shopkeeper not found" });
    }

    const orders = await prisma.shopkeeperOrderNotification.findMany({
      where: { shopkeeperId: shopkeeper.id },
      include: { product: true },
      orderBy: { createdAt: "desc" },
    });

    return res.json(orders);
  } catch (error) {
    console.error("orders error:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

// ================= NEW: GET ORDER NOTIFICATION COUNT =================
router.get("/order-notification-count", async (req, res) => {
  try {
    const shopkeeper = await prisma.shopkeeper.findUnique({
      where: { userId: Number(req.user.id) },
    });

    if (!shopkeeper) {
      return res.status(404).json({ message: "Shopkeeper not found" });
    }

    // Counts how many order notifications are still pending response
    const count = await prisma.shopkeeperOrderNotification.count({
      where: {
        shopkeeperId: shopkeeper.id,
        status: "PENDING",
      },
    });

    return res.json({ count });
  } catch (error) {
    console.error("order-notification-count error:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

// ================= NEW: MARK ORDER NOTIFICATIONS AS READ =================
router.patch("/order-notifications/read-all", async (req, res) => {
  try {
    const shopkeeper = await prisma.shopkeeper.findUnique({
      where: { userId: Number(req.user.id) },
    });

    if (!shopkeeper) {
      return res.status(404).json({ message: "Shopkeeper not found" });
    }

    await prisma.shopkeeperOrderNotification.updateMany({
      where: {
        shopkeeperId: shopkeeper.id,
        status: "PENDING",
      },
      data: { status: "PENDING" }, // Keeps status intact if only viewing the page
    });

    return res.json({ message: "Orders badge synchronized successfully" });
  } catch (error) {
    console.error("order-notifications/read-all error:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

router.get("/notifications", async (req, res) => {
  try {
    const shopkeeper = await prisma.shopkeeper.findUnique({
      where: { userId: Number(req.user.id) },
    });

    if (!shopkeeper) {
      return res.status(404).json({ message: "Shopkeeper not found" });
    }

    const stockNotifications =
      await prisma.shopkeeperStockNotification.findMany({
        where: { shopkeeperId: shopkeeper.id },
        orderBy: { createdAt: "desc" },
      });

    const accountNotifications = await prisma.notification.findMany({
      where: { userId: Number(req.user.id) },
      orderBy: { createdAt: "desc" },
    });

    const notifications = [
      ...stockNotifications.map((item) => ({
        ...item,
        type: item.type || "STOCK_ALERT",
        source: "stock",
      })),
      ...accountNotifications.map((item) => ({
        ...item,
        source: "account",
        shopkeeperId: shopkeeper.id,
        isSuspended: shopkeeper.isSuspended,
        suspensionReason: shopkeeper.suspensionReason,
        revertRequestedAt: shopkeeper.revertRequestedAt,
      })),
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return res.json(notifications);
  } catch (error) {
    console.error("notifications error:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

router.get("/reports", async (req, res) => {
  try {
    const shopkeeper = await prisma.shopkeeper.findUnique({
      where: { userId: Number(req.user.id) },
    });

    if (!shopkeeper) {
      return res.status(404).json({ message: "Shopkeeper not found" });
    }

    const reports = await prisma.shopReport.findMany({
      where: { shopkeeperId: shopkeeper.id },
      select: {
        id: true,
        title: true,
        reason: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json(reports);
  } catch (error) {
    console.error("reports error:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

router.patch("/notifications/read-all", async (req, res) => {
  try {
    const shopkeeper = await prisma.shopkeeper.findUnique({
      where: { userId: Number(req.user.id) },
    });

    if (!shopkeeper) {
      return res.status(404).json({ message: "Shopkeeper not found" });
    }

    await prisma.shopkeeperStockNotification.updateMany({
      where: { shopkeeperId: shopkeeper.id, isRead: false },
      data: { isRead: true },
    });

    await prisma.notification.updateMany({
      where: { userId: Number(req.user.id), isRead: false },
      data: { isRead: true },
    });

    return res.json({ message: "Notifications marked as read" });
  } catch (error) {
    console.error("read notifications error:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

router.post("/revert-request", async (req, res) => {
  try {
    const shopkeeper = await prisma.shopkeeper.findUnique({
      where: { userId: Number(req.user.id) },
      include: { user: true },
    });

    if (!shopkeeper) {
      return res.status(404).json({ message: "Shopkeeper not found" });
    }

    if (!shopkeeper.isSuspended) {
      return res.status(400).json({ message: "Shop is not suspended" });
    }

    if (shopkeeper.revertRequestedAt) {
      return res.status(400).json({ message: "Request already sent" });
    }

    const { revertMessage } = req.body;

    if (!revertMessage?.trim()) {
      return res.status(400).json({
        message: "Please explain what was corrected",
      });
    }

    await prisma.shopkeeper.update({
      where: { id: shopkeeper.id },
      data: {
        revertRequestedAt: new Date(),
        revertMessage: revertMessage.trim(),
      },
    });

    const latestSuspension = await prisma.notification.findFirst({
      where: {
        userId: shopkeeper.userId,
        type: "SHOP_SUSPENDED",
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (latestSuspension) {
      const parsed = JSON.parse(latestSuspension.message);

      await prisma.notification.update({
        where: {
          id: latestSuspension.id,
        },
        data: {
          message: JSON.stringify({
            ...parsed,
            status: "PENDING",
          }),
        },
      });
    }

    const admins = await prisma.user.findMany({
      where: { role: "admin" },
    });

    await prisma.notification.createMany({
      data: admins.map((admin) => ({
        userId: admin.id,
        senderId: shopkeeper.userId,
        senderName: shopkeeper.shopName,
        relatedShopkeeperId: shopkeeper.id,
        type: "SHOP_REVERT_REQUEST",
        title: "Revert Request",
        message: `${shopkeeper.shopName} requested restoration.\nReason:\n${revertMessage}`,
      })),
    });

    return res.json({ message: "Request sent" });
  } catch (err) {
    console.error("revert request error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

router.patch("/orders/:id/respond", async (req, res) => {
  try {
    const { action } = req.body;
    if (!["approve", "reject"].includes(action)) {
      return res
        .status(400)
        .json({ message: "Action must be approve or reject" });
    }

    const shopkeeper = await prisma.shopkeeper.findUnique({
      where: { userId: Number(req.user.id) },
    });

    if (!shopkeeper) {
      return res.status(404).json({ message: "Shopkeeper not found" });
    }

    const order = await prisma.shopkeeperOrderNotification.findFirst({
      where: {
        id: Number(req.params.id),
        shopkeeperId: shopkeeper.id,
      },
    });

    if (!order) {
      return res.status(404).json({ message: "Order notification not found" });
    }

    if (order.status !== "PENDING") {
      return res
        .status(400)
        .json({ message: "This order has already been handled" });
    }

    if (action === "reject") {
      const rejected = await prisma.shopkeeperOrderNotification.update({
        where: { id: order.id },
        data: { status: "REJECTED", respondedAt: new Date() },
        include: { product: true },
      });

      return res.json(rejected);
    }

    const product = order.productId
      ? await prisma.product.findFirst({
          where: {
            id: order.productId,
            shopkeeperId: shopkeeper.id,
          },
        })
      : await prisma.product.findFirst({
          where: {
            shopkeeperId: shopkeeper.id,
            name: order.productName,
          },
          orderBy: { createdAt: "desc" },
        });

    if (!product) {
      return res
        .status(404)
        .json({ message: "Matching product not found in inventory" });
    }

    const newQuantity = Math.max(
      0,
      Number(product.quantity) - Number(order.quantity || 1),
    );

    const result = await prisma.$transaction(async (tx) => {
      const updatedProduct = await tx.product.update({
        where: { id: product.id },
        data: { quantity: newQuantity },
      });

      const approvedOrder = await tx.shopkeeperOrderNotification.update({
        where: { id: order.id },
        data: {
          productId: product.id,
          status: "APPROVED",
          respondedAt: new Date(),
        },
        include: { product: true },
      });

      if (
        updatedProduct.threshold != null &&
        updatedProduct.quantity <= updatedProduct.threshold
      ) {
        await tx.shopkeeperStockNotification.create({
          data: {
            shopkeeperId: shopkeeper.id,
            productId: updatedProduct.id,
            productName: updatedProduct.name,
            quantity: updatedProduct.quantity,
            threshold: updatedProduct.threshold,
            message: `${updatedProduct.name} threshold reached. ${updatedProduct.quantity} units left.`,
          },
        });
      }

      return { ...approvedOrder, product: updatedProduct };
    });

    return res.json(result);
  } catch (error) {
    console.error("respond order error:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

router.patch("/update-stock/:id", async (req, res) => {
  try {
    const { price, quantity, threshold, brand, specification } = req.body;

    const shopkeeper = await prisma.shopkeeper.findUnique({
      where: { userId: Number(req.user.id) },
    });

    if (!shopkeeper) {
      return res.status(404).json({ message: "Shopkeeper not found" });
    }

    const product = await prisma.product.findFirst({
      where: {
        id: Number(req.params.id),
        shopkeeperId: shopkeeper.id,
      },
    });

    if (!product) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const updated = await prisma.product.update({
      where: { id: product.id },
      data: {
        price: price !== undefined ? Number(price) : product.price,
        quantity: quantity !== undefined ? Number(quantity) : product.quantity,
        threshold:
          threshold !== undefined
            ? threshold === null || threshold === ""
              ? null
              : Number(threshold)
            : product.threshold,
        brand: brand !== undefined ? brand?.trim() || null : product.brand,
        specification:
          specification !== undefined
            ? specification?.trim() || null
            : product.specification,
      },
    });

    return res.json(updated);
  } catch (error) {
    console.error("update-stock error:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

router.delete("/delete-product/:id", async (req, res) => {
  try {
    const shopkeeper = await prisma.shopkeeper.findUnique({
      where: { userId: Number(req.user.id) },
    });

    if (!shopkeeper) {
      return res.status(404).json({ message: "Shopkeeper not found" });
    }

    const product = await prisma.product.findFirst({
      where: {
        id: Number(req.params.id),
        shopkeeperId: shopkeeper.id,
      },
    });

    if (!product) {
      return res.status(403).json({ message: "Not authorized" });
    }

    await prisma.product.delete({ where: { id: product.id } });
    return res.json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("delete-product error:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

router.patch("/set-threshold/:id", async (req, res) => {
  try {
    const { threshold } = req.body;

    const shopkeeper = await prisma.shopkeeper.findUnique({
      where: { userId: Number(req.user.id) },
    });

    if (!shopkeeper) {
      return res.status(404).json({ message: "Shopkeeper not found" });
    }

    const product = await prisma.product.findFirst({
      where: {
        id: Number(req.params.id),
        shopkeeperId: shopkeeper.id,
      },
    });

    if (!product) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const updated = await prisma.product.update({
      where: { id: product.id },
      data: {
        threshold:
          threshold === null || threshold === "" ? null : Number(threshold),
      },
    });

    return res.json(updated);
  } catch (error) {
    console.error("set-threshold error:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

export default router;
