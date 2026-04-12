import { Router } from "express";
import { z } from "zod";
import { db } from "../store/data.js";
import { getTodayIsoDate } from "../utils/date.js";
import { validateBody } from "../utils/validation.js";

const tenantSchema = z.object({
  propertyId: z.string().min(1),
  name: z.string().min(2),
  phone: z.string().min(8),
  email: z.string().email(),
  photoUrl: z.string().optional(),
  floor: z.number().int().min(1),
  room: z.string().min(1),
  bed: z.string().min(1),
  monthlyRent: z.number().min(0),
  securityDeposit: z.number().min(0),
  rentDueDate: z.number().int().min(1).max(31),
  parentName: z.string().min(2),
  parentPhone: z.string().min(8),
  idType: z.string().min(2),
  idNumber: z.string().min(4),
  idDocumentUrl: z.string().optional(),
  joinDate: z.string().min(8),
  status: z.enum(["active", "inactive"]),
});

const tenantUpdateSchema = tenantSchema.partial();

export const tenantsRouter = Router();

tenantsRouter.get("/", (req, res) => {
  const propertyId = String(req.query.propertyId || "all");
  const data = propertyId === "all"
    ? db.tenants
    : db.tenants.filter((tenant) => tenant.propertyId === propertyId);

  res.json({ tenants: data });
});

tenantsRouter.get("/:tenantId", (req, res) => {
  const tenant = db.tenants.find((entry) => entry.id === req.params.tenantId);
  if (!tenant) {
    return res.status(404).json({ message: "Tenant not found" });
  }

  return res.json({ tenant });
});

tenantsRouter.post("/", validateBody(tenantSchema), (req, res) => {
  const payload = req.body;
  const tenant = {
    id: `tenant-${Date.now()}`,
    ...payload,
  };

  db.tenants.push(tenant);

  const payment = {
    id: `payment-${tenant.id}`,
    tenantId: tenant.id,
    propertyId: tenant.propertyId,
    tenantName: tenant.name,
    room: tenant.room,
    monthlyRent: tenant.monthlyRent,
    extraCharges: 0,
    totalAmount: tenant.monthlyRent,
    dueDate: getTodayIsoDate(),
    date: getTodayIsoDate(),
    status: "pending" as const,
  };
  db.payments.push(payment);

  return res.status(201).json({ tenant });
});

tenantsRouter.put("/:tenantId", validateBody(tenantUpdateSchema), (req, res) => {
  const tenantIndex = db.tenants.findIndex((entry) => entry.id === req.params.tenantId);
  if (tenantIndex < 0) {
    return res.status(404).json({ message: "Tenant not found" });
  }

  db.tenants[tenantIndex] = {
    ...db.tenants[tenantIndex],
    ...req.body,
  };

  const updated = db.tenants[tenantIndex];
  db.payments = db.payments.map((payment) =>
    payment.tenantId === updated.id
      ? {
          ...payment,
          tenantName: updated.name,
          room: updated.room,
          monthlyRent: updated.monthlyRent,
          totalAmount: updated.monthlyRent + payment.extraCharges,
        }
      : payment,
  );

  return res.json({ tenant: updated });
});

tenantsRouter.delete("/:tenantId", (req, res) => {
  const { tenantId } = req.params;
  const exists = db.tenants.some((entry) => entry.id === tenantId);
  if (!exists) {
    return res.status(404).json({ message: "Tenant not found" });
  }

  db.tenants = db.tenants.filter((entry) => entry.id !== tenantId);
  db.payments = db.payments.filter((entry) => entry.tenantId !== tenantId);
  db.maintenanceTickets = db.maintenanceTickets.filter((entry) => entry.tenantId !== tenantId);

  return res.status(204).send();
});

tenantsRouter.get("/:tenantId/payments", (req, res) => {
  const data = db.payments.filter((entry) => entry.tenantId === req.params.tenantId);
  return res.json({ payments: data });
});

tenantsRouter.get("/:tenantId/maintenance", (req, res) => {
  const data = db.maintenanceTickets.filter((entry) => entry.tenantId === req.params.tenantId);
  return res.json({ maintenanceTickets: data });
});
