const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { HttpError } = require("../utils/HttpError");
const asyncHandler = require("../middleware/asyncHandler");
const { issueAppSession } = require("../utils/appSessionToken");
const { PIN_LENGTH, PIN_PATTERN, PIN_MAX_ATTEMPTS, PIN_LOCKOUT_MS } = require("../constants/app");

const attempts = new Map();

function assertPinFormat(pin) {
  if (!PIN_PATTERN.test(String(pin || ""))) {
    throw new HttpError(400, `PIN must be ${PIN_LENGTH} digits`);
  }
}

function attemptKey(userId) {
  return String(userId);
}

function assertPinAttempts(userId) {
  const entry = attempts.get(attemptKey(userId));
  if (!entry) return;

  if (entry.lockedUntil && entry.lockedUntil > Date.now()) {
    throw new HttpError(
      429,
      "Too many PIN attempts. Try again in a few minutes.",
      "PIN_LOCKED"
    );
  }

  if (entry.lockedUntil && entry.lockedUntil <= Date.now()) {
    attempts.delete(attemptKey(userId));
  }
}

function recordPinFailure(userId) {
  const key = attemptKey(userId);
  const entry = attempts.get(key) || { count: 0, lockedUntil: 0 };
  if (entry.lockedUntil && entry.lockedUntil <= Date.now()) {
    entry.count = 0;
    entry.lockedUntil = 0;
  }
  entry.count += 1;
  if (entry.count >= PIN_MAX_ATTEMPTS) {
    entry.lockedUntil = Date.now() + PIN_LOCKOUT_MS;
    entry.count = 0;
  }
  attempts.set(key, entry);
}

function clearPinFailures(userId) {
  attempts.delete(attemptKey(userId));
}

async function loadUser(userId) {
  const user = await User.findById(userId).select("+pinHash");
  if (!user) {
    throw new HttpError(404, "User not found");
  }
  return user;
}

async function savePin(user, pin) {
  const pinHash = await bcrypt.hash(String(pin), 10);
  await User.updateOne({ _id: user._id }, { $set: { pinHash, pinSet: true } });
  clearPinFailures(user._id);
}

async function requireMatchingPin(user, pin) {
  if (!user.pinHash) {
    throw new HttpError(400, "Set a PIN first");
  }

  const matches = await bcrypt.compare(String(pin), user.pinHash);
  if (!matches) {
    recordPinFailure(user._id);
    throw new HttpError(400, "Incorrect PIN");
  }

  clearPinFailures(user._id);
}

exports.setupPin = asyncHandler(async (req, res) => {
  assertPinFormat(req.body.pin);
  const user = await loadUser(req.userId);
  if (user.pinSet || user.pinHash) {
    throw new HttpError(409, "PIN is already set");
  }

  await savePin(user, String(req.body.pin));
  return res.status(200).json({
    appSession: issueAppSession(user._id),
    pinSet: true,
  });
});

exports.verifyPin = asyncHandler(async (req, res) => {
  assertPinFormat(req.body.pin);
  assertPinAttempts(req.userId);
  const user = await loadUser(req.userId);
  await requireMatchingPin(user, req.body.pin);
  return res.status(200).json({ appSession: issueAppSession(user._id) });
});

exports.refreshAppSession = asyncHandler(async (req, res) => {
  return res.status(200).json({ appSession: issueAppSession(req.userId) });
});

exports.changePin = asyncHandler(async (req, res) => {
  assertPinFormat(req.body.currentPin);
  assertPinFormat(req.body.pin);
  assertPinAttempts(req.userId);

  const user = await loadUser(req.userId);
  await requireMatchingPin(user, req.body.currentPin);

  if (String(req.body.pin) === String(req.body.currentPin)) {
    throw new HttpError(400, "Choose a different PIN");
  }

  await savePin(user, String(req.body.pin));
  return res.status(200).json({ message: "PIN updated" });
});

exports.resetPin = asyncHandler(async (req, res) => {
  const { password, pin } = req.body;
  if (!password) {
    throw new HttpError(400, "Password is required");
  }
  assertPinFormat(pin);
  assertPinAttempts(req.userId);

  const user = await loadUser(req.userId);
  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    recordPinFailure(req.userId);
    throw new HttpError(400, "Password is incorrect");
  }

  await savePin(user, String(pin));
  return res.status(200).json({
    appSession: issueAppSession(user._id),
    pinSet: true,
  });
});
