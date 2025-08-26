const express = require("express");
const Image = require("../../models/Image");
const { upload } = require("./_mediaCommon");

const addNew = express.Router();

// STRICTLY create new (no overwrite). Name must be unique.
addNew.post(
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
      const exists = await Image.findOne({ name });
      if (exists) {
        return res
          .status(409)
          .json({ success: false, message: "Name already exists" });
      }
      const image = new Image({ name, filename: req.file.filename, section });
      await image.save();
      res.json({
        success: true,
        name: image.name,
        filename: image.filename,
        section: image.section,
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

module.exports = addNew;
