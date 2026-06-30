import express from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import upload from "../middlewares/multer.js";
import { verifyToken } from "../middlewares/authMiddleware.js";

const prisma = new PrismaClient();
const router = express.Router();

//
// ====================== ADMIN MIDDLEWARE ======================
//
const verifyAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access only" });
  }
  next();
};

//
// ====================== SIGNUP ======================
//
router.post(
  "/signup",
  upload.fields([
    { name: "cnicFront", maxCount: 1 },
    { name: "cnicBack", maxCount: 1 },
    { name: "vehicleDoc", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const { username, email, password, role, phoneNo, shopName } = req.body;

      if (!username || !email || !password || !role) {
        return res.status(400).json({ message: "Required fields missing" });
      }

      const existingUser = await prisma.user.findFirst({
        where: { OR: [{ username }, { email }] },
      });

      if (existingUser) {
        return res.status(409).json({ message: "Username or email exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const newUser = await prisma.user.create({
        data: { username, email, password: hashedPassword, role },
      });

      if (role === "customer") {
        await prisma.customer.create({ data: { userId: newUser.id } });
      }

      else if (role === "shopkeeper") {
        if (!shopName) {
          await prisma.user.delete({ where: { id: newUser.id } });
          return res.status(400).json({ message: "Shop Name required" });
        }

        await prisma.shopkeeper.create({
          data: { userId: newUser.id, shopName },
        });
      }

      else if (role === "rider") {
        if (!phoneNo) {
          await prisma.user.delete({ where: { id: newUser.id } });
          return res.status(400).json({ message: "Phone number required" });
        }

        const cnicFrontFile = req.files?.cnicFront?.[0];
        const cnicBackFile = req.files?.cnicBack?.[0];
        const vehicleDocFile = req.files?.vehicleDoc?.[0];

        if (!cnicFrontFile || !cnicBackFile || !vehicleDocFile) {
          await prisma.user.delete({ where: { id: newUser.id } });
          return res.status(400).json({ message: "All rider documents required" });
        }

        await prisma.rider.create({
          data: {
            userId: newUser.id,
            phoneNo,
            cnicFrontPhoto: cnicFrontFile.filename,
            cnicBackPhoto: cnicBackFile.filename,
            vehicleDocument: vehicleDocFile.filename,
            status: "pending",
          },
        });

      const admins = await prisma.user.findMany({
  where: { role: "admin" },
});

await prisma.notification.createMany({
  data: admins.map(admin => ({
    userId: admin.id,
    type: "RIDER_REQUEST",
    title: "New Rider Request",
    message: `${newUser.username} submitted rider documents`,
  })),
});
      }

      const token = jwt.sign(
        { id: newUser.id, role: newUser.role },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      return res.status(201).json({
        message: "Signup successful",
        token,
        user: {
          id: newUser.id,
          username: newUser.username,
          role: newUser.role,
          isSuspended: false,
        },
      });

    } catch (error) {
      console.error("Signup error:", error);
      return res.status(500).json({ message: "Server error" });
    }
  }
);

//
// ====================== SIGNIN ======================
// signin route inside auth.js
router.post("/signin", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password)
      return res.status(400).json({ message: "Username and password required" });

    const user = await prisma.user.findUnique({ 
      where: { username },
      include: {
        shopkeeper: true // 💡 Fetch associated shopkeeper baseline data on login
      }
    });
    
   if (!user) {
  return res.status(401).json({
    message: "Incorrect username or password",
  });
}

const match = await bcrypt.compare(
  password,
  user.password
);

if (!match) {
  return res.status(401).json({
    message: "Incorrect username or password",
  });
}

    // Rider approval check
if (user.role === "rider") {
  const rider = await prisma.rider.findUnique({
    where: { userId: user.id },
  });

  if (!rider) {
    return res.status(400).json({
      message: "Rider profile missing",
    });
  }

  if (rider.status === "pending") {
    return res.status(403).json({
      message:
        "Your account is under approval process. Please wait for admin approval.",
    });
  }

  if (rider.status === "rejected") {
    return res.status(403).json({
      message:
        "Your rider account has been rejected.",
    });
  }
}

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });

    let profileImageUrl = user.profileImage
      ? `${req.protocol}://${req.get("host")}${user.profileImage}`
      : null;

    // Determine the baseline shopName if the role matches
    const registrationShopName = user.role === "shopkeeper" ? user.shopkeeper?.shopName : null;

    return res.status(200).json({
      message: "Signin successful",
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        profileImage: profileImageUrl,
        email: user.email || null,
        shopName: registrationShopName, // 🔥 Pass registration name down to mobile storage!
        isSuspended: user.role === "shopkeeper" ? Boolean(user.shopkeeper?.isSuspended) : false,
        suspensionReason: user.role === "shopkeeper" ? user.shopkeeper?.suspensionReason || null : null,
      },
    });

  } catch (err) {
    console.error("Signin error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

//
router.get("/check-username", async (req, res) => {
  const { username } = req.query;

  if (!username) return res.json({ available: false });

  const user = await prisma.user.findUnique({
    where: { username },
  });

  res.json({ available: !user });
});

// ====================== ADMIN ROUTES ======================
//

// STATS
router.get("/admin/stats", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const totalUsers = await prisma.user.count();
    const totalCustomers = await prisma.customer.count();
    const totalShopkeepers = await prisma.shopkeeper.count();
    const pendingRiders = await prisma.rider.count({
      where: { status: "pending" },
    });

    res.json({ totalUsers, totalCustomers, totalShopkeepers, pendingRiders });
  } catch {
    res.status(500).json({ message: "Server error fetching stats" });
  }
});
// PENDING RIDERS
// ====================== GET PENDING RIDERS (ADMIN) ======================
router.get(
  "/admin/pending-riders",
  verifyToken,
  verifyAdmin,
  async (req, res) => {
    try {
      const riders = await prisma.rider.findMany({
        where: { status: "pending" },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
        },
      });

      res.json(riders);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  }
);
// UPDATE RIDER STATUS
router.put("/admin/update-rider/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const riderId = parseInt(req.params.id);
    const { status } = req.body;

    // Find the rider first
    const rider = await prisma.rider.findUnique({
      where: { id: riderId },
      include: { user: true }, // Include the user info
    });

    if (!rider) return res.status(404).json({ message: "Rider not found" });

   if (status === "approved") {

  await prisma.rider.update({
    where: { id: riderId },
    data: { status: "approved" },
  });

  const admins = await prisma.user.findMany({
  where: { role: "admin" },
});

 await prisma.notification.createMany({
  data: admins.map(admin => ({
    userId: admin.id,
    type: "RIDER_APPROVED",
    title: "Rider Approved",
    message: `${rider.user.username} was approved`,
  })),
});

  return res.json({
    message: "Rider approved successfully"
  });
} else if (status === "rejected") {

const admins = await prisma.user.findMany({
  where: { role: "admin" },
});

  await prisma.notification.createMany({
  data: admins.map(admin => ({
    userId: admin.id,
    type: "RIDER_REJECTED",
    title: "Rider Rejected",
    message: `${rider.user.username} was rejected`,
  })),
});

  await prisma.rider.delete({
    where: { id: riderId },
  });

  await prisma.user.delete({
    where: { id: rider.userId },
  });

  return res.json({
    message: "Rider rejected and removed successfully",
  });
}
    else {
      return res.status(400).json({ message: "Invalid status" });
    }
    
  } catch (err) {
    console.error("Update rider error:", err);
    res.status(500).json({ message: "Error updating rider" });
  }
});

// USERS
router.get("/admin/users", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, username: true, email: true, role: true, profileImage: true },
    });

    const usersWithProfileImages = users.map((user) => ({
      ...user,
      profileImage: user.profileImage
        ? `${req.protocol}://${req.get("host")}${user.profileImage}`
        : null,
    }));

    res.json(usersWithProfileImages);
  } catch {
    res.status(500).json({ message: "Server error fetching users" });
  }
});

router.get("/admin/shop-reports", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const reports = await prisma.shopReport.findMany({
      include: {
        reporter: { select: { id: true, username: true, email: true, role: true } },
        shopkeeper: {
          include: {
            user: { select: { id: true, username: true, email: true } },
            shopDetails: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(reports);
  } catch (err) {
    console.error("Admin shop reports error:", err);
    res.status(500).json({ message: "Server error fetching shop reports" });
  }
});

router.get("/admin/shop-report-warnings", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const grouped = await prisma.shopReport.groupBy({
      by: ["shopkeeperId"],
      where: { title: "SHOP_DOES_NOT_EXIST" },
      _count: { id: true },
    });

    const warnings = grouped.filter((item) => item._count.id >= 5);
    const shopkeeperIds = warnings.map((item) => item.shopkeeperId);
    const shopkeepers = shopkeeperIds.length
      ? await prisma.shopkeeper.findMany({
          where: { id: { in: shopkeeperIds } },
          include: {
            user: { select: { id: true, username: true, email: true } },
            shopDetails: true,
          },
        })
      : [];

    res.json(
      warnings.map((item) => ({
        shopkeeperId: item.shopkeeperId,
        count: item._count.id,
        shopkeeper: shopkeepers.find((shop) => shop.id === item.shopkeeperId) || null,
      }))
    );
  } catch (err) {
    console.error("Admin report warnings error:", err);
    res.status(500).json({ message: "Server error fetching report warnings" });
  }
});

router.patch("/admin/shopkeepers/:id/suspend", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const reason = String(req.body?.reason || "").trim();

    if (!reason) {
      return res.status(400).json({ message: "Suspension reason is required" });
    }

    if (reason.length > 800) {
      return res.status(400).json({ message: "Suspension reason must be 800 characters or less" });
    }

    const shopkeeper = await prisma.shopkeeper.findUnique({
  where: { id: Number(req.params.id) },
  include: { user: true },
});

if (!shopkeeper) {
  return res.status(404).json({
    message: "Shopkeeper not found",
  });
}

    await prisma.$transaction(async (tx) => {
      await tx.shopkeeper.update({
        where: { id: shopkeeper.id },
        data: {
          isSuspended: true,
          suspensionReason: reason,
          suspendedAt: new Date(),
          revertRequestedAt: null,
        },
      });

      await tx.notification.create({
  data: {
    userId: shopkeeper.userId,
    senderId: req.user.id,
    senderName: "Admin",
    relatedShopkeeperId: shopkeeper.id,

    type: "SHOP_SUSPENDED",

    title: "Shop Suspended",

    message: JSON.stringify({
      reason,
      status: "NONE",
    }),
  },
});
    });

    res.json({ message: "Shopkeeper account suspended and hidden" });
  } catch (err) {
    console.error("Suspend shopkeeper error:", err);
    res.status(500).json({ message: "Server error suspending shopkeeper" });
  }
});


router.patch("/shopkeepers/:id/request-revert", async (req, res) => {
  try {
    const shopkeeper = await prisma.shopkeeper.findUnique({
      where: { id: Number(req.params.id) }
    });

    if (!shopkeeper || !shopkeeper.isSuspended) {
      return res.status(400).json({ message: "Invalid request" });
    }

    await prisma.shopkeeper.update({
      where: { id: shopkeeper.id },
      data: {
        revertRequestedAt: new Date(),
      },
    });

    const latestSuspension =
  await prisma.notification.findFirst({
    where: {
      userId: shopkeeper.userId,
      type: "SHOP_SUSPENDED",
    },
    orderBy: {
      createdAt: "desc",
    },
  });

if (latestSuspension) {
  const parsed =
    JSON.parse(latestSuspension.message);

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

    res.json({ message: "Revert request sent" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.patch("/admin/shopkeepers/:id/approve-revert", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const requestId = Number(req.params.id);

    if (!Number.isInteger(requestId) || requestId <= 0) {
      return res.status(400).json({ message: "Invalid shopkeeper id" });
    }

    const shopkeeper = await prisma.shopkeeper.findUnique({
      where: { id: requestId },
      include: { user: true },
    }) || await prisma.shopkeeper.findUnique({
      where: { userId: requestId },
      include: { user: true },
    });

    if (!shopkeeper) {
      return res.status(404).json({ message: "Shopkeeper not found" });
    }
   
    if (!shopkeeper.isSuspended) {
      return res.status(400).json({ message: "Shopkeeper is not suspended" });
    }

    // ✅ FIXED: safe handling (NO HARD FAIL)
    if (!shopkeeper.revertRequestedAt) {
      return res.status(400).json({
        message: "No revert request found",
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.shopkeeper.update({
        where: { id: shopkeeper.id },
        data: {
          isSuspended: false,
          suspensionReason: null,
          suspendedAt: null,

          // ✅ reset properly
          revertRequestedAt: null,
        },
      });

      const latestSuspension =
  await tx.notification.findFirst({
    where: {
      userId: shopkeeper.userId,
      type: "SHOP_SUSPENDED",
    },
    orderBy: {
      createdAt: "desc",
    },
  });

if (latestSuspension) {
  const parsed =
    JSON.parse(latestSuspension.message);

  await tx.notification.update({
    where: {
      id: latestSuspension.id,
    },
    data: {
      message: JSON.stringify({
        ...parsed,
        status: "APPROVED",
      }),
    },
  });
}

      await tx.notification.create({
        data: {
          userId: shopkeeper.userId,
          senderId: req.user.id,
          senderName: "Admin",
          relatedShopkeeperId: shopkeeper.id,
          type: "SHOP_REVERT_APPROVED",
          title: "Shop Restored",
          message: "Your shop is now visible again.",
        },
      });

      await tx.notification.updateMany({
  where: {
    type: "SHOP_REVERT_REQUEST",
    relatedShopkeeperId: shopkeeper.id,
    isRead: false,
  },
  data: {
    isRead: true,
    type: "SHOP_REVERT_REQUEST_APPROVED",
  },
});
    });

    return res.json({ message: "Shopkeeper restored successfully" });
  } catch (err) {
    console.error("approve-revert error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

router.patch("/admin/shopkeepers/:id/reject-revert", async (req, res) => {
  try {
    const shopkeeper = await prisma.shopkeeper.findUnique({
      where: { id: Number(req.params.id) },
      include: { user: true },
    });

    if (!shopkeeper) {
      return res.status(404).json({
        message: "Shopkeeper not found",
      });
    }

    if (!shopkeeper.revertRequestedAt) {
      return res.status(400).json({
        message: "No revert request found",
      });
    }

    await prisma.shopkeeper.update({
      where: { id: shopkeeper.id },
      data: {
        revertRequestedAt: null,
        revertMessage: null,
      },
    });

    const latestSuspension =
  await prisma.notification.findFirst({
    where: {
      userId: shopkeeper.userId,
      type: "SHOP_SUSPENDED",
    },
    orderBy: {
      createdAt: "desc",
    },
  });

if (latestSuspension) {
  const parsed =
    JSON.parse(latestSuspension.message);

  await prisma.notification.update({
    where: {
      id: latestSuspension.id,
    },
    data: {
      message: JSON.stringify({
        ...parsed,
        status: "REJECTED",
      }),
    },
  });
}

    await prisma.notification.create({
      data: {
        userId: shopkeeper.userId,
        senderName: "Admin",
        relatedShopkeeperId: shopkeeper.id,
        type: "SHOP_REVERT_REJECTED",
        title: "Revert Request Rejected",
        message:
          "Your shop restoration request has been rejected by the admin.",
      },
    });

    await prisma.notification.updateMany({
  where: {
    type: "SHOP_REVERT_REQUEST",
    relatedShopkeeperId: shopkeeper.id,
    isRead: false,
  },
  data: {
    isRead: true,
    type: "SHOP_REVERT_REQUEST_REJECTED",
  },
});

    return res.json({
      message: "Revert request rejected",
    });
  } catch (err) {
    console.error("reject revert error:", err);
    return res.status(500).json({
      message: "Server error",
    });
  }
});

// CREATE ADMIN
router.post("/admin/create-admin", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { username, password } = req.body;

    const existing = await prisma.user.findFirst({
      where: { username },
    });

    if (existing) {
      return res.status(400).json({ message: "Admin already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newAdmin = await prisma.user.create({
      data: {
        username,
        email: `${username}@admin.com`,
        password: hashedPassword,
        role: "admin",
      },
    });

    const admins = await prisma.user.findMany({
  where: { role: "admin" },
});

await prisma.notification.createMany({
  data: admins.map(admin => ({
    userId: admin.id,
    type: "ADMIN_CREATED",
    title: "Admin Created",
    message: `${newAdmin.username} was added as admin`,
  })),
});

    res.status(201).json({
      message: "Admin created successfully",
      admin: { id: newAdmin.id, username: newAdmin.username },
    });
  } catch {
    res.status(500).json({ message: "Server error creating admin" });
  }
});

// REMOVE ADMIN
router.delete("/admin/remove-admin/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const adminId = parseInt(req.params.id);

    if (req.user.id === adminId) {
      return res.status(400).json({ message: "You cannot delete yourself" });
    }

const adminToRemove = await prisma.user.findUnique({
  where: { id: adminId },
});

if (!adminToRemove) {
  return res.status(404).json({
    message: "Admin not found",
  });
}

const admins = await prisma.user.findMany({
  where: { role: "admin" },
});

await prisma.notification.createMany({
  data: admins.map(admin => ({
    userId: admin.id,
    type: "ADMIN_REMOVED",
    title: "Admin Removed",
    message: `${adminToRemove.username} was removed`,
  })),
});

    await prisma.user.delete({ where: { id: adminId } });

    res.json({ message: "Admin removed successfully" });
  } catch {
    res.status(500).json({ message: "Server error removing admin" });
  }
});

router.get(
  "/admin/notifications",
  verifyToken,
  verifyAdmin,
  async (req, res) => {
    try {
      const notifications =
        await prisma.notification.findMany({
          where: {
            userId: req.user.id,
          },
          orderBy: {
            createdAt: "desc",
          },
        });

      const senderIds = [
        ...new Set(
          notifications
            .filter(
              (notification) =>
                notification.type === "SHOP_REVERT_REQUEST" &&
                !notification.relatedShopkeeperId &&
                notification.senderId
            )
            .map((notification) => notification.senderId)
        ),
      ];

      const shopkeepers = senderIds.length
        ? await prisma.shopkeeper.findMany({
            where: { userId: { in: senderIds } },
            select: { id: true, userId: true },
          })
        : [];

      const shopkeeperIdByUserId = new Map(
        shopkeepers.map((shopkeeper) => [shopkeeper.userId, shopkeeper.id])
      );

      res.json(
        notifications.map((notification) => ({
          ...notification,
          relatedShopkeeperId:
            notification.relatedShopkeeperId ||
            shopkeeperIdByUserId.get(notification.senderId) ||
            null,
        }))
      );
    } catch (err) {
      console.error(err);
      res.status(500).json({
        message: "Failed to load notifications",
      });
    }
  }
);

router.patch(
  "/admin/notifications/read-all",
  verifyToken,
  verifyAdmin,
  async (req, res) => {
    try {
      await prisma.notification.updateMany({
  where: {
    userId: req.user.id,
    isRead: false,
  },
  data: {
    isRead: true,
  },
});

      res.json({
        success: true,
      });
    } catch (err) {
      console.error(err);

      res.status(500).json({
        message: "Failed",
      });
    }
  }
);

router.get(
  "/admin/report-notification-count",
  verifyToken,
  verifyAdmin,
  async (req, res) => {
    try {
      const count = await prisma.adminNotification.count({
        where: {
          type: "SHOP_REPORT",
          isRead: false,
        },
      });

      res.json({ count });
    } catch (err) {
      console.error(err);
      res.status(500).json({
        message: "Failed to get report count",
      });
    }
  }
);

router.patch(
  "/admin/report-notifications/read-all",
  verifyToken,
  verifyAdmin,
  async (req, res) => {
    try {
      await prisma.adminNotification.updateMany({
        where: {
          type: "SHOP_REPORT",
          isRead: false,
        },
        data: {
          isRead: true,
        },
      });

      res.json({
        success: true,
      });
    } catch (err) {
      console.error(err);

      res.status(500).json({
        message: "Failed",
      });
    }
  }
);

export default router; 
