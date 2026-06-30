import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const createAdmin = async () => {
  const username = "amnaAdmin"; // your desired username
  const password = "12333"; // your desired password

  const hashedPassword = await bcrypt.hash(password, 10);

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    console.log("Admin already exists");
    return;
  }

  const user = await prisma.user.create({
    data: {
      username,
      email: "adminAmna@example.com", // optional
      password: hashedPassword,
      role: "admin",
    },
  });

  console.log("Admin created:", user);
};

createAdmin()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
