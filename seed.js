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

const mongooseSeed = require("mongoose");
const ImageSeed = require("./models/Image");
const imagesSeed = require("./imageSources.json");
const dotenvSeed = require("dotenv");

dotenvSeed.config();

async function seedImages() {
  try {
    await mongooseSeed.connect(process.env.MONGO_URI);

    // Safer than delete-all: upsert each by unique `name`
    for (const img of imagesSeed) {
      await ImageSeed.updateOne(
        { name: img.name },
        { $set: img },
        { upsert: true }
      );
    }
    console.log("✅ Image metadata seeded (upsert by name)");
    process.exit();
  } catch (err) {
    console.error("❌ Error seeding DB:", err);
    process.exit(1);
  }
}

seedImages();
