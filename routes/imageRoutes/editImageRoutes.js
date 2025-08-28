// routes/imageRoutes/editImageRoutes.js
const express = require("express");
const fs = require("fs");
const path = require("path");
const Image = require("../../models/Image");
const { upload, UPLOAD_DIR } = require("./_mediaCommon");

const router = express.Router();
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Preflight (extra-safe; cors() is also enabled app-wide)
router.options("/upload", (req, res) => {
  res
    .set("Access-Control-Allow-Origin", "*")
    .set("Access-Control-Allow-Methods", "POST,OPTIONS")
    .set("Access-Control-Allow-Headers", "Content-Type")
    .sendStatus(200);
});

function acceptAny(upload) {
  return (req, res, next) => {
    upload.single("image")(req, res, (e) => {
      if (!e && req.file) return next();
      upload.single("video")(req, res, (e2) => {
        if (!e2 && req.file) return next();
        upload.single("file")(req, res, next);
      });
    });
  };
}

/**
 * Edit/replace by logical name; creates only if section provided.
 * Accepts field name: image | video | file (multer.any()).
 * Body: name (required), [newName], [section], file in image/video/file.
 */
router.post(
  "/upload",
  (req, res, next) =>
    upload.any()(req, res, (err) => {
      if (err)
        return res.status(400).json({ success: false, message: err.message });
      next();
    }),
  async (req, res) => {
    // LOG: comment out in prod if noisy
    // console.log("HIT /upload", {
    //   body: req.body,
    //   files: (req.files || []).map((f) => ({
    //     field: f.fieldname,
    //     filename: f.filename,
    //     mime: f.mimetype,
    //     dest: f.destination,
    //   })),
    // });

    try {
      const files = req.files || [];
      const file = files[0] || null; // pick first uploaded file
      const rawName = String(req.body.name || "").trim();
      const rawNewName =
        req.body.newName != null ? String(req.body.newName).trim() : "";
      const bodySection =
        req.body.section != null ? String(req.body.section).trim() : "";

      if (!file || !rawName) {
        return res
          .status(400)
          .json({ success: false, message: "Missing name or file" });
      }

      // Find existing (exact → case-insensitive fallback)
      let existing = await Image.findOne({ name: rawName });
      if (!existing) {
        existing = await Image.findOne({
          name: { $regex: new RegExp(`^${esc(rawName)}$`, "i") },
        });
      }

      const nextName =
        rawNewName && rawNewName !== (existing?.name || rawName)
          ? rawNewName
          : existing?.name || rawName;

      // Prevent rename collision
      if (existing && nextName !== existing.name) {
        const clash = await Image.findOne({ name: nextName });
        if (clash)
          return res
            .status(409)
            .json({ success: false, message: "newName already exists" });
      }

      // UPDATE existing
      if (existing) {
        const oldFilename = existing.filename;

        existing.filename = file.filename;
        if (bodySection) existing.section = bodySection; // only change if sent
        if (nextName !== existing.name) existing.name = nextName;

        await existing.save();

        // cleanup old file
        if (oldFilename && oldFilename !== existing.filename) {
          const oldPath = path.join(UPLOAD_DIR, oldFilename);
          if (fs.existsSync(oldPath)) fs.unlink(oldPath, () => {});
        }

        return res.json({
          success: true,
          name: existing.name,
          filename: existing.filename,
          section: existing.section,
          url: `/uploads/${existing.filename}`,
        });
      }

      // CREATE only when section provided (avoid dumping into wrong section)
      if (!bodySection) {
        return res.status(404).json({
          success: false,
          message: "Image not found; include `section` to create it here.",
        });
      }

      const created = await Image.create({
        name: nextName,
        filename: file.filename,
        section: bodySection,
      });

      return res.json({
        success: true,
        name: created.name,
        filename: created.filename,
        section: created.section,
        url: `/uploads/${created.filename}`,
      });
    } catch (e) {
      console.error("upload edit error:", e);
      return res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }
);

module.exports = router;
