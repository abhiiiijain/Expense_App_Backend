const { getHealth, getPing } = require("../controllers/system");

const router = require("express").Router();

router.get("/health", getHealth);
router.get("/ping", getPing);

module.exports = router;
