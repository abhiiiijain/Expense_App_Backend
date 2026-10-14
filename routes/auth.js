const {
  register,
  login,
  getMe,
  updateOpeningBalance,
  changePassword,
  changeEmail,
} = require("../controllers/auth");
const { setupPin, verifyPin, refreshAppSession, changePin, resetPin } = require("../controllers/pin");
const router = require("express").Router();
const auth = require("../middleware/auth");
const requireAppSession = require("../middleware/appSession");
const authLimiter = require("../middleware/authLimiter");

router.post("/auth/register", authLimiter, register);
router.post("/auth/login", authLimiter, login);
router.get("/auth/me", auth, getMe);
router.put("/auth/opening-balance", auth, updateOpeningBalance);
router.put("/auth/password", auth, authLimiter, changePassword);
router.put("/auth/email", auth, authLimiter, changeEmail);
router.post("/auth/pin", auth, authLimiter, setupPin);
router.post("/auth/pin/verify", auth, authLimiter, verifyPin);
router.post("/auth/pin/refresh", auth, requireAppSession, refreshAppSession);
router.put("/auth/pin", auth, authLimiter, changePin);
router.post("/auth/pin/reset", auth, authLimiter, resetPin);

module.exports = router;
