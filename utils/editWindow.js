const { EDIT_WINDOW_MS } = require("../constants/app");

function isWithinEditWindow(createdAt, now = Date.now()) {
  const created = new Date(createdAt).getTime();
  if (!Number.isFinite(created)) return false;
  return now - created <= EDIT_WINDOW_MS;
}

function editWindowCutoff(now = Date.now()) {
  return new Date(now - EDIT_WINDOW_MS);
}

module.exports = {
  EDIT_WINDOW_MS,
  isWithinEditWindow,
  editWindowCutoff,
};
