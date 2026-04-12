import { Router } from "express";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { db } from "../store/data.js";
import { getTodayIsoDate } from "../utils/date.js";
import { validateBody } from "../utils/validation.js";

const announcementSchema = z.object({
  propertyId: z.string().optional().default("all"),
  title: z.string().min(2),
  content: z.string().min(4),
  category: z.enum(["maintenance", "payment", "rules", "general"]),
  isPinned: z.boolean().optional().default(false),
  sendViaWhatsApp: z.boolean().optional().default(false),
});

const updateSchema = announcementSchema.partial();

export const announcementsRouter = Router();

announcementsRouter.get("/", (req, res) => {
  const category = String(req.query.category || "all");
  const propertyId = String(req.query.propertyId || "all");

  let data = db.announcements;

  if (category !== "all") {
    data = data.filter((entry) => entry.category === category);
  }

  if (propertyId !== "all") {
    data = data.filter((entry) => entry.propertyId === "all" || entry.propertyId === propertyId);
  }

  data = [...data].sort((a, b) => Number(b.isPinned) - Number(a.isPinned));

  res.json({ announcements: data });
});

announcementsRouter.post("/", validateBody(announcementSchema), (req, res) => {
  const payload = req.body;

  const announcement = {
    id: uuidv4(),
    propertyId: payload.propertyId,
    title: payload.title,
    content: payload.content,
    date: getTodayIsoDate(),
    category: payload.category,
    isPinned: payload.isPinned,
    views: 0,
    sentViaWhatsApp: payload.sendViaWhatsApp,
  };

  db.announcements.unshift(announcement);

  return res.status(201).json({ announcement });
});

announcementsRouter.put("/:announcementId", validateBody(updateSchema), (req, res) => {
  const index = db.announcements.findIndex((entry) => entry.id === req.params.announcementId);
  if (index < 0) {
    return res.status(404).json({ message: "Announcement not found" });
  }

  const payload = req.body;

  db.announcements[index] = {
    ...db.announcements[index],
    ...payload,
    sentViaWhatsApp:
      payload.sendViaWhatsApp !== undefined
        ? payload.sendViaWhatsApp
        : db.announcements[index].sentViaWhatsApp,
  };

  return res.json({ announcement: db.announcements[index] });
});

announcementsRouter.patch("/:announcementId/pin", (req, res) => {
  const item = db.announcements.find((entry) => entry.id === req.params.announcementId);
  if (!item) {
    return res.status(404).json({ message: "Announcement not found" });
  }

  item.isPinned = !item.isPinned;
  return res.json({ announcement: item });
});

announcementsRouter.delete("/:announcementId", (req, res) => {
  const exists = db.announcements.some((entry) => entry.id === req.params.announcementId);
  if (!exists) {
    return res.status(404).json({ message: "Announcement not found" });
  }

  db.announcements = db.announcements.filter((entry) => entry.id !== req.params.announcementId);
  return res.status(204).send();
});
