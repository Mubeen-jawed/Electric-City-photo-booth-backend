// routes/imageRoutes/_mediaCommon.js
const fs = require("fs");
const path = require("path");
const multer = require("multer");

// IMPORTANT: folder is <project-root>/uploads
const UPLOAD_DIR = path.join(__dirname, "../../uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// MIME map + helpers
const MIME_BY_EXT = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
};
const VIDEO_EXT = new Set([".mp4", ".webm", ".mov"]);

function setCORS(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Range");
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
}

// Multer storage + filter
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = (path.extname(file.originalname) || "").toLowerCase();
    const id = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `media-${id}${ext}`);
  },
});
const fileFilter = (_req, file, cb) => {
  const ok = /^image\/(jpeg|png|webp|gif)$|^video\/(mp4|webm|quicktime)$/.test(
    file.mimetype
  );
  cb(ok ? null : new Error("Unsupported file type"), ok);
};
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
});

module.exports = { UPLOAD_DIR, MIME_BY_EXT, VIDEO_EXT, setCORS, upload };
