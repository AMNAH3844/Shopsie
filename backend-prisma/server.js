import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

import authRoutes from "./routes/auth.js";
import shopkeeperRoutes from "./routes/shopkeeper.js";
import settingsRoutes from "./routes/settings.js";
import listRoutes from "./routes/list.js";
import friendsRoutes from "./routes/friends.js";
import inboxRoutes from "./routes/inbox.js";
import chatRoutes from "./routes/chat.js";
import downloadsRoutes from "./routes/downloads.js";
import shareRoutes from "./routes/share.js";
import shopRoutes from "./routes/myshop.js";
import routeOptimizerRouter from "./routes/routeOptimizer.js";
import riderRoutes from "./routes/rider.js";
import riderOptimizer from "./routes/riderOptimizer.js";
import passwordResetRoutes from "./routes/passwordReset.js";
import notificationsRoutes from "./routes/notifications.js";
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(uploadDir));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/password", passwordResetRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/list", listRoutes);
app.use("/api/friends", friendsRoutes);
app.use("/api/inbox", inboxRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/downloads", downloadsRoutes);
app.use("/api/share", shareRoutes);
app.use("/api/rider", riderRoutes);
app.use("/api/rider-optimizer", riderOptimizer);
app.use("/api/riderOptimizer", riderOptimizer);

app.use("/api/shopkeeper", shopkeeperRoutes);
app.use("/api/my-shop-profile", shopRoutes);

app.use("/api/route-optimize", routeOptimizerRouter);
app.use("/api/notifications", notificationsRoutes);
// Test route
app.get("/", (req, res) => {
  res.send("✅ API Running");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
});
