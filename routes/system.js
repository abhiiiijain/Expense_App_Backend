const { getHealth, getKeepalive } = require("../controllers/system");

const router = require("express").Router();

router.get("/health", getHealth);
router.get("/keepalive", getKeepalive);
router.get("/ping", getKeepalive);

module.exports = router;
