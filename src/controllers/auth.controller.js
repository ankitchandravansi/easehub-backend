// src/controllers/auth.controller.js
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");
const sendEmail = require("../utils/sendEmail");

const createAccessToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
  });
};

const createRefreshToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  });
};

const setRefreshTokenCookie = (res, token) => {
  const isProd = process.env.NODE_ENV === "production";

  res.cookie("refreshToken", token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res
        .status(400)
        .json({ success: false, message: "Email already registered" });
    }

    const user = await User.create({ name, email, password });

    // Email verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const expiry = Date.now() + 60 * 60 * 1000; // 1 hour

    user.emailVerificationToken = verificationToken;
    user.emailVerificationTokenExpires = expiry;
    await user.save();

    const verifyUrl = `${process.env.CLIENT_URL}/verify-email?token=${verificationToken}&email=${user.email}`;

    const html = `
      <p>Hi ${user.name},</p>
      <p>Thanks for signing up to <b>EaseHub</b>.</p>
      <p>Please verify your email by clicking the link below:</p>
      <p><a href="${verifyUrl}" target="_blank">${verifyUrl}</a></p>
      <p>This link will expire in 1 hour.</p>
      <p>If you did not create this account, you can ignore this email.</p>
    `;

    await sendEmail({
      to: user.email,
      subject: "Verify your email - EaseHub",
      html,
    });

    console.log("🔐 Email verification token:", verificationToken);

    res.status(201).json({
      success: true,
      message:
        "Registration successful. Please check your email to verify your account.",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify email
// @route   POST /api/auth/verify-email
// @access  Public
const verifyEmail = async (req, res, next) => {
  try {
    const { token, email } = req.body;

    if (!token || !email) {
      return res.status(400).json({
        success: false,
        message: "Token and email are required",
      });
    }

    const user = await User.findOne({
      email,
      emailVerificationToken: token,
      emailVerificationTokenExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired verification token",
      });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationTokenExpires = undefined;
    await user.save();

    res.json({
      success: true,
      message: "Email verified successfully. You can now log in.",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Email and password are required" });
    }

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid credentials" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid credentials" });
    }

    if (!user.isEmailVerified) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email before logging in.",
      });
    }

    const accessToken = createAccessToken(user._id);
    const refreshToken = createRefreshToken(user._id);

    user.refreshToken = refreshToken;
    await user.save();

    setRefreshTokenCookie(res, refreshToken);

    res.json({
      success: true,
      message: "Logged in successfully",
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isEmailVerified: user.isEmailVerified,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Refresh access token
// @route   POST /api/auth/refresh-token
// @access  Public (uses cookie)
const refreshToken = async (req, res, next) => {
  try {
    const token = req.cookies.refreshToken;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No refresh token provided",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);

    const user = await User.findById(decoded.id);
    if (!user || user.refreshToken !== token) {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token",
      });
    }

    const newAccessToken = createAccessToken(user._id);
    const newRefreshToken = createRefreshToken(user._id);

    user.refreshToken = newRefreshToken;
    await user.save();

    setRefreshTokenCookie(res, newRefreshToken);

    res.json({
      success: true,
      accessToken: newAccessToken,
    });
  } catch (error) {
    console.error("Refresh token error:", error.message);
    return res.status(401).json({
      success: false,
      message: "Could not refresh token",
    });
  }
};

// @desc    Logout
// @route   POST /api/auth/logout
// @access  Public (uses cookie)
const logout = async (req, res, next) => {
  try {
    const token = req.cookies.refreshToken;

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
        const user = await User.findById(decoded.id);
        if (user) {
          user.refreshToken = null;
          await user.save();
        }
      } catch (err) {
        // ignore token error on logout
      }
    }

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    });

    res.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get profile
// @route   GET /api/auth/profile
// @access  Private
const getProfile = async (req, res, next) => {
  try {
    res.json({
      success: true,
      user: req.user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Forgot password (send reset link)
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email is required" });
    }

    const user = await User.findOne({ email });

    // Security: don't reveal whether email exists
    if (!user) {
      return res.json({
        success: true,
        message:
          "If an account exists with that email, a reset link has been sent.",
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const expiry = Date.now() + 60 * 60 * 1000; // 1 hour

    user.passwordResetToken = resetToken;
    user.passwordResetExpires = expiry;
    await user.save();

    const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}&email=${user.email}`;

    const html = `
      <p>Hi ${user.name || ""},</p>
      <p>We received a request to reset your password for <b>EaseHub</b>.</p>
      <p>You can reset your password by clicking the link below:</p>
      <p><a href="${resetUrl}" target="_blank">${resetUrl}</a></p>
      <p>This link will expire in 1 hour. If you did not request a password reset, you can safely ignore this email.</p>
    `;

    await sendEmail({
      to: user.email,
      subject: "Reset your password - EaseHub",
      html,
    });

    console.log("🔑 Password reset token:", resetToken);

    res.json({
      success: true,
      message:
        "If an account exists with that email, a reset link has been sent.",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset password
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = async (req, res, next) => {
  try {
    const { email, token, newPassword } = req.body;

    if (!email || !token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Email, token and new password are required",
      });
    }

    const user = await User.findOne({
      email,
      passwordResetToken: token,
      passwordResetExpires: { $gt: Date.now() },
    }).select("+password");

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token",
      });
    }

    user.password = newPassword; // will be hashed by pre-save hook
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    await user.save();

    res.json({
      success: true,
      message: "Password reset successfully. You can now log in.",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  verifyEmail,
  login,
  refreshToken,
  logout,
  getProfile,
  forgotPassword,
  resetPassword,
};
