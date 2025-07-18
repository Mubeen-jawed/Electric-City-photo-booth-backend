const express = require("express");
const router = express.Router();

const ADMIN_CREDENTIALS = {
  username: "melissa brannan",
  password: "melissa12",
};

router.post("/login", (req, res) => {
  const { username, password } = req.body;

  const lowerCaseUsername = username.toLowerCase();

  if (
    lowerCaseUsername === process.env.ADMIN_USERNAME &&
    password === process.env.ADMIN_PASSWORD
  ) {
    return res.status(200).json({ message: "Authenticated" });
  }

  res.status(401).json({ message: "Invalid credentials" });
});

module.exports = router;
