const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const Image = require("../models/Image");

const router = express.Router();

// ---- Ensure uploads dir exists (important on fresh deploys) ----
const UPLOAD_DIR = path.join(__dirname, "../uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// ✅ Allowed MIME types
const allowedTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
];

// ✅ Multer config
const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename: function (_req, file, cb) {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `media-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (_req, file, cb) => {
  if (allowedTypes.includes(file.mimetype)) cb(null, true);
  else cb(new Error("Unsupported file type"), false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB (adjust if needed)
});

// ---------------------
//   LIST (for gallery)
// ---------------------

// List all images/videos (for admin or simple gallery)
router.get("/", async (_req, res) => {
  try {
    const images = await Image.find().sort({ _id: -1 });
    res.json({ success: true, images });
  } catch (e) {
    console.error("List error:", e.message);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// List by section (e.g., /api/images/section/equipment)
// IMPORTANT: define this BEFORE "/:name" so it doesn't get captured by that route
router.get("/section/:section", async (req, res) => {
  try {
    const images = await Image.find({ section: req.params.section }).sort({
      _id: -1,
    });
    res.json({ success: true, images });
  } catch (e) {
    console.error("Section list error:", e.message);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// ---------------------
//   CREATE new record
// ---------------------
router.post(
  "/addNewImages",
  (req, res, next) => {
    upload.single("image")(req, res, (err) => {
      if (err) {
        console.error("Upload error:", err.message);
        return res.status(400).json({ success: false, message: err.message });
      }
      next();
    });
  },
  async (req, res) => {
    // debug (optional)
    // console.log("BODY:", req.body);
    // console.log("FILE:", req.file);

    const { name, section } = req.body;
    const newFilename = req.file?.filename;

    if (!name || !newFilename) {
      return res
        .status(400)
        .json({ success: false, message: "Missing name or file" });
    }

    try {
      // Avoid duplicates by name (schema enforces unique too)
      const existing = await Image.findOne({ name });
      if (existing) {
        return res
          .status(409)
          .json({ success: false, message: "Image name already exists" });
      }

      const newImage = new Image({
        name,
        filename: newFilename,
        section: section || "default",
      });

      await newImage.save();

      // Return full URL so frontend can swap src to the persisted file
      const fullUrl = `${req.protocol}://${req.get(
        "host"
      )}/uploads/${newFilename}`;

      return res.status(201).json({
        success: true,
        message: "Image uploaded",
        filename: newFilename,
        url: fullUrl,
      });
    } catch (err) {
      console.error("Server error:", err.message);
      return res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }
);

// ---------------------
//   UPDATE existing by name (replace file)
// ---------------------
router.post(
  "/upload",
  (req, res, next) => {
    upload.single("image")(req, res, (err) => {
      if (err) {
        console.error("Upload error:", err.message);
        return res.status(400).json({ success: false, message: err.message });
      }
      next();
    });
  },
  async (req, res) => {
    const { name } = req.body;
    const newFilename = req.file?.filename;

    if (!name || !newFilename) {
      return res
        .status(400)
        .json({ success: false, message: "Missing name or file" });
    }

    try {
      const existing = await Image.findOne({ name });

      if (!existing) {
        return res
          .status(404)
          .json({ success: false, message: "Image entry not found in DB" });
      }

      // Delete old file if present
      if (existing.filename) {
        const oldPath = path.join(UPLOAD_DIR, existing.filename);
        if (fs.existsSync(oldPath)) {
          try {
            fs.unlinkSync(oldPath);
          } catch (e) {
            console.warn("Could not delete old file:", e.message);
          }
        }
      }

      existing.filename = newFilename;
      await existing.save();

      const fullUrl = `${req.protocol}://${req.get(
        "host"
      )}/uploads/${newFilename}`;

      return res.status(200).json({
        success: true,
        filename: newFilename,
        url: fullUrl,
      });
    } catch (err) {
      console.error("Server error:", err.message);
      return res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }
);

// ---------------------
//   STREAM by "name"
// ---------------------
// NOTE: keep this AFTER more specific routes like /section/:section
router.get("/:name", async (req, res) => {
  const { name } = req.params;

  try {
    const image = await Image.findOne({ name });
    if (!image) return res.status(404).send("Image not found");

    const filePath = path.join(UPLOAD_DIR, image.filename);
    const ext = path.extname(image.filename).toLowerCase();

    if (!fs.existsSync(filePath)) {
      return res.status(404).send("File not found");
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    // ✅ Stream video with range
    if (ext === ".mp4" || ext === ".webm") {
      const contentType = ext === ".mp4" ? "video/mp4" : "video/webm";

      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

        const chunkSize = end - start + 1;
        const file = fs.createReadStream(filePath, { start, end });

        res.writeHead(206, {
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunkSize,
          "Content-Type": contentType,
        });

        file.pipe(res);
      } else {
        res.writeHead(200, {
          "Content-Length": fileSize,
          "Content-Type": contentType,
        });

        fs.createReadStream(filePath).pipe(res);
      }
    } else {
      // ✅ Serve image directly
      const contentTypeMap = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
        ".gif": "image/gif",
      };

      const contentType = contentTypeMap[ext] || "application/octet-stream";
      res.setHeader("Content-Type", contentType);
      fs.createReadStream(filePath).pipe(res);
    }
  } catch (err) {
    console.error("Streaming error:", err.message);
    return res.status(500).send("Server error");
  }
});

module.exports = router;
