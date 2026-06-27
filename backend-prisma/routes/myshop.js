import express from "express";
import { PrismaClient } from "@prisma/client";
import { verifyToken } from "../middlewares/authMiddleware.js";

const router = express.Router();
const prisma = new PrismaClient();

/*
====================================================
GET SHOP PROFILE
GET /api/my-shop-profile
====================================================
*/
router.get("/", verifyToken, async (req, res) => {
  try {
    const userId = Number(req.user.id);

    const shopkeeper = await prisma.shopkeeper.findUnique({
      where: { userId },
      include: {
        shopDetails: true,
      },
    });

    if (!shopkeeper) {
      return res.status(404).json({
        success: false,
        message: "Shopkeeper profile account could not be found.",
      });
    }

    if (!shopkeeper.shopDetails) {
      return res.status(200).json({
        success: false,
        profileExists: false,
        message: "First-time shop setup required.",
        shop: {
          shopName: shopkeeper.shopName || "",
          city: "",
          latitude: 31.464836,
          longitude: 74.28909,
          phone: "",
          timing: "",
          description: "",
        },
      });
    }

    return res.status(200).json({
      success: true,
      profileExists: true,
      message: "Shop profile details loaded successfully.",
      shop: shopkeeper.shopDetails,
    });
  } catch (error) {
    console.error("Error fetching shop profile:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error while fetching shop details.",
    });
  }
});

/*
====================================================
SAVE / UPDATE SHOP PROFILE
POST /api/my-shop-profile/update
====================================================
*/
router.post("/update", verifyToken, async (req, res) => {
  try {
    const userId = Number(req.user.id);

    const {
      shopName,
      city,
      latitude,
      longitude,
      phone,
      timing,
      description,
    } = req.body;

    if (
      !shopName ||
      !city ||
      latitude === undefined ||
      longitude === undefined
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Shop name, city, latitude, and longitude are required.",
      });
    }

    const parsedLat = Number(latitude);
    const parsedLng = Number(longitude);

    if (
      !Number.isFinite(parsedLat) ||
      !Number.isFinite(parsedLng)
    ) {
      return res.status(400).json({
        success: false,
        message: "Latitude and longitude must be valid numbers.",
      });
    }

    const shopkeeper = await prisma.shopkeeper.findUnique({
      where: {
        userId,
      },
    });

    if (!shopkeeper) {
      return res.status(404).json({
        success: false,
        message:
          "Shopkeeper profile not found for this user account.",
      });
    }

    const shop = await prisma.shopDetails.upsert({
      where: {
        shopkeeperId: shopkeeper.id,
      },
      update: {
        shopName: shopName.trim(),
        city: city.trim(),
        latitude: parsedLat,
        longitude: parsedLng,
        phone: phone?.trim() || "",
        timing: timing?.trim() || "",
        description: description?.trim() || "",
      },
      create: {
        shopkeeperId: shopkeeper.id,
        shopName: shopName.trim(),
        city: city.trim(),
        latitude: parsedLat,
        longitude: parsedLng,
        phone: phone?.trim() || "",
        timing: timing?.trim() || "",
        description: description?.trim() || "",
      },
    });

    return res.status(200).json({
      success: true,
      message: "Shop details successfully synchronized.",
      shop,
    });
  } catch (error) {
    console.error("Error saving shop details:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to save shop details due to server error.",
      error: error.message,
    });
  }
});

export default router;