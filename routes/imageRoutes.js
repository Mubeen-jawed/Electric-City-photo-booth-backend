const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const Image = require("../models/Image");

const router = express.Router();

// ---- Upload directory ----
const UPLOAD_DIR = path.join(__dirname, "../uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// ---- MIME map ----
const MIME_BY_EXT = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp", // image only
  ".gif": "image/gif",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
};
const VIDEO_EXT = new Set([".mp4", ".webm", ".mov"]);

// ---- Multer ----
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

// ---- Helpers ----
function setCORS(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Range, Content-Type");
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
}

// ---- LIST by section ----
router.get("/section/:section", async (req, res) => {
  try {
    const images = await Image.find({ section: req.params.section }).sort({
      _id: -1,
    });
    res.json({ success: true, images });
  } catch (e) {
    console.error("Section list error:", e);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// ---- ADD NEW ----
router.post(
  "/addNewImages",
  (req, res, next) =>
    upload.single("image")(req, res, (err) => {
      if (err)
        return res.status(400).json({ success: false, message: err.message });
      next();
    }),
  async (req, res) => {
    try {
      const { name, section } = req.body;
      if (!req.file || !name || !section) {
        return res
          .status(400)
          .json({ success: false, message: "Missing fields" });
      }
      const image = new Image({ name, filename: req.file.filename, section });
      await image.save();
      res.json({
        success: true,
        name: image.name,
        filename: image.filename,
        url: `/uploads/${image.filename}`,
      });
    } catch (e) {
      console.error("addNewImages error:", e);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }
);

// ---- REPLACE (upload new by name) ----
// ---- UPSERT (edit existing OR create if missing) ----
router.post(
  "/upload",
  (req, res, next) => {
    upload.single("image")(req, res, (err) => {
      if (err)
        return res.status(400).json({ success: false, message: err.message });
      next();
    });
  },
  async (req, res) => {
    try {
      const { name, newName, section } = req.body;
      if (!req.file || !name) {
        return res
          .status(400)
          .json({ success: false, message: "Missing name or file" });
      }

      // try find by current name
      let doc = await Image.findOne({ name });

      // if renaming, ensure target name is free (or same doc)
      if (newName && newName !== name) {
        const clash = await Image.findOne({ name: newName });
        if (clash) {
          return res
            .status(409)
            .json({ success: false, message: "newName already exists" });
        }
      }

      if (!doc) {
        // create new if not found (auto-seed behavior)
        doc = new Image({
          name: newName || name,
          filename: req.file.filename,
          section: section || "gallery",
        });
        await doc.save();
      } else {
        // update existing
        // delete old file (best-effort)
        if (doc.filename) {
          const oldPath = path.join(UPLOAD_DIR, doc.filename);
          if (fs.existsSync(oldPath)) {
            try {
              fs.unlinkSync(oldPath);
            } catch {}
          }
        }
        doc.filename = req.file.filename;
        if (section) doc.section = section; // allow section change when provided
        if (newName && newName !== name) doc.name = newName;
        await doc.save();
      }

      return res.json({
        success: true,
        name: doc.name,
        filename: doc.filename,
        section: doc.section,
        url: `/uploads/${doc.filename}`,
      });
    } catch (e) {
      console.error("upload upsert error:", e);
      return res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }
);

// ---- OPTIONS + HEAD ----
router.options("/:name", (req, res) => {
  setCORS(res);
  res.sendStatus(200);
});

router.head("/:name", async (req, res) => {
  try {
    const doc = await Image.findOne({ name: req.params.name });
    if (!doc) return res.sendStatus(404);

    const filePath = path.join(UPLOAD_DIR, doc.filename);
    if (!fs.existsSync(filePath)) return res.sendStatus(404);

    const ext = path.extname(doc.filename).toLowerCase();
    const mime = MIME_BY_EXT[ext] || "application/octet-stream";
    const size = fs.statSync(filePath).size;

    setCORS(res);
    res.setHeader("Content-Type", mime);
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Content-Length", size);
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.end();
  } catch (e) {
    console.error("HEAD error:", e);
    res.sendStatus(500);
  }
});

// ---- SERVE FILES ----
router.get("/:name", async (req, res) => {
  try {
    const doc = await Image.findOne({ name: req.params.name });
    if (!doc) return res.status(404).send("Not found");

    const filePath = path.join(UPLOAD_DIR, doc.filename);
    if (!fs.existsSync(filePath)) return res.status(404).send("File not found");

    const ext = path.extname(doc.filename).toLowerCase();
    const mime = MIME_BY_EXT[ext] || "application/octet-stream";
    const fileSize = fs.statSync(filePath).size;
    const range = req.headers.range;

    setCORS(res);
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.setHeader("Accept-Ranges", "bytes");

    // --- Video streaming with Range ---
    if (VIDEO_EXT.has(ext)) {
      res.setHeader("Content-Type", mime);
      if (range) {
        const [startStr, endStr] = range.replace(/bytes=/, "").split("-");
        const start = parseInt(startStr, 10) || 0;
        let end = endStr ? parseInt(endStr, 10) : fileSize - 1;
        if (end >= fileSize) end = fileSize - 1;

        if (start >= fileSize) {
          res.status(416).setHeader("Content-Range", `bytes */${fileSize}`);
          return res.end();
        }

        const chunkSize = end - start + 1;
        res
          .status(206)
          .setHeader("Content-Range", `bytes ${start}-${end}/${fileSize}`);
        res.setHeader("Content-Length", chunkSize);

        return fs.createReadStream(filePath, { start, end }).pipe(res);
      }

      res.setHeader("Content-Length", fileSize);
      return fs.createReadStream(filePath).pipe(res);
    }

    // --- Non-video: serve as normal ---
    res.setHeader("Content-Type", mime);
    res.setHeader("Content-Length", fileSize);
    return fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    console.error("stream error:", err);
    res.status(500).send("Server error");
  }
});

// ---- DELETE ----
router.delete("/:name", async (req, res) => {
  try {
    const doc = await Image.findOne({ name: req.params.name });
    if (!doc)
      return res
        .status(404)
        .json({ success: false, message: "Not found in DB" });

    const fp = path.join(UPLOAD_DIR, doc.filename);
    if (fs.existsSync(fp)) {
      try {
        fs.unlinkSync(fp);
      } catch (e) {
        console.warn("unlink failed:", e.message);
      }
    }

    await Image.deleteOne({ _id: doc._id });
    res.json({ success: true });
  } catch (e) {
    console.error("DELETE error:", e);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
