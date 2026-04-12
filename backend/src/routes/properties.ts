import { Router } from "express";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { db } from "../store/data.js";
import { Room } from "../types/entities.js";
import { getTodayIsoDate } from "../utils/date.js";
import { validateBody } from "../utils/validation.js";

const propertyCreateSchema = z.object({
  ownerId: z.string().optional().default("owner-1"),
  name: z.string().min(2),
  address: z.string().min(5),
  city: z.string().min(2),
  state: z.string().min(2),
  pincode: z.string().min(4),
  floors: z.number().int().min(1),
  totalRooms: z.number().int().min(0).optional().default(0),
  contactName: z.string().min(2),
  contactPhone: z.string().min(8),
  contactEmail: z.string().email(),
});

const propertyUpdateSchema = propertyCreateSchema.partial();

const roomSchema = z.object({
  number: z.string().min(1),
  floor: z.number().int().min(1),
  type: z.enum(["single", "double", "triple"]),
  beds: z.number().int().min(1),
  rent: z.number().min(0),
  status: z.enum(["occupied", "vacant", "maintenance"]),
  occupiedBeds: z.number().int().min(0).optional().default(0),
});

const roomUpdateSchema = roomSchema.partial();

function hydrateProperties() {
  return db.properties.map((property) => ({
    ...property,
    rooms: db.rooms.filter((room) => room.propertyId === property.id),
  }));
}

export const propertiesRouter = Router();

propertiesRouter.get("/", (_req, res) => {
  res.json({ properties: hydrateProperties() });
});

propertiesRouter.post("/", validateBody(propertyCreateSchema), (req, res) => {
  const payload = req.body;
  const property = {
    id: `prop-${Date.now()}`,
    createdAt: getTodayIsoDate(),
    ...payload,
  };

  db.properties.push(property);
  res.status(201).json({ property: { ...property, rooms: [] } });
});

propertiesRouter.put("/:propertyId", validateBody(propertyUpdateSchema), (req, res) => {
  const { propertyId } = req.params;
  const index = db.properties.findIndex((entry) => entry.id === propertyId);

  if (index < 0) {
    return res.status(404).json({ message: "Property not found" });
  }

  db.properties[index] = {
    ...db.properties[index],
    ...req.body,
  };

  const property = db.properties[index];
  return res.json({ property: { ...property, rooms: db.rooms.filter((room) => room.propertyId === property.id) } });
});

propertiesRouter.delete("/:propertyId", (req, res) => {
  const { propertyId } = req.params;
  const exists = db.properties.some((entry) => entry.id === propertyId);
  if (!exists) {
    return res.status(404).json({ message: "Property not found" });
  }

  db.properties = db.properties.filter((entry) => entry.id !== propertyId);
  db.rooms = db.rooms.filter((room) => room.propertyId !== propertyId);
  db.tenants = db.tenants.filter((tenant) => tenant.propertyId !== propertyId);
  db.payments = db.payments.filter((payment) => payment.propertyId !== propertyId);
  db.maintenanceTickets = db.maintenanceTickets.filter((ticket) => ticket.propertyId !== propertyId);

  return res.status(204).send();
});

propertiesRouter.post("/:propertyId/rooms", validateBody(roomSchema), (req, res) => {
  const { propertyId } = req.params;
  const property = db.properties.find((entry) => entry.id === propertyId);
  if (!property) {
    return res.status(404).json({ message: "Property not found" });
  }

  const payload = req.body;
  const room: Room = {
    id: uuidv4(),
    propertyId,
    ...payload,
  };

  db.rooms.push(room);
  property.totalRooms = db.rooms.filter((entry) => entry.propertyId === propertyId).length;

  return res.status(201).json({ room });
});

propertiesRouter.put(
  "/:propertyId/rooms/:roomId",
  validateBody(roomUpdateSchema),
  (req, res) => {
    const { propertyId, roomId } = req.params;
    const roomIndex = db.rooms.findIndex((entry) => entry.id === roomId && entry.propertyId === propertyId);

    if (roomIndex < 0) {
      return res.status(404).json({ message: "Room not found" });
    }

    db.rooms[roomIndex] = {
      ...db.rooms[roomIndex],
      ...req.body,
    };

    return res.json({ room: db.rooms[roomIndex] });
  },
);

propertiesRouter.delete("/:propertyId/rooms/:roomId", (req, res) => {
  const { propertyId, roomId } = req.params;
  const roomExists = db.rooms.some((entry) => entry.id === roomId && entry.propertyId === propertyId);
  if (!roomExists) {
    return res.status(404).json({ message: "Room not found" });
  }

  db.rooms = db.rooms.filter((entry) => !(entry.id === roomId && entry.propertyId === propertyId));
  const property = db.properties.find((entry) => entry.id === propertyId);
  if (property) {
    property.totalRooms = db.rooms.filter((entry) => entry.propertyId === propertyId).length;
  }

  return res.status(204).send();
});
