import express from "express";
import { PrismaClient } from "@prisma/client";
import { verifyToken } from "../middlewares/authMiddleware.js";

const prisma = new PrismaClient();
const router = express.Router();

// --- HELPERS ---
const normalize = (str) => (str ? str.trim().toLowerCase() : "");
const format = (str) =>
  str
    ? str.trim().charAt(0).toUpperCase() + str.trim().slice(1).toLowerCase()
    : "";

// ==========================================
// 1. STATIC GET ROUTES (Must be at the top)
// ==========================================

// ✅ GET ALL SAVED LISTS
router.get("/my-lists", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const lists = await prisma.list.findMany({
      where: { userId },
      include: { items: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(lists);
  } catch (err) {
    console.error("FETCH LISTS ERROR:", err);
    res.status(500).json({ message: "Could not retrieve lists" });
  }
});

// ✅ GET DATABASE ITEMS
router.get("/database", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const hiddenRecords = await prisma.hiddenItem.findMany({
      where: { userId },
      select: { itemId: true },
    });
    const hiddenItemIds = hiddenRecords.map((rec) => rec.itemId);

    const categories = await prisma.category.findMany({
      where: { OR: [{ userId }, { userId: null }] },
      include: {
        items: {
          where: {
            AND: [
              { OR: [{ userId }, { userId: null }] },
              { id: { notIn: hiddenItemIds } },
            ],
          },
        },
      },
      orderBy: { name: "asc" },
    });

    const cleaned = categories
      .map((cat) => ({
        id: cat.id,
        name: format(cat.name),
        items: cat.items.map((i) => ({
          id: i.id,
          name: i.name,
          isGlobal: i.userId === null,
        })),
      }))
      .filter((c) => c.items.length > 0);

    res.json(cleaned);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ GET FAVORITES
router.get("/favorites", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const favs = await prisma.favoriteItem.findMany({
      where: { userId },
      include: { item: { include: { category: true } } },
    });
    res.json(favs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ==========================================
// 2. POST ROUTES
// ==========================================

// ✅ SAVE NEW LIST
router.post("/save-list", verifyToken, async (req, res) => {
  try {
    const { name, items } = req.body;
    const userId = req.user.id;

    const newList = await prisma.list.create({
      data: {
        name,
        userId,
        items: {
          create: items.map((i) => ({
            name: i.name,
            quantity: i.quantity ? parseInt(i.quantity) : 1,
            specification:
              i.specification && i.specification.trim()
                ? i.specification.trim()
                : "None",
            categoryName: i.categoryName || "Uncategorized",
          })),
        },
      },
    });
    res.json(newList);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ ADD ITEM TO DATABASE
router.post("/add-item", verifyToken, async (req, res) => {
  try {
    const { name, category } = req.body;
    const userId = req.user.id;
    const cleanName = normalize(name);
    const cleanCategory = normalize(category);

    const existingItem = await prisma.item.findFirst({
      where: { name: cleanName, OR: [{ userId }, { userId: null }] },
      include: { category: true },
    });

    if (existingItem) {
      await prisma.hiddenItem.deleteMany({
        where: { userId, itemId: existingItem.id },
      });
      return res.json({
        id: existingItem.id,
        name: existingItem.name,
        categoryName: format(existingItem.category.name),
        alreadyExists: true,
      });
    }

    let cat = await prisma.category.findFirst({
      where: { name: cleanCategory, OR: [{ userId }, { userId: null }] },
    });

    if (!cat) {
      cat = await prisma.category.create({
        data: { name: cleanCategory, userId },
      });
    }

    const newItem = await prisma.item.create({
      data: { name: format(name), categoryId: cat.id, userId, isGlobal: false },
    });

    res.json({
      id: newItem.id,
      name: newItem.name,
      categoryName: format(cat.name),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ TOGGLE FAVORITE
router.post("/favorite", verifyToken, async (req, res) => {
  try {
    const { itemId } = req.body;
    const userId = req.user.id;
    const existing = await prisma.favoriteItem.findUnique({
      where: { userId_itemId: { userId, itemId } },
    });

    if (existing) {
      await prisma.favoriteItem.delete({
        where: { userId_itemId: { userId, itemId } },
      });
      return res.json({ removed: true });
    }

    const fav = await prisma.favoriteItem.create({ data: { userId, itemId } });
    res.json(fav);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ==========================================
// 3. DELETE ROUTES (Must be at the bottom)
// ==========================================

// ✅ DELETE/HIDE ITEM FROM DATABASE
router.delete("/item/:id", verifyToken, async (req, res) => {
  try {
    const itemId = parseInt(req.params.id);
    const userId = req.user.id;

    const item = await prisma.item.findUnique({ where: { id: itemId } });
    if (!item) return res.status(404).json({ message: "Item not found" });

    if (item.userId === userId) {
      await prisma.item.delete({ where: { id: itemId } });
      return res.json({ message: "Item deleted" });
    }

    if (item.userId === null) {
      await prisma.hiddenItem.upsert({
        where: { userId_itemId: { userId, itemId } },
        update: {},
        create: { userId, itemId },
      });
      return res.json({ message: "Global item hidden" });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ DELETE SAVED LIST
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const listId = parseInt(req.params.id);
    const userId = req.user.id;

    // 1. Delete all items inside this list first (The "Cascade")
    await prisma.listItem.deleteMany({
      where: { listId: listId },
    });

    // 2. Now delete the list itself
    const deletedList = await prisma.list.delete({
      where: {
        id: listId,
        userId: userId, // Safety check: only delete if it belongs to this user
      },
    });

    res.status(200).json({ message: "List and items deleted successfully" });
  } catch (error) {
    console.error("Delete Error:", error);
    res
      .status(500)
      .json({ message: "Failed to delete list", error: error.message });
  }
});

// ✅ BACKEND: Update list name
router.put("/:id", verifyToken, async (req, res) => {
  try {
    const listId = parseInt(req.params.id);
    const userId = req.user.id;
    const { name, items } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Update list name
      const updatedList = await tx.list.update({
        where: { id: listId, userId: userId },
        data: { name: name },
      });

      // 2. Delete existing items
      await tx.listItem.deleteMany({
        where: { listId: listId },
      });

      // 3. Re-create new items
      if (items && items.length > 0) {
        await tx.listItem.createMany({
          data: items.map((i) => ({
            listId: listId,
            name: i.name,
            quantity: i.quantity ? parseInt(i.quantity) : 1,
            specification:
              i.specification && i.specification.trim()
                ? i.specification.trim()
                : "None",
            categoryName: i.categoryName || "Uncategorized",
          })),
        });
      }
      return updatedList;
    });

    res.json(result);
  } catch (error) {
    console.error("BACKEND UPDATE ERROR:", error);
    res.status(500).json({ error: "Update failed", details: error.message });
  }
});

export default router;
