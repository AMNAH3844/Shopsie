import express from "express";
import { PrismaClient } from "@prisma/client";
import { verifyToken } from "../middlewares/authMiddleware.js";

const router = express.Router();
const prisma = new PrismaClient();

const normalizeText = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const displaySpecification = (value) => {
  const spec = String(value || "").trim();
  return spec ? spec : "None";
};

const getSpecKeywords = (value) => {
  const spec = displaySpecification(value);
  if (spec === "None") return [];
  return normalizeText(spec).split(/\s+/).filter(Boolean);
};

const makeListItemKey = (item, index) => {
  const idPart = item.id || item.listItemId || index;
  return `${normalizeText(item.name)}__${displaySpecification(item.specification).toLowerCase()}__${idPart}`;
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

const namesMatch = (requestedName, productName) => {
  const requested = normalizeText(requestedName);
  const product = normalizeText(productName);
  return Boolean(
    requested &&
      product &&
      (requested === product || requested.includes(product) || product.includes(requested))
  );
};

const specificationsMatch = (requestedSpec, productSpec) => {
  const requestedKeywords = getSpecKeywords(requestedSpec);
  if (requestedKeywords.length === 0) return true;

  const productKeywords = getSpecKeywords(productSpec);
  if (productKeywords.length === 0) return false;

  return requestedKeywords.every((keyword) => productKeywords.includes(keyword));
};

const buildTargetItemsFromRawItems = (items = []) => {
  return items
    .map((item, index) => ({
      itemKey: item.itemKey || makeListItemKey(item, index),
      itemName: item.name?.trim(),
      specification: displaySpecification(item.specification),
      requestedQuantity: Number(item.quantity || item.requestedQuantity || 1),
      categoryName: item.categoryName || item.category || "Uncategorized",
    }))
    .filter((item) => item.itemName);
};

const buildItemsWithShopOptions = async ({
  targetItems,
  originLat,
  originLng,
  maxDistanceKm = null,
}) => {
  if (targetItems.length === 0) return [];

  const matchingProducts = await prisma.product.findMany({
  where: {
    quantity: { gt: 0 },

    shopkeeper: {
      isSuspended: false,

      shopDetails: {
        isNot: null,
      },
    },
  },

  include: {
    shopkeeper: {
      include: {
        shopDetails: true,
      },
    },
  },

  orderBy: [
    { price: "asc" },
    { createdAt: "desc" },
  ],
});

  const groupedItems = {};

  targetItems.forEach((item) => {
    groupedItems[item.itemKey] = {
      itemKey: item.itemKey,
      itemName: item.itemName,
      specification: item.specification,
      requestedQuantity: item.requestedQuantity,
      categoryName: item.categoryName,
      options: [],
    };
  });

  targetItems.forEach((targetItem) => {
    matchingProducts.forEach((product) => {
      if (!namesMatch(targetItem.itemName, product.name)) return;
      if (!specificationsMatch(targetItem.specification, product.specification)) return;

      const details = product.shopkeeper.shopDetails;
      if (!details) return;

      const latitude = Number(details.latitude);
      const longitude = Number(details.longitude);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;

      const distanceKm = getDistKm(originLat, originLng, latitude, longitude);
      if (maxDistanceKm != null && distanceKm > Number(maxDistanceKm)) return;

      groupedItems[targetItem.itemKey].options.push({
        shopId: product.shopkeeper.id,
        productId: product.id,
        shopName: details.shopName || product.shopkeeper.shopName,
        price: Number(product.price || 0),
        specs: displaySpecification(product.specification),
        availableQuantity: Number(product.quantity || 0),
        requestedQuantity: targetItem.requestedQuantity,
        distanceKm: Number(distanceKm.toFixed(2)),
        latitude,
        longitude,
        shopPhone: details.phone || "No phone provided",
        shopTiming: details.timing || "No timings set",
        shopDescription: details.description || "No description available",
      });
    });
  });

  return Object.values(groupedItems).map((item) => ({
    ...item,
    options: item.options.sort((a, b) => {
      if (a.price !== b.price) return a.price - b.price;
      return a.distanceKm - b.distanceKm;
    }),
  }));
};

router.post("/cart-options", verifyToken, async (req, res) => {
  try {
    const { items, userLat, userLng, maxDistanceKm } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "No cart items provided." });
    }

    const originLat = Number(userLat);
    const originLng = Number(userLng);
    const radiusKm = maxDistanceKm ? Number(maxDistanceKm) : 10;

    if (!Number.isFinite(originLat) || !Number.isFinite(originLng)) {
      return res.status(400).json({ error: "Valid selected buying location is required." });
    }

    const targetItems = buildTargetItemsFromRawItems(items);

    const itemsWithShops = await buildItemsWithShopOptions({
      targetItems,
      originLat,
      originLng,
      maxDistanceKm: radiusKm,
    });

    const shopMap = new Map();

    itemsWithShops.forEach((item) => {
      item.options.forEach((opt) => {
        if (!shopMap.has(opt.shopId)) {
          shopMap.set(opt.shopId, {
            shopId: opt.shopId,
            shopName: opt.shopName,
            latitude: opt.latitude,
            longitude: opt.longitude,
            distanceKm: opt.distanceKm,
            shopPhone: opt.shopPhone,
            shopTiming: opt.shopTiming,
            shopDescription: opt.shopDescription,
            matchedItemsCount: 0,
          });
        }
        shopMap.get(opt.shopId).matchedItemsCount += 1;
      });
    });

    return res.json({
      origin: { lat: originLat, lng: originLng },
      radiusKm,
      nearbyShops: Array.from(shopMap.values()).sort((a, b) => {
        if (b.matchedItemsCount !== a.matchedItemsCount) {
          return b.matchedItemsCount - a.matchedItemsCount;
        }
        return a.distanceKm - b.distanceKm;
      }),
      itemsWithShops,
    });
  } catch (error) {
    console.error("CART OPTIONS ERROR:", error);
    return res.status(500).json({ error: "Failed to gather cart shop choices." });
  }
});

router.post("/optimize", verifyToken, async (req, res) => {
  try {
    const { listId, userLat, userLng, isDownloaded } = req.body;

    const originLat = userLat ? Number(userLat) : 31.5204;
    const originLng = userLng ? Number(userLng) : 74.3587;

    const MAX_DISTANCE_KM = 10;

    if (!listId) {
      return res.status(400).json({
        error: "Missing required listId parameter.",
      });
    }

    let targetItems = [];

    const standardIsDownloaded =
      isDownloaded === true ||
      String(isDownloaded) === "true";

    if (standardIsDownloaded) {
      const downloadedListData =
        await prisma.downloadedList.findUnique({
          where: {
            id: Number(listId),
          },
          include: {
            items: true,
          },
        });

      if (downloadedListData?.items) {
        targetItems = buildTargetItemsFromRawItems(
          downloadedListData.items
        );
      }
    } else {
      const listData = await prisma.list.findUnique({
        where: {
          id: Number(listId),
        },
        include: {
          items: true,
        },
      });

      if (listData?.items) {
        targetItems = buildTargetItemsFromRawItems(
          listData.items
        );
      }
    }

    const itemsWithShops = await buildItemsWithShopOptions({
      targetItems,
      originLat,
      originLng,
      maxDistanceKm: MAX_DISTANCE_KM,
    });

    return res.json({
      origin: {
        lat: originLat,
        lng: originLng,
      },
      radiusKm: MAX_DISTANCE_KM,
      itemsWithShops,
    });
  } catch (error) {
    console.error("ROUTING ENGINE ERROR:", error);

    return res.status(500).json({
      error: "Failed to gather item choices.",
    });
  }
});

export default router;
