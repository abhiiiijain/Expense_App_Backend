const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const { jwtSecret, jwtExpiresIn } = require("../config/env");

const MIN_PASSWORD_LENGTH = 6;

const generateToken = (userId, email) => {
  return jwt.sign({ userId, email }, jwtSecret, { expiresIn: jwtExpiresIn });
};

const formatUser = (user) => ({
  id: user._id,
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  photo: user.photo,
});

exports.register = async (req, res) => {
  try {
    const { firstName = "", lastName = "", email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({
        message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
      });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await User.create({
      firstName,
      lastName,
      email: email.toLowerCase(),
      passwordHash,
    });

    const token = generateToken(user._id.toString(), user.email);
    return res.status(201).json({
      token,
      user: formatUser(user),
    });
  } catch (err) {
    console.error("Register error:", err.message);
    return res.status(500).json({ message: "Server Error" });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = generateToken(user._id.toString(), user.email);
    return res.status(200).json({
      token,
      user: formatUser(user),
    });
  } catch (err) {
    console.error("Login error:", err.message);
    return res.status(500).json({ message: "Server Error" });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("firstName lastName email photo");
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.status(200).json(formatUser(user));
  } catch (err) {
    console.error("Get me error:", err.message);
    return res.status(500).json({ message: "Server Error" });
  }
};
