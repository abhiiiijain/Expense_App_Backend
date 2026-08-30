const {
  register,
  login,
  getMe,
  updateOpeningBalance,
  changePassword,
  changeEmail,
} = require("../controllers/auth");
const router = require("express").Router();
const auth = require("../middleware/auth");
const authLimiter = require("../middleware/authLimiter");

router.post("/auth/register", authLimiter, register);
router.post("/auth/login", authLimiter, login);
router.get("/auth/me", auth, getMe);
router.put("/auth/opening-balance", auth, updateOpeningBalance);
router.put("/auth/password", auth, authLimiter, changePassword);
router.put("/auth/email", auth, authLimiter, changeEmail);

module.exports = router;
