// File: routes/auth.js
const express = require("express");
const router = express.Router();

const ADMIN_CREDENTIALS = {
  username: "admin",
  password: "admin123",
};

router.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (
    username === ADMIN_CREDENTIALS.username &&
    password === ADMIN_CREDENTIALS.password
  ) {
    return res.status(200).json({ message: "Authenticated" });
  }

  res.status(401).json({ message: "Invalid credentials" });
});

module.exports = router;
