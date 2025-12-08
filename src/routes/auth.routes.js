// src/routes/auth.routes.js
const express = require("express");
const {
  register,
  verifyEmail,
  login,
  refreshToken,
  logout,
  getProfile,
  forgotPassword,
  resetPassword,
} = require("../controllers/auth.controller");
const { protect } = require("../middleware/auth");
const { authLimiter, sensitiveLimiter } = require("../middleware/rateLimiter");

const router = express.Router();

// Apply general limiter to all auth routes
router.use(authLimiter);

// Auth routes
router.post("/register", sensitiveLimiter, register);
router.post("/verify-email", verifyEmail);
router.post("/login", sensitiveLimiter, login);
router.post("/refresh-token", refreshToken);
router.post("/logout", logout);
router.get("/profile", protect, getProfile);

// Forgot / Reset password
router.post("/forgot-password", sensitiveLimiter, forgotPassword);
router.post("/reset-password", sensitiveLimiter, resetPassword);

module.exports = router;
