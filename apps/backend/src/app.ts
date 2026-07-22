import express from "express";
import { applySecurity } from "./middleware/security.js";
import { errorHandler, notFound } from "./middleware/error.js";
import authRoutes from "./routes/auth.routes.js";
import movieRoutes from "./routes/movie.routes.js";
import userRoutes from "./routes/user.routes.js";
import subscriptionRoutes from "./routes/subscription.routes.js";
import adminRoutes from "./routes/admin.routes.js";

export function createApp() {
  const app = express();
  applySecurity(app);
  app.get("/health", (_req, res) => res.json({ ok: true, service: "rytoxgroup-api" }));
  app.get("/api/health", (_req, res) => res.json({ ok: true, service: "rytoxgroup-api" }));
  app.use("/api/auth", authRoutes);
  app.use("/api/movies", movieRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/subscriptions", subscriptionRoutes);
  app.use("/api/admin", adminRoutes);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
