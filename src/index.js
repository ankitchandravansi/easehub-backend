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

// 🔗 Connect to MongoDB
connectDB();

// 🔧 Middlewares
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  })
);

// 🚀 Health check
app.get("/", (req, res) => {
  res.json({ success: true, message: "EaseHub API is running ✅" });
});

// 🔐 Auth routes
app.use("/api/auth", authRoutes);

// 404 handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
