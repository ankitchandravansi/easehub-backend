// src/index.js
require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const morgan = require("morgan");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const connectDB = require("./config/db");
const authRoutes = require("./routes/auth.routes");
const { errorHandler, notFound } = require("./middleware/errorHandler");

const app = express();

// ===========================
// CORS CONFIG
// ===========================
const allowedOrigins =
  process.env.NODE_ENV === "production"
    ? [
        // 👉 Render + GitHub Pages production origin
        process.env.CLIENT_URL, // e.g. https://ankitchandravansi.github.io
      ]
    : [
        process.env.CLIENT_URL,
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5500",
        "http://127.0.0.1:5500",
      ].filter(Boolean); // undefined / empty hata dega

app.use(
  cors({
    origin(origin, callback) {
      // Postman, mobile apps, curl, etc. (no Origin header)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.log("❌ Blocked by CORS:", origin);
      // ❗ yahan error throw nahi kar rahe, sirf block kar rahe hain
      return callback(null, false);
    },
    credentials: true,
  })
);

// ===========================
// COMMON MIDDLEWARES
// ===========================
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ===========================
// DB CONNECT
// ===========================
connectDB();

// ===========================
// ROUTES
// ===========================
app.get("/", (req, res) => {
  res.json({ success: true, message: "EaseHub API is running ✅" });
});

app.use("/api/auth", authRoutes);

// 404 handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

// ===========================
// SERVER START
// ===========================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
