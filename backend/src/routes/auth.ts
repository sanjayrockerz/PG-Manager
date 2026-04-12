import { Router } from "express";
import { z } from "zod";
import { db } from "../store/data.js";
import { getTodayIsoDate } from "../utils/date.js";
import { validateBody } from "../utils/validation.js";

const requestOtpSchema = z.object({
  phone: z.string().min(10).max(15),
});

const loginSchema = z.object({
  phone: z.string().min(10).max(15),
  otp: z.string().length(6),
});

const signupSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(10).max(15),
  otp: z.string().length(6),
  pgName: z.string().min(2),
  city: z.string().min(2),
});

export const authRouter = Router();

authRouter.post("/request-otp", validateBody(requestOtpSchema), (req, res) => {
  const { phone } = req.body;
  res.json({
    message: "OTP sent (demo mode)",
    phone,
    expiresInSeconds: 300,
  });
});

authRouter.post("/login", validateBody(loginSchema), (req, res) => {
  const { phone } = req.body;
  let user = db.users.find((entry) => entry.phone === phone);

  if (!user) {
    user = {
      id: `owner-${Date.now()}`,
      name: "Admin User",
      phone,
      role: "owner",
      createdAt: getTodayIsoDate(),
    };
    db.users.push(user);
  }

  res.json({
    message: "Login successful",
    user,
    token: `demo-token-${user.id}`,
  });
});

authRouter.post("/signup", validateBody(signupSchema), (req, res) => {
  const { name, phone, pgName, city } = req.body;

  const existing = db.users.find((entry) => entry.phone === phone);
  if (existing) {
    return res.status(409).json({ message: "Phone already registered" });
  }

  const newUser = {
    id: `owner-${Date.now()}`,
    name,
    phone,
    role: "owner" as const,
    city,
    pgName,
    createdAt: getTodayIsoDate(),
  };

  db.users.push(newUser);

  return res.status(201).json({
    message: "Signup successful",
    user: newUser,
    token: `demo-token-${newUser.id}`,
  });
});

authRouter.get("/me", (req, res) => {
  const userId = String(req.query.userId || "");
  if (!userId) {
    return res.status(400).json({ message: "userId query param is required" });
  }

  const user = db.users.find((entry) => entry.id === userId);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  return res.json({ user });
});
