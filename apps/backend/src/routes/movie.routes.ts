import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
  getMovieRows,
  searchMovies,
  getMovieBySlug,
  getMoviePlayback,
  getMovieReviews,
  createMovieReview,
  deleteMovieReview,
  rateMovie,
  getUserMovieRating
} from "../controllers/movie.controller.js";

const router = Router();

router.get("/rows", getMovieRows);
router.get("/search", searchMovies);
router.get("/:slug", getMovieBySlug);
router.get("/:id/playback", requireAuth, getMoviePlayback);

// Reviews & Ratings
router.get("/:id/reviews", getMovieReviews);
router.post("/:id/reviews", requireAuth, createMovieReview);
router.delete("/:id/reviews/:reviewId", requireAuth, deleteMovieReview);
router.post("/:id/ratings", requireAuth, rateMovie);
router.get("/:id/ratings/me", requireAuth, getUserMovieRating);

export default router;

