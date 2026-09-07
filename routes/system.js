const { getHealth, getPing, getKeepAlive } = require("../controllers/system");

const router = require("express").Router();

router.get("/health", getHealth);
router.get("/ping", getPing);
router.get("/keepalive", getKeepAlive);

module.exports = router;
