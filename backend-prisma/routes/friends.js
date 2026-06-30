import express from "express";
import { PrismaClient } from "@prisma/client";

const router = express.Router();
const prisma = new PrismaClient();

// ================= 1. SEARCH USERS =================

router.get("/search", async (req, res) => {
  try {
    const { query, currentUserId } = req.query;
    const cid = parseInt(currentUserId);

    if (!query) return res.json([]);

    // ✅ Only search CUSTOMER users
    const users = await prisma.user.findMany({
      where: {
        username: {
          contains: query,
        },

        role: "customer", // ✅ ONLY CUSTOMERS

        NOT: {
          id: cid, // don't show yourself
        },
      },
    });

    // ✅ Format image URL
    const usersWithFullImage = users.map((user) => ({
      ...user,
      profileImage: user.profileImage
        ? `${req.protocol}://${req.get("host")}${user.profileImage}`
        : null,
    }));

    res.json(usersWithFullImage);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ================= 2. GET FRIENDS =================
router.get("/:userId", async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);

    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
      include: {
        sender: true,
        receiver: true,
      },
    });

    const formatted = friendships.map((f) => {
      const isSender = f.senderId === userId;
      const friend = isSender ? f.receiver : f.sender;

      return {
        friendshipId: f.id,
        userId: friend.id,
        username: friend.username,
        profileImage: friend.profileImage
          ? `${req.protocol}://${req.get("host")}${friend.profileImage}`
          : null,
        status: f.status,
        amIReceiver: f.receiverId === userId,
      };
    });

    res.json(formatted);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Could not fetch friends" });
  }
});

// ================= 3. ADD FRIEND =================
router.post("/add", async (req, res) => {
  try {
    const { userId, friendId } = req.body;

    const newFriendship = await prisma.friendship.create({
      data: {
        senderId: Number(userId),
        receiverId: Number(friendId),
        status: "PENDING",
      },
    });

    const sender = await prisma.user.findUnique({
      where: { id: Number(userId) },
      select: {
        id: true,
        username: true,
      },
    });

    await prisma.notification.create({
      data: {
        userId: Number(friendId),

        senderId: sender.id,
        senderName: sender.username,

        type: "FRIEND_REQUEST",
        title: "Friend Request",
        message: `${sender.username} sent you a friend request`,
      },
    });

    res.json(newFriendship);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/accept", async (req, res) => {
  try {
    const { friendshipId } = req.body;

    const friendship = await prisma.friendship.findUnique({
      where: { id: Number(friendshipId) },
    });

    if (!friendship) {
      return res.status(404).json({
        error: "Friend request not found",
      });
    }

    await prisma.friendship.update({
      where: { id: Number(friendshipId) },
      data: {
        status: "ACCEPTED",
      },
    });

    const accepter = await prisma.user.findUnique({
      where: { id: friendship.receiverId },
      select: {
        id: true,
        username: true,
      },
    });

    await prisma.notification.create({
      data: {
        userId: friendship.senderId,

        senderId: accepter.id,
        senderName: accepter.username,

        type: "FRIEND_ACCEPTED",
        title: "Friend Accepted",
        message: `${accepter.username} accepted your friend request`,
      },
    });

    res.json({
      message: "Accepted",
    });
  } catch (e) {
    console.error("ACCEPT FRIEND ERROR:", e);
    res.status(500).json({
      error: e.message,
    });
  }
});

// ================= 5. DELETE =================
router.post("/delete", async (req, res) => {
  const { friendshipId } = req.body;

  try {
    await prisma.friendship.delete({
      where: {
        id: Number(friendshipId),
      },
    });

    res.status(200).json({ message: "Friendship deleted" });
  } catch (e) {
    console.error("Delete Error:", e.message);
    res.status(500).json({ error: "Record not found or already deleted" });
  }
});

export default router;
