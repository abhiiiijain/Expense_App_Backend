const User = require("../models/User");

function bumpDataVersion(userId) {
  return User.updateOne({ _id: userId }, { $inc: { dataVersion: 1 } });
}

module.exports = { bumpDataVersion };
