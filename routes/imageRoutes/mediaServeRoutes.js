const express3 = require("express");
const fs3 = require("fs");
const path3 = require("path");
const Image3 = require("../../models/Image");
const {
  setCORS: setCORS3,
  MIME_BY_EXT: MIME_BY_EXT3,
  VIDEO_EXT: VIDEO_EXT3,
  UPLOAD_DIR: UPLOAD_DIR3,
} = require("./_mediaCommon");

const media = express3.Router();

// NOTE: Define /section route BEFORE /:name so it doesn't get captured by the param route
media.get("/section/:section", async (req, res) => {
  try {
    const images = await Image3.find({ section: req.params.section }).sort({
      _id: -1,
    });
    res.json({ success: true, images });
  } catch (e) {
    console.error("Section list error:", e);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

media.options("/:name", (req, res) => {
  setCORS3(res);
  res.sendStatus(200);
});

media.head("/:name", async (req, res) => {
  try {
    const doc = await Image3.findOne({ name: req.params.name });
    if (!doc) return res.sendStatus(404);

    const filePath = path3.join(UPLOAD_DIR3, doc.filename);
    if (!fs3.existsSync(filePath)) return res.sendStatus(404);

    const ext = path3.extname(doc.filename).toLowerCase();
    const mime = MIME_BY_EXT3[ext] || "application/octet-stream";
    const size = fs3.statSync(filePath).size;

    setCORS3(res);
    res.setHeader("Content-Type", mime);
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Content-Length", size);
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.end();
  } catch (e) {
    console.error("HEAD error:", e);
    res.sendStatus(500);
  }
});

media.get("/:name", async (req, res) => {
  try {
    const doc = await Image3.findOne({ name: req.params.name });
    if (!doc) return res.status(404).send("Not found");

    const filePath = path3.join(UPLOAD_DIR3, doc.filename);
    if (!fs3.existsSync(filePath))
      return res.status(404).send("File not found");

    const ext = path3.extname(doc.filename).toLowerCase();
    const mime = MIME_BY_EXT3[ext] || "application/octet-stream";
    const fileSize = fs3.statSync(filePath).size;
    const range = req.headers.range;

    setCORS3(res);
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.setHeader("Accept-Ranges", "bytes");

    if (VIDEO_EXT3.has(ext)) {
      res.setHeader("Content-Type", mime);
      if (range) {
        const [startStr, endStr] = range.replace(/bytes=/, "").split("-");
        const start = parseInt(startStr, 10) || 0;
        let end = endStr ? parseInt(endStr, 10) : fileSize - 1;
        if (end >= fileSize) end = fileSize - 1;

        if (start >= fileSize) {
          res.status(416).setHeader("Content-Range", `bytes */${fileSize}`);
          return res.end();
        }

        const chunkSize = end - start + 1;
        res
          .status(206)
          .setHeader("Content-Range", `bytes ${start}-${end}/${fileSize}`);
        res.setHeader("Content-Length", chunkSize);
        return fs3.createReadStream(filePath, { start, end }).pipe(res);
      }

      res.setHeader("Content-Length", fileSize);
      return fs3.createReadStream(filePath).pipe(res);
    }

    // Non-video: serve full file
    res.setHeader("Content-Type", mime);
    res.setHeader("Content-Length", fileSize);
    return fs3.createReadStream(filePath).pipe(res);
  } catch (err) {
    console.error("stream error:", err);
    res.status(500).send("Server error");
  }
});

module.exports = media;
// routes/imageRoutes/mediaServeRoutes.js
// routes/imageRoutes/mediaServeRoutes.js
// routes/imageRoutes/mediaServeRoutes.js
// const express = require("express");
// const path = require("path");
// const Image = require("../../models/Image");
// const { setCORS, publicUrl } = require("./_mediaCommon");

// const media = express.Router();

// const isR2Key = (v) => typeof v === "string" && v.includes("/");
// const legacyUrl = (req, filename) =>
//   `${req.protocol}://${req.get("host")}/uploads/${encodeURIComponent(
//     path.basename(filename)
//   )}`;

// // List by section (include absolute URL for convenience)
// media.get("/section/:section", async (req, res) => {
//   try {
//     const docs = await Image.find({ section: req.params.section }).sort({
//       _id: -1,
//     });
//     const images = docs.map((d) => ({
//       ...d.toObject(),
//       url: isR2Key(d.filename)
//         ? publicUrl(d.filename)
//         : legacyUrl(req, d.filename),
//     }));
//     res.json({ success: true, images });
//   } catch (e) {
//     console.error("Section list error:", e);
//     res.status(500).json({ success: false, message: "Internal server error" });
//   }
// });

// // CORS preflight
// media.options("/:name", (req, res) => {
//   setCORS(res);
//   res.sendStatus(200);
// });

// // HEAD by name → expose target Location
// media.head("/:name", async (req, res) => {
//   try {
//     const doc = await Image.findOne({ name: req.params.name });
//     if (!doc) return res.sendStatus(404);
//     setCORS(res);
//     const url = isR2Key(doc.filename)
//       ? publicUrl(doc.filename)
//       : legacyUrl(req, doc.filename);
//     res.setHeader("Location", url);
//     res.sendStatus(200);
//   } catch (e) {
//     console.error("HEAD error:", e);
//     res.sendStatus(500);
//   }
// });

// // GET by name → redirect to R2 (new) or local /uploads (legacy)
// media.get("/:name", async (req, res) => {
//   try {
//     const doc = await Image.findOne({ name: req.params.name });
//     if (!doc) return res.status(404).send("Not found");
//     setCORS(res);
//     const url = isR2Key(doc.filename)
//       ? publicUrl(doc.filename)
//       : legacyUrl(req, doc.filename);
//     return res.redirect(302, url);
//   } catch (err) {
//     console.error("redirect error:", err);
//     res.status(500).send("Server error");
//   }
// });

// module.exports = media;
