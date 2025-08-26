// routes/editImageRoutes.js
const express = require("express");
const fs = require("fs");
const path = require("path");
const Image = require("../../models/Image");
const { upload, UPLOAD_DIR } = require("./_mediaCommon"); // from your first patch

const router = express.Router();

// tiny helper to escape regex
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// ACCEPT image|video|file from ANY page; persist to Mongo; keep section unless explicitly changed.
router.post(
  "/upload",
  (req, res, next) =>
    upload.any()(req, res, (err) => {
      if (err)
        return res.status(400).json({ success: false, message: err.message });
      next();
    }),
  async (req, res) => {
    console.log("HIT /upload", {
      body: req.body,
      files: (req.files || []).map((f) => ({
        field: f.fieldname,
        fn: f.filename,
        mime: f.mimetype,
      })),
    });

    try {
      // pick first uploaded file (multer.any puts them in req.files[])
      console.log("Try");

      const file =
        req.file ||
        (Array.isArray(req.files) && req.files[0]) ||
        req?.files?.image?.[0] ||
        req?.files?.video?.[0] ||
        req?.files?.file?.[0] ||
        null;

      const rawName = String(req.body.name || "").trim();
      const rawNewName =
        req.body.newName != null ? String(req.body.newName).trim() : "";
      const bodySection =
        req.body.section != null ? String(req.body.section).trim() : "";

      if (!file || !rawName)
        return res
          .status(400)
          .json({ success: false, message: "Missing name or file" });

      // Try exact match first
      let existing = await Image.findOne({ name: rawName });

      // Fallback: case-insensitive match (helps if some pages differ in case)
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

      // --- UPDATE EXISTING ---
      if (existing) {
        const oldFilename = existing.filename;

        existing.filename = file.filename;
        if (bodySection) existing.section = bodySection; // only change section when explicitly provided
        if (nextName !== existing.name) existing.name = nextName;

        await existing.save(); // <— PERSIST TO DB

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

      // --- CREATE IF MISSING (ONLY when section is provided, so equipment stays in equipment) ---
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
