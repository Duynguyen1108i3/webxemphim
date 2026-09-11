import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
  validateProfileOwnership,
  getCurrentUser,
  updateAvatar,
  updateUsername,
  updatePassword,
  handleSendEmailOtp,
  updateEmail,
  deleteSelfAccount,
  getFavorites,
  addFavorite,
  removeFavorite,
  updateWatchProgress,
  getRecommendations
} from "../controllers/user.controller.js";

const router = Router();
router.use(requireAuth);

// Profile ownership validator middleware
router.use("/profiles/:profileId", validateProfileOwnership);

// Current user profile endpoints
router.get("/me", getCurrentUser);
router.put("/me/avatar", updateAvatar);
router.put("/me/username", updateUsername);
router.put("/me/password", updatePassword);
router.post("/me/send-email-otp", handleSendEmailOtp);
router.put("/me/email", updateEmail);
router.delete("/me", deleteSelfAccount);

// Profile My List (Favorites)
router.get("/profiles/:profileId/my-list", getFavorites);
router.post("/profiles/:profileId/my-list", addFavorite);
router.delete("/profiles/:profileId/my-list/:movieId", removeFavorite);

// Watch progress & recommendations
router.post("/profiles/:profileId/watch-progress", updateWatchProgress);
router.get("/profiles/:profileId/recommendations", getRecommendations);

export default router;
