import cors from "cors";
import express from "express";
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

app.use(
  cors({
    origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
    credentials: true,
  }),
);
app.use(express.json({ limit: "2mb" }));
app.use("/uploads", express.static(path.resolve(__dirname, "../uploads")));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

const base = "/api/v1";
app.use(`${base}/auth`, authRouter);
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

app.use((_req, res) => {
  res.status(404).json({ message: "Route not found" });
});
