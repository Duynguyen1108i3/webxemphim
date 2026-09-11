import { Router } from "express";
import {
  getCsrfToken,
  handleRegister,
  handleSendOtp,
  handleSendResetCode,
  handleVerifyResetCode,
  handleLogin,
  handleLogout,
  handleRefresh
} from "../controllers/auth.controller.js";

const router = Router();

router.get("/csrf", getCsrfToken);
router.post("/register", handleRegister);
router.post("/send-otp", handleSendOtp);
router.post("/send-reset-code", handleSendResetCode);
router.post("/verify-reset-code", handleVerifyResetCode);
router.post("/login", handleLogin);
router.post("/logout", handleLogout);
router.post("/refresh", handleRefresh);

export default router;
