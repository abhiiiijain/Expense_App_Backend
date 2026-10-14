const auth = require("./auth");
const requireAppSession = require("./appSession");

function protect(req, res, next) {
  auth(req, res, (error) => {
    if (error) {
      next(error);
      return;
    }
    requireAppSession(req, res, next);
  });
}

module.exports = protect;
