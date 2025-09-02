const express = require("express");
const fs = require("fs");
const path = require("path");
const Image = require("../../models/Image");
const { upload, UPLOAD_DIR } = require("./_mediaCommon");

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

// DELETE by logical name (removes DB doc and file on disk)
addNew.delete("/:name", async (req, res) => {
  try {
    const doc = await Image.findOne({ name: req.params.name });
    if (!doc) {
      return res
        .status(404)
        .json({ success: false, message: "Not found in DB" });
    }

    const fp = path.join(UPLOAD_DIR, doc.filename);
    if (fs.existsSync(fp)) {
      try {
        fs.unlinkSync(fp);
      } catch (e) {
        console.warn("unlink failed:", e.message);
      }
    }

    await Image.deleteOne({ _id: doc._id });
    res.json({ success: true });
  } catch (e) {
    console.error("DELETE error:", e);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = addNew;

// routes/imageRoutes/addNewImageRoutes.js
// const express = require("express");
// const Image = require("../../models/Image");
// const { upload } = require("./_mediaCommon");
// const { S3Client, DeleteObjectCommand } = require("@aws-sdk/client-s3");

// const addNew = express.Router();

// // separate S3 client (or import from _mediaCommon)
// const s3 = new S3Client({
//   region: process.env.AWS_REGION || "auto",
//   endpoint: process.env.S3_ENDPOINT,
//   credentials: {
//     accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//     secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
//   },
// });

// // STRICTLY create new (no overwrite). Name must be unique.
// addNew.post(
//   "/addNewImages",
//   (req, res, next) =>
//     upload.single("image")(req, res, (err) => {
//       if (err)
//         return res.status(400).json({ success: false, message: err.message });
//       next();
//     }),
//   async (req, res) => {
//     try {
//       const { name, section } = req.body;
//       if (!req.file || !name || !section) {
//         return res
//           .status(400)
//           .json({ success: false, message: "Missing fields" });
//       }
//       const exists = await Image.findOne({ name });
//       if (exists) {
//         return res
//           .status(409)
//           .json({ success: false, message: "Name already exists" });
//       }

//       // store the R2 key in DB
//       const image = new Image({ name, filename: req.file.key, section });
//       await image.save();

//       const url = `https://${process.env.CF_ACCOUNT_ID}.r2.cloudflarestorage.com/${process.env.S3_BUCKET}/${image.filename}`;

//       res.json({
//         success: true,
//         name: image.name,
//         filename: image.filename,
//         section: image.section,
//         url,
//       });
//     } catch (e) {
//       console.error("addNewImages error:", e);
//       res
//         .status(500)
//         .json({ success: false, message: "Internal server error" });
//     }
//   }
// );

// // DELETE by logical name (removes DB doc and object in R2)
// addNew.delete("/:name", async (req, res) => {
//   try {
//     const doc = await Image.findOne({ name: req.params.name });
//     if (!doc) {
//       return res
//         .status(404)
//         .json({ success: false, message: "Not found in DB" });
//     }

//     // delete object from R2 (ignore errors)
//     if (doc.filename) {
//       try {
//         await s3.send(
//           new DeleteObjectCommand({
//             Bucket: process.env.S3_BUCKET,
//             Key: doc.filename,
//           })
//         );
//       } catch (e) {
//         console.warn("R2 delete failed:", e.message);
//       }
//     }

//     await Image.deleteOne({ _id: doc._id });
//     res.json({ success: true });
//   } catch (e) {
//     console.error("DELETE error:", e);
//     res.status(500).json({ success: false, message: "Server error" });
//   }
// });

// module.exports = addNew;
