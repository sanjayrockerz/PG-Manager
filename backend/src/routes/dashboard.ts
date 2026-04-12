import { Router } from "express";
import { db } from "../store/data.js";

export const dashboardRouter = Router();

dashboardRouter.get("/stats", (req, res) => {
  const propertyId = String(req.query.propertyId || "all");

  const tenants = propertyId === "all"
    ? db.tenants
    : db.tenants.filter((entry) => entry.propertyId === propertyId);
  const rooms = propertyId === "all"
    ? db.rooms
    : db.rooms.filter((entry) => entry.propertyId === propertyId);
  const payments = propertyId === "all"
    ? db.payments
    : db.payments.filter((entry) => entry.propertyId === propertyId);
  const maintenance = propertyId === "all"
    ? db.maintenanceTickets
    : db.maintenanceTickets.filter((entry) => entry.propertyId === propertyId);

  const occupiedRooms = rooms.filter((entry) => entry.status === "occupied").length;
  const totalRooms = rooms.length || 1;

  const monthlyRevenue = payments
    .filter((entry) => entry.status === "paid")
    .reduce((sum, entry) => sum + entry.totalAmount, 0);

  const pendingAmount = payments
    .filter((entry) => entry.status === "pending" || entry.status === "overdue")
    .reduce((sum, entry) => sum + entry.totalAmount, 0);

  const recentPayments = [...payments].slice(0, 5);
  const recentMaintenance = [...maintenance].slice(0, 5);

  return res.json({
    stats: {
      totalTenants: tenants.filter((entry) => entry.status === "active").length,
      occupiedRooms,
      totalRooms,
      occupancyRate: Math.round((occupiedRooms / totalRooms) * 100),
      monthlyRevenue,
      pendingAmount,
      pendingIssues: maintenance.filter((entry) => entry.status === "open").length,
    },
    recentPayments,
    recentMaintenance,
  });
});
