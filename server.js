const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const cors = require("cors");
const dotenv = require("dotenv");
const session = require("express-session");

// ROUTES
const authRoutes = require("./routes/auth");
// Keep the router that actually contains POST /addNewImages and the GET list routes
// If that's ./routes/imageRoutes.js, import that ONE and remove the legacy one.
const imageRoutes = require("./routes/imageRoutes");

dotenv.config();
const app = express();

// Trust proxy so req.protocol is correct (e.g., HTTPS on Koyeb) when building file URLs
app.set("trust proxy", 1);

// Core middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files (must come before routes that reference /uploads)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Sessions (if you actually need them for auth)
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 2 * 60 * 60 * 1000, // 2 hours
      secure: false, // set true only if you're strictly on HTTPS and behind a proxy with trust proxy set
    },
  })
);

// Routes
app.use("/api", authRoutes);
app.use("/api/images", imageRoutes); // MOUNT ONCE — do NOT mount a second images router

// MongoDB
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Start server (fix template literal)
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

// const expressMain = require("express");
// const mongooseMain = require("mongoose");
// const pathMain = require("path");
// const corsMain = require("cors");
// const dotenvMain = require("dotenv");
// const sessionMain = require("express-session");

// const authRoutesMain = require("./routes/auth");
// const addNewImageRoutes = require("./routes/imageRoutes/addNewImageRoutes");
// const editImageRoutes = require("./routes/imageRoutes/editImageRoutes");
// const mediaServeRoutes = require("./routes/imageRoutes/mediaServeRoutes");

// dotenvMain.config();
// const appMain = expressMain();

// appMain.set("trust proxy", 1);
// appMain.use(corsMain());
// appMain.use(expressMain.json());
// appMain.use(expressMain.urlencoded({ extended: true }));

// appMain.use(
//   "/uploads",
//   expressMain.static(pathMain.join(__dirname, "uploads"))
// );

// appMain.use(
//   sessionMain({
//     secret: process.env.SESSION_SECRET,
//     resave: false,
//     saveUninitialized: false,
//     cookie: { maxAge: 2 * 60 * 60 * 1000, secure: false },
//   })
// );

// appMain.use("/api", authRoutesMain);
// // Mount ALL images routers under the SAME base so frontend paths stay identical
// appMain.use("/api/images", addNewImageRoutes);
// appMain.use("/api/images", editImageRoutes);
// appMain.use("/api/images", mediaServeRoutes);

// mongooseMain
//   .connect(process.env.MONGO_URI, {
//     useNewUrlParser: true,
//     useUnifiedTopology: true,
//   })
//   .then(() => console.log("✅ MongoDB connected"))
//   .catch((err) => console.error("MongoDB connection error:", err));

// const PORT_MAIN = process.env.PORT || 5000;
// appMain.listen(PORT_MAIN, () =>
//   console.log(`🚀 Server running on port ${PORT_MAIN}`)
// );
