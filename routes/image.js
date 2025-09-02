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

// routes/image.js
// routes/image.js
// const express = require("express");
// const path = require("path");
// const router = express.Router();
// const Image = require("../models/Image");

// const isR2Key = (v) => typeof v === "string" && v.includes("/");
// const buildR2Url = (key) => `${process.env.R2_PUBLIC_BASE}/${key}`;
// const legacyUrl = (req, filename) =>
//   `${req.protocol}://${req.get("host")}/uploads/${encodeURIComponent(
//     path.basename(filename)
//   )}`;

// router.get("/:name", async (req, res) => {
//   const image = await Image.findOne({ name: req.params.name });
//   if (!image) return res.status(404).send("Image not found");
//   const url = isR2Key(image.filename)
//     ? buildR2Url(image.filename)
//     : legacyUrl(req, image.filename);
//   return res.redirect(302, url);
// });

// router.get("/", async (req, res) => {
//   const images = await Image.find().sort({ _id: -1 });
//   res.json(
//     images.map((img) => ({
//       ...img.toObject(),
//       url: isR2Key(img.filename)
//         ? buildR2Url(img.filename)
//         : legacyUrl(req, img.filename),
//     }))
//   );
// });

// module.exports = router;
