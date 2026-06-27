import express from "express";
import {
  forgotPassword,
  lookupResetEmail,
  resetPassword,
} from "../controllers/passwordResetController.js";

const router = express.Router();

router.post("/lookup-email", lookupResetEmail);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

export default router;
