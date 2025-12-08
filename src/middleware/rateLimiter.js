// src/middleware/rateLimiter.js
const rateLimit = require("express-rate-limit");

// General limiter (for all auth routes)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 100, // max 100 requests / window / IP
  message: {
    success: false,
    message: "Too many requests from this IP, please try again later.",
  },
});

// Stricter limiter (for login, signup etc.)
const sensitiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    message:
      "Too many attempts. Please wait a few minutes before trying again.",
  },
});

module.exports = {
  authLimiter,
  sensitiveLimiter,
};
