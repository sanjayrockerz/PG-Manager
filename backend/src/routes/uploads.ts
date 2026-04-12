import { Router } from "express";
import multer from "multer";
import path from "node:path";
import { v4 as uuidv4 } from "uuid";

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.resolve(process.cwd(), "uploads"));
  },
  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname);
    cb(null, `${uuidv4()}${extension}`);
  },
});

const upload = multer({ storage });

export const uploadsRouter = Router();

uploadsRouter.post("/tenant-photo", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  const url = `/uploads/${req.file.filename}`;
  return res.status(201).json({ url, filename: req.file.filename });
});

uploadsRouter.post("/tenant-document", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  const url = `/uploads/${req.file.filename}`;
  return res.status(201).json({ url, filename: req.file.filename });
});
