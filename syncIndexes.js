const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

const Image = require("./models/Image");

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    await Image.syncIndexes();
    console.log("✅ Indexes synced");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error syncing indexes:", err);
    process.exit(1);
  }
})();
