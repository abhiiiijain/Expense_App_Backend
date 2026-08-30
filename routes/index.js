const config = require("../config/env");

function registerApiRoutes(app) {
  const api = config.apiPrefix;

  app.use(api, require("./config"));
  app.use(api, require("./auth"));
  app.use(api, require("./accounts"));
  app.use(api, require("./budgets"));
  app.use(api, require("./transfers"));
  app.use(api, require("./expenses"));
  app.use(api, require("./incomes"));
  app.use(api, require("./transactions"));
}

module.exports = { registerApiRoutes };
