import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
  getMovieRows,
  searchMovies,
  getMovieBySlug,
  getMoviePlayback
} from "../controllers/movie.controller.js";

const router = Router();

router.get("/rows", getMovieRows);
router.get("/search", searchMovies);
router.get("/:slug", getMovieBySlug);
router.get("/:id/playback", requireAuth, getMoviePlayback);

export default router;
