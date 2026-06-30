import express from "express";
import { PrismaClient } from "@prisma/client";
import { verifyToken } from "../middlewares/authMiddleware.js";

const router = express.Router();
const prisma = new PrismaClient();

const getMyRider = async (userId) => {
  return prisma.rider.findUnique({ where: { userId: Number(userId) } });
};

const getDistKm = (la1, lo1, la2, lo2) => {
  const R = 6371;
  const dLat = ((la2 - la1) * Math.PI) / 180;
  const dLon = ((lo2 - lo1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((la1 * Math.PI) / 180) *
      Math.cos((la2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const optimizeStops = (origin, stops) => {
  const unvisited = [...stops];
  const sequence = [];
  let currentLat = Number(origin.lat);
  let currentLng = Number(origin.lng);
  let totalDistanceKm = 0;

  while (unvisited.length > 0) {
    let nearestIndex = 0;
    let nearestDistance = Infinity;

    unvisited.forEach((stop, index) => {
      const distance = getDistKm(currentLat, currentLng, stop.latitude, stop.longitude);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });

    const nextStop = unvisited.splice(nearestIndex, 1)[0];
    totalDistanceKm += nearestDistance;
    currentLat = nextStop.latitude;
    currentLng = nextStop.longitude;
    sequence.push(nextStop);
  }

  return { sequence, totalDistanceKm };
};

const canAccessRequest = async (request, userId) => {
  const rider = await getMyRider(userId);
  const isCustomer = request.customerId === Number(userId);
  const isRider = rider && request.riderId === rider.id;
  return { ok: Boolean(isCustomer || isRider), rider, isCustomer, isRider };
};

const normalizeShopName = (value) => String(value || "").trim().toLowerCase();

const getItemDone = (item) => Boolean(item.riderOptimizerDone || item.customerOptimizerDone);
const getItemDoneAt = (item) => item.riderOptimizerDoneAt || item.customerOptimizerDoneAt || null;

const groupItemsByShop = async (items) => {
  const shopIds = Array.from(
    new Set(
      items
        .map((item) => Number(item.selectedShopId))
        .filter((id) => Number.isFinite(id))
    )
  );
  const shopNames = Array.from(
    new Set(
      items
        .map((item) => item.selectedShopName)
        .filter(Boolean)
    )
  );

  const shopWhere = [];
  if (shopIds.length > 0) shopWhere.push({ id: { in: shopIds } });
  if (shopNames.length > 0) {
    shopWhere.push({ shopName: { in: shopNames } });
    shopWhere.push({ shopDetails: { is: { shopName: { in: shopNames } } } });
  }

  const shopkeepers = shopWhere.length > 0
    ? await prisma.shopkeeper.findMany({
        where: { OR: shopWhere },
        include: { shopDetails: true },
      })
    : [];

  const shopById = new Map(shopkeepers.map((shop) => [shop.id, shop]));
  const shopByName = new Map();
  shopkeepers.forEach((shop) => {
    shopByName.set(normalizeShopName(shop.shopName), shop);
    if (shop.shopDetails?.shopName) {
      shopByName.set(normalizeShopName(shop.shopDetails.shopName), shop);
    }
  });

  const shopMap = new Map();

  items.forEach((item) => {
    const hasExplicitShopId = item.selectedShopId !== null && item.selectedShopId !== undefined && item.selectedShopId !== "";
    const explicitShopId = Number(item.selectedShopId);
    const fallbackShop =
      shopById.get(explicitShopId) ||
      shopByName.get(normalizeShopName(item.selectedShopName));

    if (hasExplicitShopId && Number.isFinite(explicitShopId) && !fallbackShop) {
      return;
    }

    const details = fallbackShop?.shopDetails;

    const latitude = item.selectedShopLatitude != null ? Number(item.selectedShopLatitude) : Number(details?.latitude);
    const longitude = item.selectedShopLongitude != null ? Number(item.selectedShopLongitude) : Number(details?.longitude);
    const shopName = item.selectedShopName || details?.shopName || fallbackShop?.shopName;

    if (!shopName || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return;
    }

    const key = String(item.selectedShopId || fallbackShop?.id || shopName);
    if (!shopMap.has(key)) {
      shopMap.set(key, {
        shopKey: key,
        shopId: item.selectedShopId || fallbackShop?.id || null,
        shopName,
        latitude,
        longitude,
        shopPhone: item.selectedShopPhone || details?.phone || "",
        shopTiming: item.selectedShopTiming || details?.timing || "",
        items: [],
      });
    }

    shopMap.get(key).items.push({
      id: item.id,
      name: item.name,
      quantity: item.quantity || 1,
      specification: item.specification || "None",
      categoryName: item.categoryName || "Uncategorized",
      selectedShopPrice: item.selectedShopPrice || 0,
      lineTotal: item.lineTotal || Number(item.selectedShopPrice || 0) * Number(item.quantity || 1),
      riderOptimizerDone: Boolean(item.riderOptimizerDone),
      riderOptimizerDoneAt: item.riderOptimizerDoneAt,
      customerOptimizerDone: Boolean(item.customerOptimizerDone),
      customerOptimizerDoneAt: item.customerOptimizerDoneAt,
      optimizerDone: getItemDone(item),
      optimizerDoneAt: getItemDoneAt(item),
    });
  });

  return Array.from(shopMap.values());
};

const getDownloadedListLocation = (list, kind) => {
  const latKey = kind === "delivery" ? "deliveryLocationLat" : "buyingLocationLat";
  const lngKey = kind === "delivery" ? "deliveryLocationLng" : "buyingLocationLng";
  const labelKey = kind === "delivery" ? "deliveryLocationLabel" : "buyingLocationLabel";
  const item = list?.items?.find((i) => i[latKey] != null && i[lngKey] != null);
  if (!item) return { lat: null, lng: null, label: "" };
  return {
    lat: item[latKey],
    lng: item[lngKey],
    label: item[labelKey] || "Selected location",
  };
};

const findMatchingProduct = async (item, shopkeeperId) => {
  const candidates = await prisma.product.findMany({
    where: {
      shopkeeperId,
      name: { equals: item.name },
    },
  });

  const itemSpec = String(item.specification || "").trim().toLowerCase();
  return (
    candidates.find(
      (product) =>
        String(product.specification || "").trim().toLowerCase() === itemSpec
    ) ||
    candidates[0] ||
    null
  );
};

const createShopkeeperOrderNotification = async ({ request, item, riderUserId }) => {
  const shopkeeperId = Number(item.selectedShopId);
  if (!Number.isFinite(shopkeeperId)) return;

  const shopkeeper = await prisma.shopkeeper.findUnique({
    where: { id: shopkeeperId },
    include: { shopDetails: true },
  });
  if (!shopkeeper) return;

  const product = await findMatchingProduct(item, shopkeeper.id);
  const quantity = Number(item.quantity || 1);
  const rider = await prisma.user.findUnique({ where: { id: Number(riderUserId) } });
  const shopName = item.selectedShopName || shopkeeper.shopDetails?.shopName || shopkeeper.shopName;
  const productLabel = item.specification ? `${item.name} - ${item.specification}` : item.name;

  await prisma.shopkeeperOrderNotification.upsert({
    where: { riderRequestItemId: item.id },
    update: {
      shopkeeperId: shopkeeper.id,
      productId: product?.id || null,
      riderRequestId: request.id,
      productName: item.name,
      specification: item.specification || null,
      quantity,
      shopName,
      riderName: rider?.username || null,
      message: `${productLabel} quantity ${quantity} purchased.`,
      status: "PENDING",
      respondedAt: null,
    },
    create: {
      shopkeeperId: shopkeeper.id,
      productId: product?.id || null,
      riderRequestId: request.id,
      riderRequestItemId: item.id,
      productName: item.name,
      specification: item.specification || null,
      quantity,
      shopName,
      riderName: rider?.username || null,
      message: `${productLabel} quantity ${quantity} purchased.`,
    },
  });
};

const createCustomerShopkeeperOrderNotification = async ({ list, item, customerUserId }) => {
  const shopkeeperId = Number(item.selectedShopId);
  if (!Number.isFinite(shopkeeperId)) return;

  const shopkeeper = await prisma.shopkeeper.findUnique({
    where: { id: shopkeeperId },
    include: { shopDetails: true },
  });
  if (!shopkeeper) return;

  const product = await findMatchingProduct(item, shopkeeper.id);
  const quantity = Number(item.quantity || 1);
  const customer = await prisma.user.findUnique({ where: { id: Number(customerUserId) } });
  const shopName = item.selectedShopName || shopkeeper.shopDetails?.shopName || shopkeeper.shopName;
  const productLabel = item.specification ? `${item.name} - ${item.specification}` : item.name;

  await prisma.shopkeeperOrderNotification.upsert({
    where: { downloadedListItemId: item.id },
    update: {
      shopkeeperId: shopkeeper.id,
      productId: product?.id || null,
      downloadedListId: list.id,
      productName: item.name,
      specification: item.specification || null,
      quantity,
      shopName,
      riderName: customer?.username || "Customer",
      message: `${productLabel} quantity ${quantity} purchased by customer.`,
      status: "PENDING",
      respondedAt: null,
    },
    create: {
      shopkeeperId: shopkeeper.id,
      productId: product?.id || null,
      downloadedListId: list.id,
      downloadedListItemId: item.id,
      productName: item.name,
      specification: item.specification || null,
      quantity,
      shopName,
      riderName: customer?.username || "Customer",
      message: `${productLabel} quantity ${quantity} purchased by customer.`,
    },
  });
};

const countWords = (value) => String(value || "").trim().split(/\s+/).filter(Boolean).length;

router.get("/requests/:id/plan", verifyToken, async (req, res) => {
  try {
    const request = await prisma.riderRequest.findUnique({
      where: { id: Number(req.params.id) },
      include: { items: true, customer: true, rider: true },
    });

    if (!request) return res.status(404).json({ message: "Request not found" });

    const access = await canAccessRequest(request, req.user.id);
    if (!access.ok) return res.status(403).json({ message: "Forbidden" });

    return res.json({
      requestId: request.id,
      listName: request.listName,
      status: request.status,
      customerId: request.customerId,
      riderId: request.riderId,
      buyingLocation: {
        lat: request.buyingLocationLat,
        lng: request.buyingLocationLng,
        label: request.buyingLocationLabel,
      },
      deliveryLocation: {
        lat: request.deliveryLocationLat,
        lng: request.deliveryLocationLng,
        label: request.deliveryLocationLabel,
      },
      stops: await groupItemsByShop(request.items),
    });
  } catch (error) {
    console.log("RIDER OPTIMIZER PLAN ERROR:", error);
    return res.status(500).json({ message: "Could not load rider optimizer plan" });
  }
});

router.post("/requests/:id/optimize", verifyToken, async (req, res) => {
  try {
    const { riderLat, riderLng } = req.body;
    const originLat = Number(riderLat);
    const originLng = Number(riderLng);

    if (!Number.isFinite(originLat) || !Number.isFinite(originLng)) {
      return res.status(400).json({ message: "Valid rider live location is required" });
    }

    const request = await prisma.riderRequest.findUnique({
      where: { id: Number(req.params.id) },
      include: { items: true, customer: true, rider: true },
    });

    if (!request) return res.status(404).json({ message: "Request not found" });

    const access = await canAccessRequest(request, req.user.id);
    if (!access.ok) return res.status(403).json({ message: "Forbidden" });
    if (!access.isRider) return res.status(403).json({ message: "Only rider can optimize this route" });

    const stops = await groupItemsByShop(request.items);
    const { sequence, totalDistanceKm } = optimizeStops({ lat: originLat, lng: originLng }, stops);

    await Promise.all(
      sequence.flatMap((stop, stopIndex) =>
        stop.items.map((item) =>
          prisma.riderRequestItem.update({
            where: { id: item.id },
            data: { riderOptimizerStopOrder: stopIndex + 1 },
          })
        )
      )
    );

    return res.json({
      origin: { lat: originLat, lng: originLng, label: "Rider live location" },
      deliveryLocation: {
        lat: request.deliveryLocationLat,
        lng: request.deliveryLocationLng,
        label: request.deliveryLocationLabel,
      },
      totalDistanceKm: Number(totalDistanceKm.toFixed(2)),
      estimatedMinutes: Math.round((totalDistanceKm / 35) * 60) + sequence.length * 5,
      stops: sequence.map((stop, index) => ({ ...stop, stopNumber: index + 1 })),
    });
  } catch (error) {
    console.log("RIDER OPTIMIZER ERROR:", error);
    return res.status(500).json({ message: "Could not optimize rider route" });
  }
});

router.patch("/requests/:id/items/:itemId/done", verifyToken, async (req, res) => {
  try {
    const { done } = req.body;
    const request = await prisma.riderRequest.findUnique({
      where: { id: Number(req.params.id) },
      include: { items: true },
    });

    if (!request) return res.status(404).json({ message: "Request not found" });

    const access = await canAccessRequest(request, req.user.id);
    if (!access.ok) return res.status(403).json({ message: "Forbidden" });
    if (!access.isRider) return res.status(403).json({ message: "Only rider can update item status" });

    const item = request.items.find((i) => i.id === Number(req.params.itemId));
    if (!item) return res.status(404).json({ message: "Item not found" });

    const wasDone = Boolean(item.riderOptimizerDone);
    const updatedItem = await prisma.riderRequestItem.update({
      where: { id: item.id },
      data: {
        riderOptimizerDone: Boolean(done),
        riderOptimizerDoneAt: done ? new Date() : null,
      },
    });

    if (done && !wasDone) {
      await createShopkeeperOrderNotification({
        request,
        item: updatedItem,
        riderUserId: req.user.id,
      });
    }

    await prisma.riderMessage.create({
      data: {
        requestId: request.id,
        senderId: Number(req.user.id),
        type: "RIDER_OPTIMIZER_ITEM",
        text: done
          ? `Rider has purchased: ${item.name} from ${item.selectedShopName || "selected shop"}`
          : `Rider unchecked: ${item.name}`,
      },
    });

    const freshRequest = await prisma.riderRequest.findUnique({
      where: { id: request.id },
      include: {
        items: true,
        messages: { include: { sender: true }, orderBy: { createdAt: "asc" } },
      },
    });

    return res.json({ item: updatedItem, request: freshRequest });
  } catch (error) {
    console.log("RIDER OPTIMIZER ITEM DONE ERROR:", error);
    return res.status(500).json({ message: "Could not update item" });
  }
});

router.post("/shops/:shopkeeperId/report", verifyToken, async (req, res) => {
  try {
    const shopkeeperId = Number(req.params.shopkeeperId);
const {
  title,
  reason,
  source,
  riderRequestId,
  downloadedListId,
} = req.body;
    const normalizedTitle = title === "OTHER_REASON" ? "OTHER_REASON" : "SHOP_DOES_NOT_EXIST";
    const cleanReason = String(reason || "").trim();

    if (!Number.isFinite(shopkeeperId)) {
      return res.status(400).json({ message: "Valid shop id is required" });
    }

    if (normalizedTitle === "OTHER_REASON" && !cleanReason) {
      return res.status(400).json({ message: "Reason is required" });
    }

    if (countWords(cleanReason) > 500) {
      return res.status(400).json({ message: "Reason must be 500 words or less" });
    }

    const shopkeeper = await prisma.shopkeeper.findUnique({ where: { id: shopkeeperId } });
    if (!shopkeeper) return res.status(404).json({ message: "Shop not found" });

const existingReport = await prisma.shopReport.findFirst({
  where: {
    shopkeeperId,
    reporterId: Number(req.user.id),

    OR: [
      riderRequestId
        ? { riderRequestId: Number(riderRequestId) }
        : undefined,

      downloadedListId
        ? { downloadedListId: Number(downloadedListId) }
        : undefined,
    ].filter(Boolean),
  },
});

if (existingReport) {
  return res.status(400).json({
    message: "You already reported this shop from this list.",
  });
}

    const report = await prisma.shopReport.create({
  data: {
    shopkeeperId,
    reporterId: Number(req.user.id),

    riderRequestId: riderRequestId
      ? Number(riderRequestId)
      : null,

    downloadedListId: downloadedListId
      ? Number(downloadedListId)
      : null,

    title: normalizedTitle,
    reason:
      normalizedTitle === "OTHER_REASON"
        ? cleanReason
        : null,

    source: source || "optimizer",
  },
});

   await prisma.adminNotification.create({
  data: {
    type: "SHOP_REPORT",
    title: "Shop Reported",
    message: `${shopkeeper.shopName} received a new report`,
    shopkeeperId,
  },
});

const reportCount = await prisma.shopReport.count({
  where: {
    shopkeeperId,
    title: "SHOP_DOES_NOT_EXIST",
  },
});

if (reportCount >= 5) {
  await prisma.adminNotification.create({
    data: {
      type: "SUSPEND_WARNING",
      title: "Suspend Shopkeeper",
      message: `Shop has received ${reportCount} reports`,
      shopkeeperId,
    },
  }); 
}

    return res.status(201).json({ message: "Reported", report });
  } catch (error) {
    console.log("SHOP REPORT ERROR:", error);
    return res.status(500).json({ message: "Could not report shop" });
  }
});

router.post("/requests/:id/delivery-route", verifyToken, async (req, res) => {
  try {
    const { riderLat, riderLng } = req.body;
    const originLat = Number(riderLat);
    const originLng = Number(riderLng);

    if (!Number.isFinite(originLat) || !Number.isFinite(originLng)) {
      return res.status(400).json({ message: "Valid rider live location is required" });
    }

    const request = await prisma.riderRequest.findUnique({
      where: { id: Number(req.params.id) },
      include: { items: true },
    });

    if (!request) return res.status(404).json({ message: "Request not found" });

    const access = await canAccessRequest(request, req.user.id);
    if (!access.ok) return res.status(403).json({ message: "Forbidden" });
    if (!access.isRider) return res.status(403).json({ message: "Only rider can create delivery route" });

    const allDone = request.items.length > 0 && request.items.every((item) => item.riderOptimizerDone);
    if (!allDone) return res.status(400).json({ message: "Mark all items done first" });

    const deliveryLat = Number(request.deliveryLocationLat);
    const deliveryLng = Number(request.deliveryLocationLng);

    if (!Number.isFinite(deliveryLat) || !Number.isFinite(deliveryLng)) {
      return res.status(400).json({ message: "Delivery location is missing" });
    }

    const distanceKm = getDistKm(originLat, originLng, deliveryLat, deliveryLng);

    return res.json({
      origin: { lat: originLat, lng: originLng, label: "Rider live location" },
      destination: {
        lat: deliveryLat,
        lng: deliveryLng,
        label: request.deliveryLocationLabel || "Delivery location",
      },
      totalDistanceKm: Number(distanceKm.toFixed(2)),
      estimatedMinutes: Math.round((distanceKm / 35) * 60),
    });
  } catch (error) {
    console.log("RIDER OPTIMIZER DELIVERY ROUTE ERROR:", error);
    return res.status(500).json({ message: "Could not create delivery route" });
  }
});

router.get("/downloaded-lists/:id/plan", verifyToken, async (req, res) => {
  try {
    const list = await prisma.downloadedList.findFirst({
      where: {
        id: Number(req.params.id),
        userId: Number(req.user.id),
      },
      include: { items: true },
    });

    if (!list) return res.status(404).json({ message: "Downloaded list not found" });

    return res.json({
      downloadedListId: list.id,
      listName: list.name,
      originalListId: list.originalListId,
      buyingLocation: getDownloadedListLocation(list, "buying"),
      deliveryLocation: getDownloadedListLocation(list, "delivery"),
      stops: await groupItemsByShop(list.items),
    });
  } catch (error) {
    console.log("CUSTOMER DOWNLOADED OPTIMIZER PLAN ERROR:", error);
    return res.status(500).json({ message: "Could not load downloaded-list optimizer plan" });
  }
});

router.post("/downloaded-lists/:id/optimize", verifyToken, async (req, res) => {
  try {
    const { riderLat, riderLng } = req.body;
    const originLat = Number(riderLat);
    const originLng = Number(riderLng);

    if (!Number.isFinite(originLat) || !Number.isFinite(originLng)) {
      return res.status(400).json({ message: "Valid live location is required" });
    }

    const list = await prisma.downloadedList.findFirst({
      where: {
        id: Number(req.params.id),
        userId: Number(req.user.id),
      },
      include: { items: true },
    });

    if (!list) return res.status(404).json({ message: "Downloaded list not found" });

    const stops = await groupItemsByShop(list.items);
    const { sequence, totalDistanceKm } = optimizeStops({ lat: originLat, lng: originLng }, stops);

    await Promise.all(
      sequence.flatMap((stop, stopIndex) =>
        stop.items.map((item) =>
          prisma.downloadedListItem.update({
            where: { id: item.id },
            data: { customerOptimizerStopOrder: stopIndex + 1 },
          })
        )
      )
    );

    return res.json({
      origin: { lat: originLat, lng: originLng, label: "Your live location" },
      deliveryLocation: getDownloadedListLocation(list, "delivery"),
      totalDistanceKm: Number(totalDistanceKm.toFixed(2)),
      estimatedMinutes: Math.round((totalDistanceKm / 35) * 60) + sequence.length * 5,
      stops: sequence.map((stop, index) => ({ ...stop, stopNumber: index + 1 })),
    });
  } catch (error) {
    console.log("CUSTOMER DOWNLOADED OPTIMIZER ERROR:", error);
    return res.status(500).json({ message: "Could not optimize downloaded list route" });
  }
});

router.patch("/downloaded-lists/:id/items/:itemId/done", verifyToken, async (req, res) => {
  try {
    const { done } = req.body;
    const list = await prisma.downloadedList.findFirst({
      where: {
        id: Number(req.params.id),
        userId: Number(req.user.id),
      },
      include: { items: true },
    });

    if (!list) return res.status(404).json({ message: "Downloaded list not found" });

    const item = list.items.find((i) => i.id === Number(req.params.itemId));
    if (!item) return res.status(404).json({ message: "Item not found" });

    const wasDone = Boolean(item.customerOptimizerDone);
    const updatedItem = await prisma.downloadedListItem.update({
      where: { id: item.id },
      data: {
        customerOptimizerDone: Boolean(done),
        customerOptimizerDoneAt: done ? new Date() : null,
      },
    });

    if (done && !wasDone) {
      await createCustomerShopkeeperOrderNotification({
        list,
        item: updatedItem,
        customerUserId: req.user.id,
      });
    }

    if (list.originalListId) {
      await prisma.sharedListItem.updateMany({
        where: {
          sharedListId: Number(list.originalListId),
          name: item.name,
          selectedShopName: item.selectedShopName,
        },
        data: {
          customerOptimizerDone: Boolean(done),
          customerOptimizerDoneAt: done ? new Date() : null,
        },
      });

      await prisma.message.create({
        data: {
          listId: Number(list.originalListId),
          senderId: Number(req.user.id),
          text: done
            ? `Purchased: ${item.name} from ${item.selectedShopName || "selected shop"}`
            : `Unchecked: ${item.name}`,
          status: "SENT",
        },
      });
    }

    const freshList = await prisma.downloadedList.findFirst({
      where: {
        id: list.id,
        userId: Number(req.user.id),
      },
      include: { items: true },
    });

    return res.json({ item: updatedItem, list: freshList });
  } catch (error) {
    console.log("CUSTOMER DOWNLOADED ITEM DONE ERROR:", error);
    return res.status(500).json({ message: "Could not update item" });
  }
});

router.post("/downloaded-lists/:id/delivery-route", verifyToken, async (req, res) => {
  try {
    const { riderLat, riderLng } = req.body;
    const originLat = Number(riderLat);
    const originLng = Number(riderLng);

    if (!Number.isFinite(originLat) || !Number.isFinite(originLng)) {
      return res.status(400).json({ message: "Valid live location is required" });
    }

    const list = await prisma.downloadedList.findFirst({
      where: {
        id: Number(req.params.id),
        userId: Number(req.user.id),
      },
      include: { items: true },
    });

    if (!list) return res.status(404).json({ message: "Downloaded list not found" });

    const allDone = list.items.length > 0 && list.items.every((item) => item.customerOptimizerDone);
    if (!allDone) return res.status(400).json({ message: "Mark all items done first" });

    const deliveryLocation = getDownloadedListLocation(list, "delivery");
    const deliveryLat = Number(deliveryLocation.lat);
    const deliveryLng = Number(deliveryLocation.lng);

    if (!Number.isFinite(deliveryLat) || !Number.isFinite(deliveryLng)) {
      return res.status(400).json({ message: "Delivery location is missing" });
    }

    const distanceKm = getDistKm(originLat, originLng, deliveryLat, deliveryLng);

    return res.json({
      origin: { lat: originLat, lng: originLng, label: "Your live location" },
      destination: {
        lat: deliveryLat,
        lng: deliveryLng,
        label: deliveryLocation.label || "Delivery location",
      },
      totalDistanceKm: Number(distanceKm.toFixed(2)),
      estimatedMinutes: Math.round((distanceKm / 35) * 60),
    });
  } catch (error) {
    console.log("CUSTOMER DOWNLOADED DELIVERY ROUTE ERROR:", error);
    return res.status(500).json({ message: "Could not create delivery route" });
  }
});

export default router;

