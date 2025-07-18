// run node seed.js to upload media to DB

const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const cors = require("cors");
const dotenv = require("dotenv");
const imageRoutes = require("./routes/image");
const authRoutes = require("./routes/auth");
const imageRoutesUpload = require("./routes/imageRoutes");
const session = require("express-session");

dotenv.config();
const app = express();

const allowedOrigins = [
  "http://localhost:5500", // Dev local
  "https://electric-city-photo-booth-frontend.vercel.app", // Vercel frontend
  "http://electriccityphotobooths.com", // Custom domain,
  "https://darling-bavarois-4732f7.netlify.app",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// Middleware

app.use(express.json());
app.use("/api", authRoutes);
app.use("/api/images", imageRoutesUpload);
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 2 * 60 * 60 * 1000, // ✅ 2 hours in milliseconds
      secure: false, // true if using HTTPS
    },
  })
);

// Routes
app.use("/api/images", imageRoutes);

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
