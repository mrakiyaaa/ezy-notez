import { Router } from "express";
import {
  getCurrentUser,
  requestOtp,
  updateProfile,
  verifyOtp,
} from "../controllers/auth.controller";
import { authenticateUser } from "../middleware/auth.middleware";

const router = Router();

router.post("/request-otp", requestOtp);
router.post("/verify-otp", verifyOtp);
router.get("/me", authenticateUser, getCurrentUser);
router.put("/update-profile", authenticateUser, updateProfile);

export default router;
