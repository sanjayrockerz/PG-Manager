import { Router } from "express";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { db } from "../store/data.js";
import { getTodayIsoDate } from "../utils/date.js";
import { validateBody } from "../utils/validation.js";

const statusSchema = z.object({
  status: z.enum(["paid", "pending", "overdue"]),
});

const chargeSchema = z.object({
  type: z.string().min(2),
  customType: z.string().optional(),
  description: z.string().optional(),
  amount: z.number().min(0),
});

export const paymentsRouter = Router();

paymentsRouter.get("/", (req, res) => {
  const propertyId = String(req.query.propertyId || "all");
  const status = String(req.query.status || "all");
  const dateFilter = String(req.query.dateFilter || "all");
  const startDate = String(req.query.startDate || "");
  const endDate = String(req.query.endDate || "");

  let data = db.payments;

  if (propertyId !== "all") {
    data = data.filter((entry) => entry.propertyId === propertyId);
  }

  if (status !== "all") {
    data = data.filter((entry) => entry.status === status);
  }

  if (dateFilter === "custom" && startDate && endDate) {
    data = data.filter((entry) => entry.dueDate >= startDate && entry.dueDate <= endDate);
  }

  if (dateFilter === "current") {
    const now = new Date();
    data = data.filter((entry) => {
      const due = new Date(entry.dueDate);
      return due.getMonth() === now.getMonth() && due.getFullYear() === now.getFullYear();
    });
  }

  if (dateFilter === "last") {
    const now = new Date();
    const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
    const lastYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

    data = data.filter((entry) => {
      const due = new Date(entry.dueDate);
      return due.getMonth() === lastMonth && due.getFullYear() === lastYear;
    });
  }

  const stats = {
    total: data.reduce((sum, payment) => sum + payment.totalAmount, 0),
    paid: data.filter((entry) => entry.status === "paid").reduce((sum, payment) => sum + payment.totalAmount, 0),
    pending: data.filter((entry) => entry.status === "pending").reduce((sum, payment) => sum + payment.totalAmount, 0),
    overdue: data.filter((entry) => entry.status === "overdue").reduce((sum, payment) => sum + payment.totalAmount, 0),
  };

  res.json({ payments: data, stats });
});

paymentsRouter.patch("/:paymentId/status", validateBody(statusSchema), (req, res) => {
  const paymentIndex = db.payments.findIndex((entry) => entry.id === req.params.paymentId);
  if (paymentIndex < 0) {
    return res.status(404).json({ message: "Payment not found" });
  }

  db.payments[paymentIndex].status = req.body.status;
  if (req.body.status === "paid") {
    db.payments[paymentIndex].date = getTodayIsoDate();
  }

  return res.json({ payment: db.payments[paymentIndex] });
});

paymentsRouter.post("/:paymentId/charges", validateBody(chargeSchema), (req, res) => {
  const paymentIndex = db.payments.findIndex((entry) => entry.id === req.params.paymentId);
  if (paymentIndex < 0) {
    return res.status(404).json({ message: "Payment not found" });
  }

  const charge = {
    id: uuidv4(),
    paymentId: req.params.paymentId,
    type: req.body.type,
    customType: req.body.customType,
    description: req.body.description,
    amount: req.body.amount,
    createdAt: getTodayIsoDate(),
  };

  db.extraCharges.push(charge);

  const payment = db.payments[paymentIndex];
  payment.extraCharges += req.body.amount;
  payment.totalAmount = payment.monthlyRent + payment.extraCharges;

  return res.status(201).json({ charge, payment });
});
