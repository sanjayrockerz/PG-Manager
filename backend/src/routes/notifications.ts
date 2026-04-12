import { Router } from "express";
import { db } from "../store/data.js";

export const notificationsRouter = Router();

notificationsRouter.get("/", (_req, res) => {
  const unreadCount = db.notifications.filter((entry) => !entry.read).length;
  res.json({ notifications: db.notifications, unreadCount });
});

notificationsRouter.patch("/:notificationId/read", (req, res) => {
  const item = db.notifications.find((entry) => entry.id === req.params.notificationId);
  if (!item) {
    return res.status(404).json({ message: "Notification not found" });
  }

  item.read = true;
  return res.json({ notification: item });
});

notificationsRouter.patch("/mark-all-read", (_req, res) => {
  db.notifications = db.notifications.map((entry) => ({ ...entry, read: true }));
  return res.json({ notifications: db.notifications });
});
