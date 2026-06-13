const { getKeepalive } = require("../controllers/keepalive");

const router = require("express").Router();

router.get("/keepalive", getKeepalive);

module.exports = router;
