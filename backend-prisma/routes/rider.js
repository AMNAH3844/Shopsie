import express from "express";
import { PrismaClient } from "@prisma/client";
import { verifyToken } from "../middlewares/authMiddleware.js";

const router = express.Router();
const prisma = new PrismaClient();

const DEFAULT_PAYMENT_PROVIDERS = [
  { name: "Easypaisa", type: "wallet" },
  { name: "JazzCash", type: "wallet" },
  { name: "HBL", type: "bank" },
  { name: "HabibMetro Bank", type: "bank" },
  { name: "Islamic Bank", type: "bank" },
  { name: "Meezan Bank", type: "bank" },
  { name: "UBL", type: "bank" },
  { name: "MCB Bank", type: "bank" },
  { name: "Allied Bank", type: "bank" },
  { name: "Bank Alfalah", type: "bank" },
  { name: "Faysal Bank", type: "bank" },
  { name: "Standard Chartered", type: "bank" },
  { name: "Visa Card", type: "card" },
  { name: "Mastercard", type: "card" },
];

const ensurePaymentProviders = async () => {
  await Promise.all(
    DEFAULT_PAYMENT_PROVIDERS.map((provider) =>
      prisma.paymentProvider.upsert({
        where: { name: provider.name },
        update: { type: provider.type },
        create: provider,
      })
    )
  );
};

const formatRiderPaymentInfo = (rider) => {
  const provider = rider.paymentProviderName?.trim();
  const account = rider.paymentAccountNumber?.trim();
  const method = rider.paymentMethodType?.trim();

  if (!provider || !account) {
    return "Rider online payment info is not provided yet.";
  }

  const accountLabel = method === "wallet" ? "Number" : method === "bank" ? "Account No" : "Card/Account No";
  return `Rider online payment info: ${provider} | ${accountLabel}: ${account}`;
};

/* ===================== HELPERS ===================== */
const distanceKm = (lat1, lng1, lat2, lng2) => {
  const toRad = (value) => (Number(value) * Math.PI) / 180;
  const earthRadiusKm = 6371;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};
const getMyRider = async (userId) => {
  return prisma.rider.findUnique({
    where: { userId: Number(userId) },
  });
};

const getRiderRequestById = async (requestId) => {
  return prisma.riderRequest.findUnique({
    where: { id: Number(requestId) },
    include: {
      customer: true,
      rider: true,
      items: true,
      messages: {
        include: { sender: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
};

const canAccessRequest = async (request, currentUserId) => {
  const rider = await getMyRider(currentUserId);

  const isCustomer = request.customerId === Number(currentUserId);
  const isRider = rider && request.riderId === rider.id;

  if (!isCustomer && !isRider) {
    return { ok: false, status: 403, message: "Forbidden" };
  }

  if (isCustomer && request.customerArchivedAt) {
    return { ok: false, status: 404, message: "Not found" };
  }

  if (isRider && request.riderArchivedAt) {
    return { ok: false, status: 404, message: "Not found" };
  }

  return { ok: true, rider, isCustomer, isRider };
};

/* ===================== ACCOUNT DETAILS ===================== */

router.get("/payment-providers", verifyToken, async (req, res) => {
  try {
    await ensurePaymentProviders();

    const search = String(req.query.search || "").trim();
    const type = String(req.query.type || "").trim();

    const providers = await prisma.paymentProvider.findMany({
      where: {
        ...(type ? { type } : {}),
        ...(search ? { name: { contains: search } } : {}),
      },
      orderBy: { name: "asc" },
    });

    res.json(providers);
  } catch (err) {
    console.log("Payment providers error:", err);
    res.status(500).json({ message: "Failed to load payment providers" });
  }
});

router.get("/me/account-details", verifyToken, async (req, res) => {
  try {
    const rider = await getMyRider(req.user.id);
    if (!rider) return res.status(404).json({ message: "Rider not found" });

    res.json({
      dailyCashLimit: rider.dailyCashLimit,
      paymentMethodType: rider.paymentMethodType || "",
      paymentProviderName: rider.paymentProviderName || "",
      paymentAccountNumber: rider.paymentAccountNumber || "",
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to load account details" });
  }
});

router.put("/me/account-details", verifyToken, async (req, res) => {
  try {
    const { dailyCashLimit, paymentMethodType, paymentProviderName, paymentAccountNumber } = req.body;
    const rider = await getMyRider(req.user.id);
    if (!rider) return res.status(404).json({ message: "Rider not found" });

    const parsedLimit =
      dailyCashLimit === null || dailyCashLimit === undefined || dailyCashLimit === ""
        ? null
        : Number(dailyCashLimit);

    if (parsedLimit !== null && (!Number.isFinite(parsedLimit) || parsedLimit < 0)) {
      return res.status(400).json({ message: "Daily cash limit must be digits only" });
    }

    if (paymentAccountNumber && !/^\d+$/.test(String(paymentAccountNumber))) {
      return res.status(400).json({ message: "Payment number/account must contain digits only" });
    }

    const updated = await prisma.rider.update({
      where: { id: rider.id },
      data: {
        dailyCashLimit: parsedLimit,
        paymentMethodType: paymentMethodType?.trim() || null,
        paymentProviderName: paymentProviderName?.trim() || null,
        paymentAccountNumber: paymentAccountNumber?.trim() || null,
      },
    });

    res.json({
      dailyCashLimit: updated.dailyCashLimit,
      paymentMethodType: updated.paymentMethodType || "",
      paymentProviderName: updated.paymentProviderName || "",
      paymentAccountNumber: updated.paymentAccountNumber || "",
    });
  } catch (err) {
    console.log("Save rider account details error:", err);
    res.status(500).json({ message: "Failed to save account details" });
  }
});

/* ===================== LOCATION ===================== */

router.get("/me/location", verifyToken, async (req, res) => {
  try {
    const rider = await getMyRider(req.user.id);
    if (!rider) return res.status(404).json({ message: "Rider not found" });

    res.json(rider);
  } catch (err) {
    res.status(500).json({ message: "Failed to load location" });
  }
});

router.post("/me/location", verifyToken, async (req, res) => {
  try {
    const { lat, lng, label, isLocationOn } = req.body;

    const rider = await getMyRider(req.user.id);
    if (!rider) return res.status(404).json({ message: "Rider not found" });

    const updated = await prisma.rider.update({
      where: { id: rider.id },
      data: {
        currentLat: Number(lat),
        currentLng: Number(lng),
        locationLabel: label || "",
        isLocationOn: !!isLocationOn,
        locationUpdatedAt: new Date(),
      },
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: "Location update failed" });
  }
});

/* ===================== REQUESTS (PENDING) ===================== */

router.get("/requests", verifyToken, async (req, res) => {
  try {
    const rider = await getMyRider(req.user.id);
    if (!rider) return res.status(404).json({ message: "Rider not found" });

    const requests = await prisma.riderRequest.findMany({
      where: {
        riderId: rider.id,
        riderArchivedAt: null,
        status: "PENDING",
      },
      include: {
        customer: true,
        items: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: "Failed to load requests" });
  }
});


/* ===================== DELETE EXPIRED REQUEST (SOFT OR HARD) ===================== */

router.delete("/requests/:id/expired", verifyToken, async (req, res) => {
  try {
    const requestId = Number(req.params.id);

    const request = await prisma.riderRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    // Only allow deletion if the customer has cancelled/archived it
    if (!request.customerArchivedAt) {
      return res.status(400).json({
        message: "Only expired or customer-cancelled requests can be deleted",
      });
    }

    // Safely remove related records sequentially to bypass foreign key constraint failures
    await prisma.$transaction([
      prisma.riderMessage.deleteMany({ where: { requestId } }),
      prisma.riderRequestItem.deleteMany({ where: { requestId } }), // Adjust table name if different in your schema
      prisma.riderRequest.delete({ where: { id: requestId } }),
    ]);

    return res.json({
      success: true,
      message: "Expired request completely removed",
    });
  } catch (error) {
    console.error("Delete expired request error:", error);
    return res.status(500).json({ message: "Failed to delete request" });
  }
});

/* ===================== CUSTOMER REQUESTS (INBOX) ===================== */

router.get("/customer-requests", verifyToken, async (req, res) => {
  try {
    const requests = await prisma.riderRequest.findMany({
      where: {
        customerId: Number(req.user.id),
        customerArchivedAt: null,
      },
      include: {
        rider: { include: { user: true } },
        customer: true,
        items: true,
        messages: {
          include: { sender: true },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    res.json(requests);
  } catch (err) {
    console.log("Customer rider requests error:", err);
    res.status(500).json({ message: "Failed to load rider requests" });
  }
});

/* ===================== REQUEST DETAIL ===================== */

router.get("/requests/:id", verifyToken, async (req, res) => {
  try {
    const request = await getRiderRequestById(req.params.id);

    if (!request) return res.status(404).json({ message: "Not found" });

    const access = await canAccessRequest(request, req.user.id);
    if (!access.ok) {
      return res.status(access.status).json({ message: access.message });
    }

    res.json(request);
  } catch (err) {
    res.status(500).json({ message: "Failed to load request" });
  }
});

/* ===================== ACCEPT / REJECT ===================== */

router.post("/requests/:id/respond", verifyToken, async (req, res) => {
  try {
    const { action } = req.body;

    const rider = await getMyRider(req.user.id);
    if (!rider) return res.status(404).json({ message: "Rider not found" });

    const request = await prisma.riderRequest.findFirst({
      where: {
        id: Number(req.params.id),
        riderId: rider.id,
        status: "PENDING",
      },
    });

    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    if (request.customerArchivedAt) {
  return res.status(400).json({
    message: "This request has expired.",
  });
}

    const accepted = action === "accept";
    const updated = await prisma.riderRequest.update({
      where: { id: request.id },
      data: {
        status: accepted ? "ACCEPTED" : "REJECTED",
        riderDeliveredAt: null,
        customerConfirmedAt: null,
        completedAt: null,
        messages: {
          create: accepted
            ? [
                {
                  senderId: Number(req.user.id),
                  text: "Rider accepted request",
                },
                {
                  senderId: Number(req.user.id),
                  type: "PAYMENT_INFO",
                  text: formatRiderPaymentInfo(rider),
                },
              ]
            : {
                senderId: Number(req.user.id),
                text: "Rider rejected request",
              },
        },
      },
    });

const riderUser = await prisma.user.findUnique({
  where: { id: Number(req.user.id) },
  select: {
    id: true,
    username: true,
  },
});

await prisma.notification.create({
  data: {
    userId: request.customerId,
    senderId: riderUser.id,
    senderName: riderUser.username,
    type: accepted ? "RIDER_ACCEPTED" : "RIDER_REJECTED",
    title: accepted ? "Request Accepted" : "Request Rejected",
    message: accepted
      ? `${riderUser.username} accepted your shopping request`
      : `${riderUser.username} rejected your shopping request`,
  },
});

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: "Failed to respond" });
  }
});

/* ===================== ACTIVE DELIVERIES ===================== */

router.get("/active-deliveries", verifyToken, async (req, res) => {
  try {
    const rider = await getMyRider(req.user.id);
    if (!rider) return res.status(404).json({ message: "Rider not found" });

    const deliveries = await prisma.riderRequest.findMany({
      where: {
        riderId: rider.id,
        riderArchivedAt: null,
        status: { in: ["ACCEPTED", "DELIVERED"] },
        completedAt: null,
      },
      include: {
        customer: true,
        items: true,
      },
      orderBy: { updatedAt: "desc" },
    });

    res.json(deliveries);
  } catch (err) {
    res.status(500).json({ message: "Failed to load active deliveries" });
  }
});

/* ===================== HISTORY ===================== */

router.get("/history", verifyToken, async (req, res) => {
  try {
    const rider = await getMyRider(req.user.id);
    if (!rider) return res.status(404).json({ message: "Rider not found" });

    const history = await prisma.riderRequest.findMany({
      where: {
        riderId: rider.id,
        riderArchivedAt: null,
        status: "COMPLETED",
      },
      include: {
        customer: true,
        items: true,
      },
      orderBy: { completedAt: "desc" },
    });

    res.json(history);
  } catch (err) {
    console.log("Rider history error:", err);
    res.status(500).json({ message: "Failed to load history" });
  }
});

/* ===================== MARK DELIVERED ===================== */

router.post("/requests/:id/delivered", verifyToken, async (req, res) => {
  try {
    const rider = await getMyRider(req.user.id);
    if (!rider) return res.status(404).json({ message: "Rider not found" });

    const request = await prisma.riderRequest.findFirst({
      where: {
        id: Number(req.params.id),
        riderId: rider.id,
        status: "ACCEPTED",
      },
    });

    if (!request) {
      return res.status(404).json({ message: "Delivery not found" });
    }

    const updated = await prisma.riderRequest.update({
      where: { id: request.id },
      data: {
        status: "DELIVERED",
        riderDeliveredAt: new Date(),

        messages: {
          create: {
            senderId: Number(req.user.id),
            text:
              "🚚 Rider marked delivery completed. Waiting for customer confirmation.",
          },
        },
      },
    });

const riderUser = await prisma.user.findUnique({
  where: { id: Number(req.user.id) },
  select: {
    id: true,
    username: true,
  },
});

await prisma.notification.create({
  data: {
    userId: request.customerId,
    senderId: riderUser.id,
    senderName: riderUser.username,
    type: "DELIVERY_COMPLETED",
    title: "Delivery Completed",
    message: `${riderUser.username} marked your delivery as completed`,
  },
});

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: "Failed to mark delivered" });
  }
});

/* ===================== CUSTOMER CONFIRM DELIVERY ===================== */

router.post("/requests/:id/confirm", verifyToken, async (req, res) => {
  try {
    const request = await prisma.riderRequest.findUnique({
      where: { id: Number(req.params.id) },
    });

    if (!request) return res.status(404).json({ message: "Not found" });
    if (request.customerId !== Number(req.user.id)) {
      return res.status(403).json({ message: "Only customer can confirm delivery" });
    }
    if (!request.riderDeliveredAt) {
      return res.status(400).json({ message: "Rider has not marked this delivered yet" });
    }

    const updated = await prisma.riderRequest.update({
      where: { id: request.id },
      data: {
        status: "COMPLETED",
        customerConfirmedAt: new Date(),
        completedAt: new Date(),

        messages: {
          create: {
            senderId: Number(req.user.id),
            text: "✅ Customer confirmed delivery. Order completed.",
          },
        },
      },
    });

const customer = await prisma.user.findUnique({
  where: { id: Number(req.user.id) },
  select: {
    id: true,
    username: true,
  },
});

const riderRecord = await prisma.rider.findUnique({
  where: { id: request.riderId },
});

await prisma.notification.create({
  data: {
    userId: riderRecord.userId,
    senderId: customer.id,
    senderName: customer.username,
    type: "DELIVERY_CONFIRMED",
    title: "Delivery Confirmed",
    message: `${customer.username} confirmed the delivery`,
  },
});

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: "Confirmation failed" });
  }
});

/* ===================== CUSTOMER DELETE / ARCHIVE ===================== */

router.delete("/requests/:id", verifyToken, async (req, res) => {
  try {
    const request = await prisma.riderRequest.findUnique({
      where: {
        id: Number(req.params.id),
      },
    });

    if (!request) {
      return res.status(404).json({
        message: "Request not found",
      });
    }

    const rider = await getMyRider(req.user.id);

    const isCustomer =
      request.customerId === Number(req.user.id);

    const isRider =
      rider && request.riderId === rider.id;

    if (!isCustomer && !isRider) {
      return res.status(403).json({
        message: "Forbidden",
      });
    }

    const canDelete =
      request.status === "PENDING" ||
      request.status === "REJECTED" ||
      (
        request.status === "COMPLETED" &&
        request.riderDeliveredAt &&
        request.customerConfirmedAt &&
        request.completedAt
      );

    if (isCustomer && !canDelete) {
      return res.status(400).json({
        message:
          "You cannot delete an active rider chat until it is completed.",
      });
    }

    await prisma.riderRequest.update({
      where: {
        id: request.id,
      },
      data: isCustomer
        ? {
            customerArchivedAt: new Date(),
          }
        : {
            riderArchivedAt: new Date(),
          },
    });

    return res.json({
      success: true,
      message: "Removed",
    });
  } catch (err) {
    console.error("Archive rider request error:", err.message);

    return res.status(500).json({
      message: "Delete failed",
    });
  }
});

/* ===================== CHAT ===================== */

router.get("/requests/:id/chat", verifyToken, async (req, res) => {
  try {
    const request = await getRiderRequestById(req.params.id);

    if (!request) return res.status(404).json({ message: "Not found" });

    const access = await canAccessRequest(request, req.user.id);
    if (!access.ok) {
      return res.status(access.status).json({ message: access.message });
    }

    res.json({
      requestId: request.id,
      viewerUserId: Number(req.user.id),
      request,
      messages: request.messages,
    });
  } catch (err) {
    res.status(500).json({ message: "Chat load failed" });
  }
});

router.post("/requests/:id/chat", verifyToken, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) {
      return res.status(400).json({ message: "Message required" });
    }

    const request = await prisma.riderRequest.findUnique({
      where: { id: Number(req.params.id) },
    });

    if (!request) return res.status(404).json({ message: "Not found" });

    const access = await canAccessRequest(request, req.user.id);
    if (!access.ok) {
      return res.status(access.status).json({ message: access.message });
    }

    const msg = await prisma.riderMessage.create({
      data: {
        requestId: request.id,
        senderId: Number(req.user.id),
        text: text.trim(),
      },
      include: { sender: true },
    });

// Sender info
const sender = await prisma.user.findUnique({
  where: { id: Number(req.user.id) },
  select: {
    id: true,
    username: true,
  },
});

// Determine receiver
let receiverUserId;

const riderRecord = await prisma.rider.findUnique({
  where: { id: request.riderId },
});

if (request.customerId === Number(req.user.id)) {
  // Customer sent message → notify Rider
  receiverUserId = riderRecord.userId;
} else {
  // Rider sent message → notify Customer
  receiverUserId = request.customerId;
}

// Create notification
await prisma.notification.create({
  data: {
    userId: receiverUserId,
    senderId: sender.id,
    senderName: sender.username,
    type: "MESSAGE",
    title: "New Message",
    message: `${sender.username}: ${text.trim()}`,
  },
});

    res.json(msg);
  } catch (err) {
    res.status(500).json({ message: "Message failed" });
  }
});

/* ===================== DOWNLOAD LIST (SENDER LIST) ===================== */

router.get("/requests/:id/sender-list", verifyToken, async (req, res) => {
  try {
    const request = await prisma.riderRequest.findUnique({
      where: { id: Number(req.params.id) },
      include: { items: true, customer: true },
    });

    if (!request) return res.status(404).json({ message: "Not found" });

    res.json({
      customer: request.customer?.username,
      items: request.items,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed" });
  }
});
router.post("/requests/:id/download-list", verifyToken, async (req, res) => {
  try {
    const rider = await getMyRider(req.user.id);
    if (!rider) return res.status(404).json({ message: "Rider not found" });

    const request = await prisma.riderRequest.findUnique({
      where: { id: Number(req.params.id) },
      include: { items: true, customer: true },
    });

    if (!request) return res.status(404).json({ message: "Not found" });

    const access = await canAccessRequest(request, req.user.id);
    if (!access.ok) {
      return res.status(access.status).json({ message: access.message });
    }

    const alreadyDownloaded = await prisma.downloadedList.findFirst({
      where: {
        userId: Number(req.user.id),
        originalListId: request.id,
        receiverType: "RIDER_REQUEST",
      },
    });

    if (alreadyDownloaded) {
      return res.status(409).json({ message: "Already downloaded" });
    }

    const saved = await prisma.downloadedList.create({
      data: {
        name: request.listName,
        userId: Number(req.user.id),
        originalListId: request.id,
        senderId: request.customerId,
        receiverId: Number(req.user.id),
        receiverType: "RIDER_REQUEST",
        senderName: request.customer?.username,

        items: {
          create: request.items.map((i) => ({
            name: i.name,
            quantity: i.quantity,
            specification: i.specification,
            categoryName: i.categoryName,

            selectedShopId: i.selectedShopId,
            selectedShopName: i.selectedShopName,
            selectedShopPrice: i.selectedShopPrice,
            selectedShopLatitude: i.selectedShopLatitude,
            selectedShopLongitude: i.selectedShopLongitude,
            selectedShopPhone: i.selectedShopPhone,
            selectedShopTiming: i.selectedShopTiming,
            availableQuantity: i.availableQuantity,
            lineTotal: i.lineTotal,

            buyingLocationLat: request.buyingLocationLat,
            buyingLocationLng: request.buyingLocationLng,
            buyingLocationLabel: request.buyingLocationLabel,

            deliveryLocationLat: request.deliveryLocationLat,
            deliveryLocationLng: request.deliveryLocationLng,
            deliveryLocationLabel: request.deliveryLocationLabel,
          })),
        },
      },
      include: { items: true },
    });

    res.json(saved);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Download failed" });
  }
});

router.get("/downloadedlists", verifyToken, async (req, res) => {
  try {
    const lists = await prisma.downloadedList.findMany({
      where: { userId: Number(req.user.id) },
      include: { items: true },
      orderBy: { createdAt: "desc" },
    });

    res.json(lists);
  } catch (err) {
    res.status(500).json({ message: "Failed" });
  }
});
router.delete("/downloadedlists/:id", verifyToken, async (req, res) => {
  try {
    await prisma.downloadedList.delete({
      where: { id: Number(req.params.id) },
    });

    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: "Delete failed" });
  }
});
router.post("/nearby", verifyToken, async (req, res) => {
  try {
    const {
      listId,
      listType,
      listName,
      buyingLocationLat,
      buyingLocationLng,
      buyingLocationLabel,
      deliveryLocationLat,
      deliveryLocationLng,
      deliveryLocationLabel,
      items = [],
    } = req.body;

    const buyLat = Number(buyingLocationLat);
    const buyLng = Number(buyingLocationLng);

    if (!Number.isFinite(buyLat) || !Number.isFinite(buyLng)) {
      return res.status(400).json({
        message: "Valid buying location coordinates are required",
      });
    }

    const onlineRiders = await prisma.rider.findMany({
      where: {
        isLocationOn: true,
        currentLat: { not: null },
        currentLng: { not: null },
      },
      include: {
        user: true,
      },
    });

    const MAX_DISTANCE_KM = 10;

    const riders = onlineRiders
      .map((rider) => {
        const riderLat = Number(rider.currentLat);
        const riderLng = Number(rider.currentLng);

        if (!Number.isFinite(riderLat) || !Number.isFinite(riderLng)) {
          return null;
        }

        const calculatedDistance = distanceKm(buyLat, buyLng, riderLat, riderLng);

        return {
          riderId: rider.id,
          userId: rider.userId,
          name:
            rider.user?.username ||
            rider.user?.name ||
            rider.name ||
            `Rider #${rider.id}`,
          phone: rider.phone || rider.user?.phone || null,
          currentLat: riderLat,
          currentLng: riderLng,
          locationLabel: rider.locationLabel || "",
          dailyCashLimit: rider.dailyCashLimit,
          paymentMethodType: rider.paymentMethodType || "",
          paymentProviderName: rider.paymentProviderName || "",
          distanceKm: Number(calculatedDistance.toFixed(2)),
        };
      })
      .filter(Boolean)
      .filter((rider) => rider.distanceKm <= MAX_DISTANCE_KM)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    res.json({
      sourceList: {
        id: listId ? Number(listId) : null,
        type: listType || "saved",
        name: listName || "Selected List",
        items,
        buyingLocationLat: buyLat,
        buyingLocationLng: buyLng,
        buyingLocationLabel: buyingLocationLabel || "",
        deliveryLocationLat:
          deliveryLocationLat === null || deliveryLocationLat === undefined
            ? null
            : Number(deliveryLocationLat),
        deliveryLocationLng:
          deliveryLocationLng === null || deliveryLocationLng === undefined
            ? null
            : Number(deliveryLocationLng),
        deliveryLocationLabel: deliveryLocationLabel || "",
      },
      riders,
    });
  } catch (err) {
    console.log("Nearby riders error:", err);
    res.status(500).json({ message: "Failed to load nearby riders" });
  }
});

router.post("/request", verifyToken, async (req, res) => {
  try {
    const {
      riderId,
      listId,
      listType,
      listName,
      items = [],
      buyingLocationLat,
      buyingLocationLng,
      buyingLocationLabel,
      deliveryLocationLat,
      deliveryLocationLng,
      deliveryLocationLabel,
    } = req.body;

    const selectedRiderId = Number(riderId);

    if (!Number.isFinite(selectedRiderId)) {
      return res.status(400).json({ message: "Valid rider is required" });
    }

    const rider = await prisma.rider.findFirst({
      where: {
        id: selectedRiderId,
        isLocationOn: true,
        currentLat: { not: null },
        currentLng: { not: null },
      },
    });

    if (!rider) {
      return res.status(404).json({
        message: "This rider is no longer available",
      });
    }

    const request = await prisma.riderRequest.create({
      data: {
        customerId: Number(req.user.id),
        riderId: rider.id,
        sourceListId: listId ? Number(listId) : 0,
        sourceListType: listType || "saved",
        listName: listName || "Shopping List",

        buyingLocationLat:
          buyingLocationLat === null || buyingLocationLat === undefined
            ? null
            : Number(buyingLocationLat),
        buyingLocationLng:
          buyingLocationLng === null || buyingLocationLng === undefined
            ? null
            : Number(buyingLocationLng),
        buyingLocationLabel: buyingLocationLabel || "",

        deliveryLocationLat:
          deliveryLocationLat === null || deliveryLocationLat === undefined
            ? null
            : Number(deliveryLocationLat),
        deliveryLocationLng:
          deliveryLocationLng === null || deliveryLocationLng === undefined
            ? null
            : Number(deliveryLocationLng),
        deliveryLocationLabel: deliveryLocationLabel || "",

        status: "PENDING",

        items: {
          create: Array.isArray(items)
            ? items.map((item) => ({
                name: item.name || "",
                quantity:
                  item.quantity === undefined || item.quantity === null
                    ? 1
                    : Number(item.quantity),
                specification: item.specification || "",
                categoryName: item.categoryName || "",

                selectedShopId: item.selectedShopId || null,
                selectedShopName: item.selectedShopName || null,
                selectedShopPrice:
                  item.selectedShopPrice === undefined ||
                  item.selectedShopPrice === null
                    ? null
                    : Number(item.selectedShopPrice),
                selectedShopLatitude:
                  item.selectedShopLatitude === undefined ||
                  item.selectedShopLatitude === null
                    ? null
                    : Number(item.selectedShopLatitude),
                selectedShopLongitude:
                  item.selectedShopLongitude === undefined ||
                  item.selectedShopLongitude === null
                    ? null
                    : Number(item.selectedShopLongitude),
                selectedShopPhone: item.selectedShopPhone || null,
                selectedShopTiming: item.selectedShopTiming || null,
                availableQuantity: item.availableQuantity || null,
                lineTotal:
                  item.lineTotal === undefined || item.lineTotal === null
                    ? null
                    : Number(item.lineTotal),
              }))
            : [],
        },

        messages: {
          create: {
            senderId: Number(req.user.id),
            text: "Customer shared shopping list with rider",
          },
        },
      },
      include: {
        customer: true,
        rider: true,
        items: true,
      },
    });

const customer = await prisma.user.findUnique({
  where: { id: Number(req.user.id) },
  select: {
    id: true,
    username: true,
  },
});


await prisma.notification.create({
  data: {
    userId: rider.userId,
    senderId: customer.id,
    senderName: customer.username,
    type: "RIDER_REQUEST",
    title: "New Rider Request",
    message: `${customer.username} sent you a shopping request`,
  },
});


    res.json(request);
  } catch (err) {
    console.log("Create rider request error:", err);
    res.status(500).json({ message: "Could not send request" });
  }
});
export default router;
