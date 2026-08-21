const { getHealth } = require("../controllers/health");
const { getKeepalive } = require("../controllers/keepalive");

const router = require("express").Router();

router.get("/health", getHealth);
router.get("/keepalive", getKeepalive);

module.exports = router;
