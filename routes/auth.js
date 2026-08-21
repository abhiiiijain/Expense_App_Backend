const { register, login, getMe, updateOpeningBalance } = require("../controllers/auth");
const router = require("express").Router();
const auth = require("../middleware/auth");
const authLimiter = require("../middleware/authLimiter");

router.post("/auth/register", authLimiter, register);
router.post("/auth/login", authLimiter, login);
router.get("/auth/me", auth, getMe);
router.put("/auth/opening-balance", auth, updateOpeningBalance);

module.exports = router;

