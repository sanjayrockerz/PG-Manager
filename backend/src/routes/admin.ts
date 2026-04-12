import { Router } from "express";
import { db } from "../store/data.js";

export const adminRouter = Router();

adminRouter.get("/users", (_req, res) => {
  res.json({ users: db.adminUsers });
});

adminRouter.get("/support-tickets", (_req, res) => {
  res.json({ supportTickets: db.supportTickets });
});

adminRouter.get("/metrics", (_req, res) => {
  const totalUsers = db.adminUsers.length;
  const activeUsers = db.adminUsers.filter((entry) => entry.status === "active").length;
  const totalRevenue = db.adminUsers.reduce((sum, entry) => sum + entry.revenue, 0);
  const totalProperties = db.adminUsers.reduce((sum, entry) => sum + entry.properties, 0);
  const totalTenants = db.adminUsers.reduce((sum, entry) => sum + entry.tenants, 0);

  res.json({
    metrics: {
      totalUsers,
      activeUsers,
      totalRevenue,
      totalProperties,
      totalTenants,
    },
  });
});
