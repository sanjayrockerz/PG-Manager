import { Router } from "express";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { db } from "../store/data.js";
import { getTimestampedNote, getTodayIsoDate } from "../utils/date.js";
import { validateBody } from "../utils/validation.js";

const createTicketSchema = z.object({
  tenant: z.string().min(2),
  tenantId: z.string().optional(),
  propertyId: z.string().min(1),
  room: z.string().min(1),
  issue: z.string().min(2),
  description: z.string().min(5),
  priority: z.enum(["low", "medium", "high"]),
  source: z.enum(["whatsapp", "manual"]).optional().default("manual"),
  phone: z.string().optional(),
});

const statusSchema = z.object({
  status: z.enum(["open", "in-progress", "resolved"]),
});

const noteSchema = z.object({
  note: z.string().min(2),
});

export const maintenanceRouter = Router();

maintenanceRouter.get("/", (req, res) => {
  const propertyId = String(req.query.propertyId || "all");
  const status = String(req.query.status || "all");

  let data = db.maintenanceTickets;
  if (propertyId !== "all") {
    data = data.filter((entry) => entry.propertyId === propertyId);
  }

  if (status !== "all") {
    data = data.filter((entry) => entry.status === status);
  }

  const stats = {
    total: data.length,
    pending: data.filter((entry) => entry.status === "open").length,
    inProgress: data.filter((entry) => entry.status === "in-progress").length,
    completed: data.filter((entry) => entry.status === "resolved").length,
  };

  res.json({ maintenanceTickets: data, stats });
});

maintenanceRouter.post("/", validateBody(createTicketSchema), (req, res) => {
  const payload = req.body;

  const ticket = {
    id: uuidv4(),
    ticketId: `TKT${String(1000 + db.maintenanceTickets.length + 1).slice(-4)}`,
    tenantId: payload.tenantId,
    tenant: payload.tenant,
    propertyId: payload.propertyId,
    room: payload.room,
    issue: payload.issue,
    description: payload.description,
    source: payload.source,
    status: "open" as const,
    priority: payload.priority,
    date: getTodayIsoDate(),
    phone: payload.phone,
    notes: [],
  };

  db.maintenanceTickets.unshift(ticket);

  return res.status(201).json({ maintenanceTicket: ticket });
});

maintenanceRouter.patch("/:ticketId/status", validateBody(statusSchema), (req, res) => {
  const index = db.maintenanceTickets.findIndex((entry) => entry.id === req.params.ticketId);
  if (index < 0) {
    return res.status(404).json({ message: "Ticket not found" });
  }

  db.maintenanceTickets[index].status = req.body.status;
  return res.json({ maintenanceTicket: db.maintenanceTickets[index] });
});

maintenanceRouter.post("/:ticketId/notes", validateBody(noteSchema), (req, res) => {
  const ticket = db.maintenanceTickets.find((entry) => entry.id === req.params.ticketId);
  if (!ticket) {
    return res.status(404).json({ message: "Ticket not found" });
  }

  const note = getTimestampedNote(req.body.note);
  ticket.notes.push(note);

  return res.status(201).json({ note, maintenanceTicket: ticket });
});
