const mongoose = require("mongoose");
const Image = require("./models/Image");
const images = require("./imageSources.json");
const dotenv = require("dotenv");

dotenv.config();

async function seedImages() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    await Image.deleteMany({});
    await Image.insertMany(images);
    console.log("✅ Image metadata seeded");
    process.exit();
  } catch (err) {
    console.error("❌ Error seeding DB:", err);
    process.exit(1);
  }
}

seedImages();
