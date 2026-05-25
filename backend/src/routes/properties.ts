import { Router } from "express";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { db } from "../store/data.js";
import { Room } from "../types/entities.js";
import { getTodayIsoDate } from "../utils/date.js";
import { validateBody } from "../utils/validation.js";
import { requireAuth } from "../middleware/auth.js";
import { requireOwnerOrAdmin } from "../middleware/rbac.js";
import { validatePropertyOwnership } from "../middleware/ownership.js";

const propertyCreateSchema = z.object({
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

function hydrateOwnedProperties(ownerId: string, isAdmin: boolean) {
  const owned = isAdmin
    ? db.properties
    : db.properties.filter((p) => p.ownerId === ownerId);
  return owned.map((property) => ({
    ...property,
    rooms: db.rooms.filter((room) => room.propertyId === property.id),
  }));
}

export const propertiesRouter = Router();

// All property routes require authentication
propertiesRouter.use(requireAuth);

propertiesRouter.get("/", (req, res) => {
  const authUser = req.authUser!;
  const isAdminRole = authUser.role === "admin" || authUser.role === "super_admin";
  res.json({ properties: hydrateOwnedProperties(authUser.id, isAdminRole) });
});

propertiesRouter.post("/", requireOwnerOrAdmin, validateBody(propertyCreateSchema), (req, res) => {
  const authUser = req.authUser!;
  const property = {
    id: `prop-${Date.now()}`,
    ownerId: authUser.id,
    createdAt: getTodayIsoDate(),
    ...req.body,
  };

  db.properties.push(property);
  res.status(201).json({ property: { ...property, rooms: [] } });
});

propertiesRouter.put(
  "/:propertyId",
  requireOwnerOrAdmin,
  validatePropertyOwnership,
  validateBody(propertyUpdateSchema),
  (req, res) => {
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
    return res.json({
      property: { ...property, rooms: db.rooms.filter((room) => room.propertyId === property.id) },
    });
  },
);

propertiesRouter.delete(
  "/:propertyId",
  requireOwnerOrAdmin,
  validatePropertyOwnership,
  (req, res) => {
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
  },
);

propertiesRouter.post(
  "/:propertyId/rooms",
  requireOwnerOrAdmin,
  validatePropertyOwnership,
  validateBody(roomSchema),
  (req, res) => {
    const { propertyId } = req.params;
    const property = db.properties.find((entry) => entry.id === propertyId);
    if (!property) {
      return res.status(404).json({ message: "Property not found" });
    }

    const room: Room = {
      id: uuidv4(),
      propertyId,
      ...req.body,
    };

    db.rooms.push(room);
    property.totalRooms = db.rooms.filter((entry) => entry.propertyId === propertyId).length;

    return res.status(201).json({ room });
  },
);

propertiesRouter.put(
  "/:propertyId/rooms/:roomId",
  requireOwnerOrAdmin,
  validatePropertyOwnership,
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

propertiesRouter.delete(
  "/:propertyId/rooms/:roomId",
  requireOwnerOrAdmin,
  validatePropertyOwnership,
  (req, res) => {
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
  },
);
