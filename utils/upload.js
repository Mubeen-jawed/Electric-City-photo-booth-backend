const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const rnd = Math.floor(Math.random() * 1e9);
    cb(null, `media-${Date.now()}-${rnd}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const ok = /image\/(jpeg|png|webp|gif)|video\/(mp4|webm)/.test(file.mimetype);
  cb(ok ? null : new Error("Unsupported file type"), ok);
};

module.exports = multer({
  storage,
  fileFilter,
  limits: { fileSize: 25 * 1024 * 1024 },
});
