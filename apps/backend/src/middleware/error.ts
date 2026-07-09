import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { logger } from "../lib/logger.js";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code = "API_ERROR"
  ) {
    super(message);
  }
}

export function notFound(req: Request, _res: Response, next: NextFunction) {
  next(new ApiError(404, `Route ${req.method} ${req.path} was not found`, "NOT_FOUND"));
}

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof ZodError) {
    return res.status(422).json({ error: { code: "VALIDATION_ERROR", message: "Invalid request", details: error.flatten() } });
  }
  if (error instanceof ApiError) {
    return res.status(error.status).json({ error: { code: error.code, message: error.message } });
  }
  logger.error("Unhandled API error", { error });
  return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Unexpected server error" } });
}
