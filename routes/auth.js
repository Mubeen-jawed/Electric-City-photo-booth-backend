const express = require("express");
const router = express.Router();

// Session middleware should be used in your main app.js or server.js

router.post("/login", (req, res) => {
  const { username, password } = req.body;

  const lowerCaseUsername = username.toLowerCase();

  if (
    lowerCaseUsername === process.env.ADMIN_USERNAME &&
    password === process.env.ADMIN_PASSWORD
  ) {
    req.session.isAuthenticated = true; // ✅ Set session flag
    return res.status(200).json({ message: "Authenticated" });
  }

  res.status(401).json({ message: "Invalid credentials" });
});

// ✅ Route to check if user is authenticated
router.get("/check-auth", (req, res) => {
  if (req.session.isAuthenticated) {
    return res.json({ authenticated: true });
  }
  res.json({ authenticated: false });
});

// ✅ Logout route
router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: "Logout failed" });
    }
    res.clearCookie("connect.sid"); // optional: clear cookie
    res.json({ message: "Logged out" });
  });
});

module.exports = router;
