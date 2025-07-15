const express = require("express");
const router = express.Router();
const Image = require("../models/Image");
const path = require("path");

// GET image by name (e.g., /api/images/home-hero)
router.get("/:name", async (req, res) => {
  const { name } = req.params;
  const image = await Image.findOne({ name });
  if (!image) return res.status(404).send("Image not found");
  res.sendFile(path.resolve(__dirname, `../uploads/${image.filename}`));
});

// GET all image metadata
router.get("/", async (req, res) => {
  const images = await Image.find();
  res.json(images);
});

module.exports = router;
