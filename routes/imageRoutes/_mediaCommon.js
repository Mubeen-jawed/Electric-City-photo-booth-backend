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
// routes/imageRoutes/_mediaCommon.js
// routes/imageRoutes/_mediaCommon.js
// require("dotenv").config();

// const path = require("path");
// const multer = require("multer");
// const multerS3 = require("multer-s3");
// const { S3Client } = require("@aws-sdk/client-s3");

// // Helpful env checks (won't crash prod)
// [
//   "S3_BUCKET",
//   "S3_ENDPOINT",
//   "AWS_ACCESS_KEY_ID",
//   "AWS_SECRET_ACCESS_KEY",
// ].forEach((k) => {
//   if (!process.env[k]) console.warn(`[mediaCommon] Missing env: ${k}`);
// });

// const s3 = new S3Client({
//   region: process.env.AWS_REGION || "auto",
//   endpoint: process.env.S3_ENDPOINT, // e.g. https://<CF_ACCOUNT_ID>.r2.cloudflarestorage.com
//   credentials: {
//     accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//     secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
//   },
// });

// const fileFilter = (_req, file, cb) => {
//   const ok = /^image\/(jpeg|png|webp|gif)$|^video\/(mp4|webm|quicktime)$/.test(
//     file.mimetype
//   );
//   cb(ok ? null : new Error("Unsupported file type"), ok);
// };

// const upload = multer({
//   storage: multerS3({
//     s3,
//     bucket: process.env.S3_BUCKET, // e.g. "media"
//     contentType: multerS3.AUTO_CONTENT_TYPE,
//     cacheControl: "public, max-age=31536000, immutable",
//     key: (_req, file, cb) => {
//       const ext = (path.extname(file.originalname || "") || "").toLowerCase();
//       const id = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
//       cb(null, `uploads/media-${id}${ext}`); // store this key in DB
//     },
//   }),
//   fileFilter,
//   limits: { fileSize: 25 * 1024 * 1024 },
// });

// function setCORS(res) {
//   res.setHeader("Access-Control-Allow-Origin", "*");
//   res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,POST,OPTIONS,DELETE");
//   res.setHeader("Access-Control-Allow-Headers", "Content-Type, Range");
//   res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
// }

// const publicUrl = (key) => {
//   if (!process.env.R2_PUBLIC_BASE)
//     throw new Error("Missing env: R2_PUBLIC_BASE");
//   return `${process.env.R2_PUBLIC_BASE}/${key}`; // e.g. https://pub-xxxx.r2.dev/uploads/...
// };

// module.exports = { upload, s3, setCORS, publicUrl };
