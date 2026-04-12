import { Router } from "express";
import { z } from "zod";
import { db } from "../store/data.js";
import { validateBody } from "../utils/validation.js";

const rulesSchema = z.object({
  pgRules: z.array(z.string().min(1)),
});

const templateSchema = z.object({
  enabled: z.boolean().optional(),
  template: z.string().optional(),
  daysBeforeDue: z.number().int().min(1).max(31).optional(),
  notifyOnCreate: z.boolean().optional(),
  notifyOnProgress: z.boolean().optional(),
  notifyOnResolve: z.boolean().optional(),
});

export const settingsRouter = Router();

settingsRouter.get("/", (_req, res) => {
  res.json({ settings: db.settings });
});

settingsRouter.put("/pg-rules", validateBody(rulesSchema), (req, res) => {
  db.settings.pgRules = req.body.pgRules;
  res.json({ settings: db.settings });
});

settingsRouter.put("/whatsapp/:templateType", validateBody(templateSchema), (req, res) => {
  const { templateType } = req.params;
  if (!(templateType in db.settings.whatsappSettings)) {
    return res.status(404).json({ message: "Template type not found" });
  }

  db.settings.whatsappSettings[templateType] = {
    ...db.settings.whatsappSettings[templateType],
    ...req.body,
  };

  return res.json({ settings: db.settings });
});
