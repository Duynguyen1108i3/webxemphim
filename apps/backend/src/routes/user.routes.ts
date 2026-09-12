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
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUserSubscription,
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

// Notifications & Subscription
router.get("/me/notifications", getUserNotifications);
router.patch("/me/notifications/:id/read", markNotificationAsRead);
router.post("/me/notifications/mark-all-read", markAllNotificationsAsRead);
router.get("/me/subscription", getUserSubscription);


// Profile My List (Favorites)
router.get("/profiles/:profileId/my-list", getFavorites);
router.post("/profiles/:profileId/my-list", addFavorite);
router.delete("/profiles/:profileId/my-list/:movieId", removeFavorite);

// Watch progress & recommendations
router.post("/profiles/:profileId/watch-progress", updateWatchProgress);
router.get("/profiles/:profileId/recommendations", getRecommendations);

export default router;
