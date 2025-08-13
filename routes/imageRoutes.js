const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const Image = require("../models/Image");

const router = express.Router();

// ✅ Allowed MIME types
const allowedTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
];

// ✅ Multer config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "../uploads"));
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `media-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Unsupported file type"), false);
  }
};

const upload = multer({ storage, fileFilter });

// ✅ Upload and update route
router.post(
  "/upload",
  (req, res, next) => {
    upload.single("image")(req, res, (err) => {
      if (err) {
        console.error("Upload error:", err.message);
        return res.status(400).json({ success: false, message: err.message });
      }
      next();
    });
  },
  async (req, res) => {
    const { name } = req.body;
    const newFilename = req.file?.filename;

    if (!name || !newFilename) {
      return res
        .status(400)
        .json({ success: false, message: "Missing name or file" });
    }

    try {
      const existing = await Image.findOne({ name });

      if (!existing) {
        return res
          .status(404)
          .json({ success: false, message: "Image entry not found in DB" });
      }

      // Delete old file
      const oldPath = path.join(__dirname, "../uploads", existing.filename);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);

      existing.filename = newFilename;
      await existing.save();

      // await seedImages(); //////////////////

      return res.status(200).json({ success: true, filename: newFilename });
    } catch (err) {
      console.error("Server error:", err.message);
      return res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }
);

router.post(
  "/addNewImages",
  (req, res, next) => {
    upload.single("image")(req, res, (err) => {
      if (err) {
        console.error("Upload error:", err.message);
        return res.status(400).json({ success: false, message: err.message });
      }
      next();
    });
  },
  async (req, res) => {
    console.log("BODY:", req.body);
    console.log("FILE:", req.file);

    const { name, section } = req.body;
    const newFilename = req.file?.filename;

    if (!name || !newFilename) {
      return res
        .status(400)
        .json({ success: false, message: "Missing name or file" });
    }

    try {
      // Check if name already exists to avoid duplicates
      const existing = await Image.findOne({ name });
      if (existing) {
        return res
          .status(409)
          .json({ success: false, message: "Image name already exists" });
      }

      // Create new Image entry
      const newImage = new Image({
        name,
        filename: newFilename,
        section: section || "default", // or whatever default section you want
      });

      await newImage.save();

      return res.status(201).json({
        success: true,
        message: "Image uploaded",
        filename: newFilename,
      });
    } catch (err) {
      console.error("Server error:", err.message);
      return res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }
);

router.get("/:name", async (req, res) => {
  const { name } = req.params;

  try {
    const image = await Image.findOne({ name });
    if (!image) return res.status(404).send("Image not found");

    const filePath = path.join(__dirname, "../uploads", image.filename);
    const ext = path.extname(image.filename).toLowerCase();

    if (!fs.existsSync(filePath)) {
      return res.status(404).send("File not found");
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    // ✅ Stream video with proper range headers
    if (ext === ".mp4" || ext === ".webm") {
      const contentType = ext === ".mp4" ? "video/mp4" : "video/webm";

      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

        const chunkSize = end - start + 1;
        const file = fs.createReadStream(filePath, { start, end });

        res.writeHead(206, {
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunkSize,
          "Content-Type": contentType,
        });

        file.pipe(res);
      } else {
        res.writeHead(200, {
          "Content-Length": fileSize,
          "Content-Type": contentType,
        });

        fs.createReadStream(filePath).pipe(res);
      }
    } else {
      // ✅ Serve image directly
      const contentTypeMap = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
        ".gif": "image/gif",
      };

      const contentType = contentTypeMap[ext] || "application/octet-stream";
      res.setHeader("Content-Type", contentType);
      fs.createReadStream(filePath).pipe(res);
    }
  } catch (err) {
    console.error("Streaming error:", err.message);
    return res.status(500).send("Server error");
  }
});

module.exports = router;
