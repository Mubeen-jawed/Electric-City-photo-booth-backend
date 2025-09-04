const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const { uploadBufferToS3, buildObjectKey } = require("../utils/s3");
const Image = require("../models/Image");

async function main() {
  const uploadsDir = path.join(__dirname, "..", "uploads");
  const bucket = process.env.AWS_S3_BUCKET || process.env.S3_BUCKET;

  if (!bucket) {
    console.error("Missing AWS_S3_BUCKET or S3_BUCKET in env");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const filter = { $and: [{ filename: { $exists: true, $ne: null } }, { $or: [{ url: { $exists: false } }, { url: null }] }] };
  const docs = await Image.find(filter).lean(false);

  console.log(`Found ${docs.length} images to migrate.`);

  let migrated = 0;
  for (const doc of docs) {
    try {
      const filePath = path.join(uploadsDir, doc.filename);
      if (!fs.existsSync(filePath)) {
        console.warn(`Skip: file missing ${doc.filename}`);
        continue;
      }
      const buffer = fs.readFileSync(filePath);
      const key = buildObjectKey(doc.section || "gallery", doc.filename);
      const url = await uploadBufferToS3({
        buffer,
        bucket,
        key,
        contentType: undefined,
      });

      doc.url = url;
      doc.key = key;
      await doc.save();

      // Optional: delete local file after successful migration
      try {
        fs.unlinkSync(filePath);
      } catch {}

      migrated += 1;
      console.log(`Migrated: ${doc.name} -> ${url}`);
    } catch (e) {
      console.error(`Failed to migrate ${doc.name}:`, e.message);
    }
  }

  console.log(`Done. Migrated ${migrated}/${docs.length}.`);
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((e) => {
  console.error("Fatal migration error:", e);
  process.exit(1);
});


