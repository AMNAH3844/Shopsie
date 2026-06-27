import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const categoriesData = [
  { name: "Stationery", items: ["Pen", "Pencil", "Notebook", "Eraser", "Marker", "Ruler", "Highlighter", "Glue", "Stapler", "Scissors", "Folder", "Sharpener"] },
  { name: "Fruits", items: ["Apple", "Banana", "Orange", "Mango", "Grapes", "Watermelon", "Pineapple", "Strawberry", "Kiwi", "Papaya", "Blueberry"] },
  { name: "Vegetables", items: ["Tomato", "Onion", "Potato", "Carrot", "Cucumber", "Spinach", "Bell pepper", "Broccoli", "Cabbage", "Eggplant", "Lettuce"] },
  { name: "Snacks", items: ["Chips", "Cookies", "Nuts", "Popcorn", "Chocolate", "Crackers", "Pretzels", "Candy", "Granola bar", "Biscuits"] },
  { name: "Dairy", items: ["Milk", "Cheese", "Butter", "Yogurt", "Cream", "Paneer"] },
  { name: "Beverages", items: ["Water", "Tea", "Coffee", "Juice", "Soda", "Smoothie", "Energy drink", "Milkshake"] },
  { name: "Cleaning Supplies", items: ["Detergent", "Dish soap", "Floor cleaner", "Toilet cleaner", "Disinfectant", "Sponge", "Bleach", "Mop cleaner"] },
  { name: "Personal Care", items: ["Shampoo", "Soap", "Toothpaste", "Toothbrush", "Lotion", "Deodorant", "Razor", "Sanitizer"] },
  { name: "Makeup", items: ["Foundation", "Concealer", "Compact powder", "Blush", "Bronzer", "Highlighter", "Eyeshadow palette", "Eyeliner", "Mascara", "Eyebrow pencil", "Lipstick", "Lip gloss", "Lip liner", "Makeup brush", "Makeup remover", "Lip balm"] },
  { name: "Meat & Seafood", items: ["Chicken", "Beef", "Fish", "Mutton", "Lamb", "Salmon", "Shrimp", "Tuna"] },
  { name: "Grains & Cereals", items: ["Rice", "Wheat", "Flour", "Oats", "Barley", "Quinoa", "Cornmeal"] },
  { name: "Canned Goods", items: ["Beans", "Corn", "Tomato paste", "Soup", "Mushrooms"] },
  { name: "Condiments", items: ["Ketchup", "Mustard", "Mayonnaise", "Soy sauce", "Vinegar", "Hot sauce"] },
  { name: "Spices", items: ["Salt", "Pepper", "Cumin", "Turmeric", "Chili powder", "Coriander", "Oregano", "Basil"] },
  { name: "Bakery", items: ["Bread", "Bagel", "Croissant", "Muffin", "Cake", "Donut", "Brownie"] },
  { name: "Frozen Foods", items: ["Ice cream", "Frozen peas", "Frozen pizza", "Fish fingers", "Frozen vegetables"] },
  { name: "Baby Care", items: ["Diapers", "Baby wipes", "Baby lotion", "Baby powder", "Baby oil"] },
  { name: "Pet Supplies", items: ["Dog food", "Cat food", "Pet treats", "Pet shampoo"] },
  { name: "Electronics", items: ["Headphones", "Charger", "Cable", "Power bank", "USB drive", "Batteries", "Adapter"] },
  { name: "Household", items: ["Bucket", "Broom", "Mop", "Dustpan", "Trash bags", "Candle", "Vase"] },
  { name: "Office Supplies", items: ["Printer paper", "Envelope", "Paper clip", "Binder", "Ink cartridge"] },
  { name: "Clothing", items: ["T-shirt", "Jeans", "Jacket", "Socks", "Shorts", "Hoodie"] },
  { name: "Footwear", items: ["Sneakers", "Sandals", "Boots", "Slippers"] },
  { name: "Kitchen Tools", items: ["Knife", "Spoon", "Fork", "Plate", "Pan", "Pot", "Cutting board"] },
  { name: "Health Care", items: ["Bandage", "Pain reliever", "Thermometer", "First aid kit", "Antiseptic"] },
  { name: "Gardening", items: ["Soil", "Fertilizer", "Watering can", "Plant seeds", "Garden gloves"] }
];

async function main() {
  console.log("🚀 Starting Global Seed...");
  
  // Clean up existing data to avoid duplicates
  await prisma.listItem.deleteMany();
  await prisma.favoriteItem.deleteMany();
  await prisma.item.deleteMany();
  await prisma.category.deleteMany();

  for (const cat of categoriesData) {
    // 🔥 userId: null makes this category visible to EVERYONE
    const category = await prisma.category.create({
      data: {
        name: cat.name,
        userId: null, 
      },
    });

    console.log(`📦 Seeded Category: ${cat.name}`);

    for (const itemName of cat.items) {
      // 🔥 userId: null makes this item visible to EVERYONE
      // 🔥 isGlobal: true flags this as a master item
      await prisma.item.create({
        data: {
          name: itemName,
          userId: null,      
          categoryId: category.id,
          isGlobal: true,    
        },
      });
    }
  }

  console.log("✅ Global Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed Error:", e);
    process.exit(1);
  })
  .finally(async () => await prisma.$disconnect());