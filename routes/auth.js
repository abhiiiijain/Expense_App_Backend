const { register, login, getMe } = require("../controllers/auth");
const router = require("express").Router();
const auth = require("../middlewares/auth");
const authLimiter = require("../middlewares/authLimiter");

router.post("/auth/register", authLimiter, register);
router.post("/auth/login", authLimiter, login);
router.get("/auth/me", auth, getMe);

module.exports = router;

