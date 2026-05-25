import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { announcementsRouter } from "./routes/announcements.js";
import { authRouter } from "./routes/auth.js";
import { dashboardRouter } from "./routes/dashboard.js";
import { maintenanceRouter } from "./routes/maintenance.js";
import { notificationsRouter } from "./routes/notifications.js";
import { paymentsRouter } from "./routes/payments.js";
import { propertiesRouter } from "./routes/properties.js";
import { settingsRouter } from "./routes/settings.js";
import { tenantsRouter } from "./routes/tenants.js";
import { adminRouter } from "./routes/admin.js";
import { uploadsRouter } from "./routes/uploads.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const app = express();

// ─── Security headers ─────────────────────────────────────────────────────────
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

// ─── CORS ─────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: ["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:5173"],
    credentials: true,
  }),
);

// ─── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: "2mb" }));

// ─── Static uploads ───────────────────────────────────────────────────────────
app.use("/uploads", express.static(path.resolve(__dirname, "../uploads")));

// ─── Health check (unauthenticated) ───────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// ─── API routes ───────────────────────────────────────────────────────────────
const base = "/api/v1";

// Auth routes are public (login/signup do not require prior auth)
app.use(`${base}/auth`, authRouter);

// All other routes are protected — middleware is applied per-router
app.use(`${base}/properties`, propertiesRouter);
app.use(`${base}/tenants`, tenantsRouter);
app.use(`${base}/payments`, paymentsRouter);
app.use(`${base}/maintenance`, maintenanceRouter);
app.use(`${base}/announcements`, announcementsRouter);
app.use(`${base}/settings`, settingsRouter);
app.use(`${base}/notifications`, notificationsRouter);
app.use(`${base}/dashboard`, dashboardRouter);
app.use(`${base}/admin`, adminRouter);
app.use(`${base}/uploads`, uploadsRouter);

// ─── 404 handler ─────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// ─── Global error handler ─────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[unhandled error]", err.message);
  res.status(500).json({ message: "An unexpected error occurred." });
});
