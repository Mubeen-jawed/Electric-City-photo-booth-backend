// run node seed.js to upload media to DB

const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const cors = require("cors");
const dotenv = require("dotenv");
const session = require("express-session");

const imageRoutes = require("./routes/image");
const authRoutes = require("./routes/auth");
const imageRoutesUpload = require("./routes/imageRoutes");

dotenv.config();
const app = express();

// ✅ Trust proxy for secure cookies to work behind reverse proxy (Koyeb, Vercel)
app.set("trust proxy", 1);

// ✅ Allowed frontend origins
const allowedOrigins = [
  "http://localhost:5500", // Dev local
  "https://electric-city-photo-booth-frontend.vercel.app", // Vercel frontend
  "http://electriccityphotobooths.com", // Custom domain
  "https://darling-bavarois-4732f7.netlify.app",
];

// ✅ CORS configuration
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true, // Allow cookies
  })
);

// ✅ Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Dynamic session middleware that works with both HTTP and HTTPS
const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || "keyboard cat",
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 2 * 60 * 60 * 1000, // 2 hours
    httpOnly: true,
    secure: false, // will be set dynamically per request
    sameSite: "lax", // will be set dynamically per request
  },
});

app.use((req, res, next) => {
  // Dynamically update session cookie settings based on protocol
  const isSecure = req.secure || req.headers["x-forwarded-proto"] === "https";

  req.session?.cookie &&
    Object.assign(req.session.cookie, {
      secure: isSecure,
      sameSite: isSecure ? "none" : "lax",
    });

  sessionMiddleware(req, res, next);
});

// ✅ Static file serving for uploaded media
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ✅ Routes
app.use("/api", authRoutes);
app.use("/api/images", imageRoutesUpload); // Upload route
app.use("/api/images", imageRoutes); // View/stream route

// ✅ MongoDB connection
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// ✅ Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
