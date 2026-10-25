const auth = require("./auth");
const requireAppSession = require("./appSession");
const { nodeEnv } = require("../config/env");

function protect(req, res, next) {
  auth(req, res, (error) => {
    if (error) {
      next(error);
      return;
    }
    if (nodeEnv === "development") {
      next();
      return;
    }
    requireAppSession(req, res, next);
  });
}

module.exports = protect;
