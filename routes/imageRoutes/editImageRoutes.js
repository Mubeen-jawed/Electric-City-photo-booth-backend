const express2 = require("express");
const fs2 = require("fs");
const path2 = require("path");
const Image2 = require("../../models/Image");
const { upload: upload2, UPLOAD_DIR: UPLOAD_DIR2 } = require("./_mediaCommon");

const edit = express2.Router();

// Backward-compatible UPSERT (same path as before)
edit.post(
  "/upload",
  (req, res, next) => {
    upload2.single("image")(req, res, (err) => {
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

      let doc = await Image2.findOne({ name });

      // If renaming, ensure target is free
      if (newName && newName !== name) {
        const clash = await Image2.findOne({ name: newName });
        if (clash) {
          return res
            .status(409)
            .json({ success: false, message: "newName already exists" });
        }
      }

      if (!doc) {
        // keep legacy auto-create behavior to avoid breaking frontend
        doc = new Image2({
          name: newName || name,
          filename: req.file.filename,
          section: section || "gallery",
        });
        await doc.save();
      } else {
        // replace file
        if (doc.filename) {
          const oldPath = path2.join(UPLOAD_DIR2, doc.filename);
          if (fs2.existsSync(oldPath)) {
            try {
              fs2.unlinkSync(oldPath);
            } catch {}
          }
        }
        doc.filename = req.file.filename;
        if (section) doc.section = section;
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

// Strict EDIT-only alternative (optional; won't auto-create)
edit.post(
  "/edit",
  (req, res, next) =>
    upload2.single("image")(req, res, (err) => {
      if (err)
        return res.status(400).json({ success: false, message: err.message });
      next();
    }),
  async (req, res) => {
    try {
      const { name, newName, section } = req.body;
      if (!req.file || !name)
        return res
          .status(400)
          .json({ success: false, message: "Missing name or file" });

      const doc = await Image2.findOne({ name });
      if (!doc)
        return res
          .status(404)
          .json({ success: false, message: "Image not found" });

      if (newName && newName !== name) {
        const clash = await Image2.findOne({ name: newName });
        if (clash)
          return res
            .status(409)
            .json({ success: false, message: "newName already exists" });
      }

      // replace file
      if (doc.filename) {
        const oldPath = path2.join(UPLOAD_DIR2, doc.filename);
        if (fs2.existsSync(oldPath)) {
          try {
            fs2.unlinkSync(oldPath);
          } catch {}
        }
      }
      doc.filename = req.file.filename;
      if (section) doc.section = section;
      if (newName && newName !== name) doc.name = newName;
      await doc.save();

      res.json({
        success: true,
        name: doc.name,
        filename: doc.filename,
        section: doc.section,
        url: `/uploads/${doc.filename}`,
      });
    } catch (e) {
      console.error("edit error:", e);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }
);

// Delete by logical name
edit.delete("/:name", async (req, res) => {
  try {
    const doc = await Image2.findOne({ name: req.params.name });
    if (!doc)
      return res
        .status(404)
        .json({ success: false, message: "Not found in DB" });

    const fp = path2.join(UPLOAD_DIR2, doc.filename);
    if (fs2.existsSync(fp)) {
      try {
        fs2.unlinkSync(fp);
      } catch (e) {
        console.warn("unlink failed:", e.message);
      }
    }

    await Image2.deleteOne({ _id: doc._id });
    res.json({ success: true });
  } catch (e) {
    console.error("DELETE error:", e);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = edit;
