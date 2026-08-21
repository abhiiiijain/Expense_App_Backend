const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { jwtSecret, jwtExpiresIn } = require("../config/env");
const { parseOpeningBalance } = require("../utils/validation");
const { HttpError } = require("../utils/HttpError");
const asyncHandler = require("../middleware/asyncHandler");

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
  openingBalance: user.openingBalance ?? 0,
  openingBalanceSet: Boolean(user.openingBalanceSet),
});

exports.register = asyncHandler(async (req, res) => {
  const { firstName = "", lastName = "", email, password, openingBalance } = req.body;
  if (!email || !password) {
    throw new HttpError(400, "Email and password are required");
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new HttpError(
      400,
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters`
    );
  }

  const openingResult = parseOpeningBalance(openingBalance);
  if (openingResult.error) {
    throw new HttpError(400, openingResult.error);
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    throw new HttpError(409, "Email already registered");
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  const user = await User.create({
    firstName,
    lastName,
    email: email.toLowerCase(),
    passwordHash,
    openingBalance: openingResult.amount ?? 0,
    openingBalanceSet: openingResult.amount !== null,
  });

  const token = generateToken(user._id.toString(), user.email);
  return res.status(201).json({
    token,
    user: formatUser(user),
  });
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    throw new HttpError(400, "Email and password are required");
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    throw new HttpError(401, "Invalid credentials");
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    throw new HttpError(401, "Invalid credentials");
  }

  const token = generateToken(user._id.toString(), user.email);
  return res.status(200).json({
    token,
    user: formatUser(user),
  });
});

exports.getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId).select(
    "firstName lastName email photo openingBalance openingBalanceSet"
  );
  if (!user) {
    throw new HttpError(404, "User not found");
  }
  return res.status(200).json(formatUser(user));
});

exports.updateOpeningBalance = asyncHandler(async (req, res) => {
  const openingResult = parseOpeningBalance(req.body.openingBalance);
  if (openingResult.error || openingResult.amount === null) {
    throw new HttpError(
      400,
      openingResult.error || "Opening balance must be a valid amount"
    );
  }

  const user = await User.findByIdAndUpdate(
    req.userId,
    {
      openingBalance: openingResult.amount,
      openingBalanceSet: true,
    },
    { new: true }
  ).select("firstName lastName email photo openingBalance openingBalanceSet");

  if (!user) {
    throw new HttpError(404, "User not found");
  }
  return res.status(200).json(formatUser(user));
});
