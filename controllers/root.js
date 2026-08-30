const { serviceName } = require("../constants/app");
const { getUptime } = require("../utils/uptime");
const config = require("../config/env");

function listEndpoints(_req, res) {
  const api = config.apiPrefix;

  return res.status(200).json({
    status: "ok",
    service: serviceName,
    ...getUptime(),
    endpoints: {
      public: [
        { method: "GET", path: "/", description: "API index and uptime" },
        { method: "GET", path: `${api}/health`, description: "Readiness (DB check)" },
        { method: "GET", path: `${api}/ping`, description: "Liveness ping" },
        { method: "GET", path: `${api}/config`, description: "App config & taxonomy" },
        { method: "POST", path: `${api}/auth/register`, description: "Register" },
        { method: "POST", path: `${api}/auth/login`, description: "Login" },
      ],
      authenticated: [
        { method: "GET", path: `${api}/auth/me`, description: "Current user" },
        { method: "PUT", path: `${api}/auth/email`, description: "Change email" },
        { method: "PUT", path: `${api}/auth/password`, description: "Change password" },
        {
          method: "PUT",
          path: `${api}/auth/opening-balance`,
          description: "Set default account opening balance",
        },
        { method: "GET", path: `${api}/accounts`, description: "List accounts" },
        { method: "POST", path: `${api}/accounts`, description: "Create account" },
        { method: "PUT", path: `${api}/accounts/:id`, description: "Update account" },
        { method: "DELETE", path: `${api}/accounts/:id`, description: "Delete account" },
        { method: "GET", path: `${api}/budgets`, description: "List category budgets" },
        { method: "PUT", path: `${api}/budgets`, description: "Upsert category budget" },
        { method: "POST", path: `${api}/transfers`, description: "Transfer between accounts" },
        { method: "DELETE", path: `${api}/transfers/:id`, description: "Delete transfer" },
        {
          method: "GET",
          path: `${api}/transactions`,
          description: "List expenses, incomes, and transfers (?month=YYYY-MM or ?days=N)",
        },
        { method: "POST", path: `${api}/add-expense`, description: "Add expense" },
        { method: "PUT", path: `${api}/update-expense/:id`, description: "Update expense" },
        { method: "DELETE", path: `${api}/delete-expense/:id`, description: "Delete expense" },
        { method: "POST", path: `${api}/add-income`, description: "Add income" },
        { method: "PUT", path: `${api}/update-income/:id`, description: "Update income" },
        { method: "DELETE", path: `${api}/delete-income/:id`, description: "Delete income" },
      ],
    },
  });
}

module.exports = { listEndpoints };
