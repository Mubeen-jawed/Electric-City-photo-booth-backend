// seed.js (idempotent; preserves uploads)
const mongoose = require("mongoose");
const Image = require("./models/Image");
const images = require("./imageSources.json");
const dotenv = require("dotenv");

dotenv.config();

async function seedImages() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    // DO NOT DELETE EXISTING DOCS
    for (const doc of images) {
      await Image.updateOne(
        { name: doc.name }, // key
        { $setOnInsert: doc }, // insert only if missing
        { upsert: true }
      );
    }
    console.log("✅ Image metadata seeded (non-destructive)");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error seeding DB:", err);
    process.exit(1);
  }
}

seedImages();

// const mongoose = require("mongoose");
// const Image = require("./models/Image");
// const images = require("./imageSources.json");
// const dotenv = require("dotenv");

// dotenv.config();

// async function seedImages() {
//   try {
//     await mongoose.connect(process.env.MONGO_URI);
//     await Image.deleteMany({});
//     await Image.insertMany(images);
//     console.log("✅ Image metadata seeded");
//     process.exit();
//   } catch (err) {
//     console.error("❌ Error seeding DB:", err);
//     process.exit(1);
//     // throw err;
//   }
// }

// seedImages();
// // module.exports = seedImages;
