const { EDIT_WINDOW_MS } = require("../constants/app");

function formatEditWindowLabel(ms = EDIT_WINDOW_MS) {
  const hours = ms / (60 * 60 * 1000);
  if (Number.isInteger(hours) && hours >= 1) {
    return hours === 1 ? "1 hour" : `${hours} hours`;
  }

  const days = ms / (24 * 60 * 60 * 1000);
  if (Number.isInteger(days) && days >= 1) {
    return days === 1 ? "1 day" : `${days} days`;
  }

  return `${Math.round(ms / (60 * 60 * 1000))} hours`;
}

function editWindowErrorMessage(action = "edited") {
  return `Transactions can only be ${action} within ${formatEditWindowLabel()} of creation`;
}

function editWindowCutoff(now = Date.now()) {
  return new Date(now - EDIT_WINDOW_MS);
}

module.exports = {
  editWindowErrorMessage,
  editWindowCutoff,
};
