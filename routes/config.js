const { getConfig } = require("../controllers/config");

const router = require("express").Router();

router.get("/config", getConfig);

module.exports = router;
