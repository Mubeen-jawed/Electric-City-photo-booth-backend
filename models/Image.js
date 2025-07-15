const mongoose = require("mongoose");

const imageSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }, // e.g. 'home-hero'
  filename: { type: String, required: true }, // e.g. 'hero-banner.jpg'
  section: { type: String }, // optional: e.g. 'homepage', 'gallery'
});

module.exports = mongoose.model("Image", imageSchema);
