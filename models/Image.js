const mongoose = require("mongoose");

const imageSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }, // e.g. 'home-hero'
  filename: { type: String, required: true }, // e.g. 'hero-banner.jpg'
  section: { type: String }, // optional: e.g. 'homepage', 'gallery'
});
// ImageSchema.index({ name: 1 }, { unique: true });

module.exports = mongoose.model("Image", imageSchema);

// const mongoose = require("mongoose");

// const ImageSchema = new mongoose.Schema(
//   {
//     name: { type: String, required: true, unique: true, trim: true },
//     filename: { type: String, required: true },
//     section: { type: String, default: "gallery", index: true },
//   },
//   { timestamps: true }
// );

// // ensure unique index on `name`
// ImageSchema.index({ name: 1 }, { unique: true });

// module.exports = mongoose.model("Image", ImageSchema);
