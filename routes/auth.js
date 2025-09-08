const { register, login, getMe } = require("../controllers/auth");
const router = require("express").Router();
const auth = require("../middlewares/auth");

router.post("/auth/register", register);
router.post("/auth/login", login);
router.get("/auth/me", auth, getMe);

module.exports = router;

