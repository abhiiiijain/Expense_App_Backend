const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Account = require("../models/Account");
const { jwtSecret, jwtExpiresIn } = require("../config/env");
const { parseOpeningBalance } = require("../utils/validation");
const { HttpError } = require("../utils/HttpError");
const asyncHandler = require("../middleware/asyncHandler");
const { ensureDefaultAccount } = require("./accounts");

const MIN_PASSWORD_LENGTH = 6;

const generateToken = (userId, email) => {
  return jwt.sign({ userId, email }, jwtSecret, { expiresIn: jwtExpiresIn });
};

const formatUser = (user, account) => ({
  id: user._id,
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  openingBalance: account?.openingBalance ?? 0,
  openingBalanceSet: Boolean(user.openingBalanceSet),
  pinSet: Boolean(user.pinSet),
});

async function withDefaultAccount(user, openingBalance = 0) {
  const account = await ensureDefaultAccount(user._id, openingBalance);

  // Legacy user.openingBalance → Account (once). Never overwrite if any account
  // already has an opening — that caused HDFC to inherit SBI's balance when it
  // became the default with opening 0.
  const legacy = user.openingBalance;
  if (typeof legacy === "number" && legacy > 0) {
    const alreadyHasOpening = await Account.exists({
      userId: user._id,
      openingBalance: { $gt: 0 },
    });
    if (!alreadyHasOpening && !(account.openingBalance > 0)) {
      account.openingBalance = legacy;
      await account.save();
    }
    await User.updateOne({ _id: user._id }, { $unset: { openingBalance: 1 } });
  }

  return account;
}

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
    openingBalanceSet: openingResult.amount !== null,
  });

  const account = await ensureDefaultAccount(user._id, openingResult.amount ?? 0);

  const token = generateToken(user._id.toString(), user.email);
  return res.status(201).json({
    token,
    user: formatUser(user, account),
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

  const account = await withDefaultAccount(user, user.openingBalance ?? 0);

  const token = generateToken(user._id.toString(), user.email);
  return res.status(200).json({
    token,
    user: formatUser(user, account),
  });
});

exports.getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId).select(
    "firstName lastName email openingBalance openingBalanceSet pinSet"
  );
  if (!user) {
    throw new HttpError(404, "User not found");
  }
  const account = await withDefaultAccount(user, user.openingBalance ?? 0);
  return res.status(200).json(formatUser(user, account));
});

exports.updateOpeningBalance = asyncHandler(async (req, res) => {
  const openingResult = parseOpeningBalance(req.body.openingBalance);
  if (openingResult.error || openingResult.amount === null) {
    throw new HttpError(
      400,
      openingResult.error || "Opening balance must be a valid amount"
    );
  }

  const user = await User.findById(req.userId);
  if (!user) {
    throw new HttpError(404, "User not found");
  }

  user.openingBalanceSet = true;
  await user.save();
  await User.updateOne({ _id: user._id }, { $unset: { openingBalance: 1 } });

  const account = await ensureDefaultAccount(user._id, openingResult.amount);
  account.openingBalance = openingResult.amount;
  await account.save();

  return res.status(200).json(formatUser(user, account));
});

exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    throw new HttpError(400, "Current and new password are required");
  }
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    throw new HttpError(
      400,
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters`
    );
  }

  const user = await User.findById(req.userId);
  if (!user) {
    throw new HttpError(404, "User not found");
  }

  const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isMatch) {
    throw new HttpError(401, "Current password is incorrect");
  }

  const salt = await bcrypt.genSalt(10);
  user.passwordHash = await bcrypt.hash(newPassword, salt);
  await user.save();

  return res.status(200).json({ message: "Password updated" });
});

exports.changeEmail = asyncHandler(async (req, res) => {
  const email = String(req.body.email || "")
    .trim()
    .toLowerCase();
  const { password } = req.body;

  if (!email || !password) {
    throw new HttpError(400, "Email and password are required");
  }

  const user = await User.findById(req.userId);
  if (!user) {
    throw new HttpError(404, "User not found");
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    throw new HttpError(401, "Password is incorrect");
  }

  const account = await withDefaultAccount(user, user.openingBalance ?? 0);

  if (email === user.email) {
    return res.status(200).json({
      token: generateToken(user._id.toString(), user.email),
      user: formatUser(user, account),
    });
  }

  const taken = await User.findOne({ email });
  if (taken) {
    throw new HttpError(409, "Email already registered");
  }

  user.email = email;
  await user.save();

  const token = generateToken(user._id.toString(), user.email);
  return res.status(200).json({
    token,
    user: formatUser(user, account),
  });
});
