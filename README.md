# SpendWise API

Express + MongoDB backend for [SpendWise](https://spendwise.abhiiiijain.com) — personal expense, income, transfer, and multi-account tracking.

**Live:** [https://expense-app-backend-srz0.onrender.com](https://expense-app-backend-srz0.onrender.com)

## Stack

- Node.js 18+
- Express
- MongoDB / Mongoose
- JWT login, 4-digit PIN unlock, WebAuthn (device unlock — not login)
- Helmet, CORS, auth rate limiting

## Setup

```bash
npm install
cp .env.development.example .env.development
cp .env.production.example .env.production
```

Edit the env files with your MongoDB URI, JWT secret, and CORS origins.

## Environment

| File | Used by | Git |
|------|---------|-----|
| `.env.development` | `npm run dev` | ignored |
| `.env.production` | local prod runs / reference | ignored |
| `*.example` | templates | tracked |

On **Render**, set secrets in the Dashboard (preferred over committing prod files):

| Variable | Required | Notes |
|----------|----------|--------|
| `MONGO_URL` | yes | Atlas connection string |
| `JWT_SECRET` | yes | Long random secret |
| `CORS_ORIGIN` | yes | Comma-separated frontend origins |
| `JWT_EXPIRES_IN` | yes | e.g. `7d` |
| `API_PREFIX` | yes | `/api/v1` |
| `AUTH_RATE_LIMIT_WINDOW_MS` | yes | e.g. `900000` |
| `AUTH_RATE_LIMIT_MAX` | yes | e.g. `20` |
| `LOG_LEVEL` | yes | `debug` \| `info` \| `warn` \| `error` |
| `PORT` | yes locally | Render sets this automatically |
| `NODE_ENV` | yes | `production` on Render |

Optional keep-alive vars are listed under Deploy.

Example CORS for production:

```env
CORS_ORIGIN=https://spendwise-seven-alpha.vercel.app,https://spendwise.abhiiiijain.com
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Nodemon with `.env.development` |
| `npm start` | Production server (`node server.js`) |
| `npm run lint` | ESLint |
| `npm run backup` | Export all collections JSON to `./backups/` |

On startup Mongoose `syncIndexes()` aligns indexes with the models.

## Data model

### Users and accounts

- Transactions are owned by `userId` (User `_id`), not email. Changing email does not orphan rows.
- Opening cash lives on the **default Account**, not on User. User stores `openingBalanceSet` and `dataVersion` (bumped on ledger writes; `GET /transactions/sync` returns it).
- Account types: `bank`, `cash`, `credit`, `other`. Names are unique per user.
- Credit accounts require `statementDay` and `dueDay` (1–28). Unused credit limit is not cash.
- Card bill payments are expenses with subcategory `Credit Card Payment` and optional `settlesAccountId`.

### Dates and edits

- `date` is the calendar / statement date used in month views.
- `createdAt` / `updatedAt` are Mongo timestamps (the app can align them to `date` for imports).
- Expenses, incomes, and transfers can only be edited or deleted within **24 hours of `createdAt`**.

### Indexes

| Collection | Indexes |
|------------|---------|
| expenses | `{userId, date, _id}`, `{userId, accountId}`, `{userId, subcategory}`, `{userId, updatedAt}` |
| incomes | same, except no subcategory index |
| transfers | `{userId, date, _id}`, from/to account, `{userId, updatedAt}` |
| accounts | unique `{userId, name}`, `{userId, updatedAt}` |
| budgets | unique `{userId, monthKey, category}` |

## Data durability

### Local JSON backup

```bash
NODE_ENV=development npm run backup
```

Writes `backups/<timestamp>/spendwise-backup.json` (gitignored) with expenses, incomes, transfers, accounts, budgets, and users (password hashes omitted).

### MongoDB Atlas (recommended for production)

1. Atlas → your cluster → **Backup** — enable continuous / cloud backup if available on your plan.
2. Keep a second Atlas user with read-only access for exports.
3. Connection string should include `retryWrites=true&w=majority` (Atlas default).
4. Network access: prefer locked IPs; if using Render free tier, `0.0.0.0/0` is common but rotate DB password if leaked.
5. Do **not** commit `.env.*` files with real credentials.

## API overview

`GET /` returns a liveness ping. Health lives under `API_PREFIX`.

### Public

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Liveness ping |
| `GET` | `/api/v1/health` | Readiness (includes DB status) |
| `GET` | `/api/v1/ping` | Liveness ping |
| `GET` | `/api/v1/keepalive` | Keep-alive target for the internal job |
| `GET` | `/api/v1/config` | Taxonomy, edit window, and app constants |
| `POST` | `/api/v1/auth/register` | Register |
| `POST` | `/api/v1/auth/login` | Login |

### Authenticated (Bearer JWT)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/auth/me` | Current user |
| `PUT` | `/api/v1/auth/opening-balance` | Set default account opening balance |
| `PUT` | `/api/v1/auth/password` | Change password |
| `PUT` | `/api/v1/auth/email` | Change email |
| `POST` | `/api/v1/auth/pin` | Set PIN |
| `POST` | `/api/v1/auth/pin/verify` | Unlock (issues short-lived app session) |
| `POST` | `/api/v1/auth/pin/refresh` | Refresh app session (requires app session) |
| `PUT` | `/api/v1/auth/pin` | Change PIN |
| `POST` | `/api/v1/auth/pin/reset` | Reset PIN with password |
| `POST` | `/api/v1/auth/webauthn/register/options` | WebAuthn register options |
| `POST` | `/api/v1/auth/webauthn/register` | Store device credential |
| `POST` | `/api/v1/auth/webauthn/authenticate/options` | WebAuthn unlock options |
| `POST` | `/api/v1/auth/webauthn/authenticate` | Device unlock |
| `DELETE` | `/api/v1/auth/webauthn` | Remove device credentials |
| `GET` | `/api/v1/accounts` | List accounts with live balances |
| `POST` | `/api/v1/accounts` | Create account (credit requires bill/due days) |
| `PUT` | `/api/v1/accounts/:id` | Update account |
| `DELETE` | `/api/v1/accounts/:id` | Delete unused account |
| `GET` | `/api/v1/transactions` | Month (`monthKey`: accounts + balances + that period’s rows), search (`q`), or date range (`from`/`to`) |
| `GET` | `/api/v1/transactions/stats` | Lifetime category / month spend totals |
| `GET` | `/api/v1/transactions/sync` | `dataVersion` stamp for dashboard polling |
| `POST` | `/api/v1/add-expense` | Add expense |
| `PUT` | `/api/v1/update-expense/:id` | Update expense |
| `DELETE` | `/api/v1/delete-expense/:id` | Delete expense |
| `POST` | `/api/v1/add-income` | Add income |
| `PUT` | `/api/v1/update-income/:id` | Update income |
| `DELETE` | `/api/v1/delete-income/:id` | Delete income |
| `POST` | `/api/v1/transfers` | Transfer between accounts |
| `DELETE` | `/api/v1/transfers/:id` | Delete transfer |
| `GET` | `/api/v1/budgets` | Month budgets |
| `PUT` | `/api/v1/budgets` | Upsert a category budget |

WebAuthn is **device unlock**, not a replacement for email/password login.

## Deploy (Render)

1. Create a **Web Service** from this repo.
2. **Build Command:** `npm install`
3. **Start Command:** `npm start`
4. **Health Check Path:** `/api/v1/health`
5. Set Dashboard env vars (`MONGO_URL`, `JWT_SECRET`, `CORS_ORIGIN`, plus the non-secret defaults from `render.yaml`).
6. Allow your Atlas cluster to accept connections from Render (`0.0.0.0/0` or Render IPs).

### Keep free tier awake

On Render, the API starts an **internal job** that `GET`s its own public URL:

```text
GET {RENDER_EXTERNAL_URL}/api/v1/keepalive
```

every 10 minutes by default (`KEEP_ALIVE_INTERVAL_MS=600000`). That keeps the free instance from idle-sleeping while the process is running.

Optional env vars:

| Variable | Default | Notes |
|----------|---------|--------|
| `KEEP_ALIVE_ENABLED` | `true` when `RENDER_EXTERNAL_URL` is set | Set `false` to disable |
| `KEEP_ALIVE_INTERVAL_MS` | `600000` | Min 30000 |
| `KEEP_ALIVE_URL` | `{RENDER_EXTERNAL_URL}{API_PREFIX}/keepalive` | Override if needed |

Note: this cannot wake an instance that is already asleep; the first visitor after sleep still pays cold-start cost.

Blueprint reference: `render.yaml`.

## Project layout

```text
app.js                 Express app
server.js              Process entry (listen + DB connect + keep-alive job)
config/env.js          Mode-based env loading
constants/             PIN, edit window, service name
controllers/           Route handlers
../shared/taxonomy.json  Expense/income categories (shared with the app)
db/                    Mongo connect + index sync
jobs/                  Background jobs (keep-alive)
middleware/            Auth, PIN session, rate limit, logging
models/                User, Account, Expense, Income, Transfer, Budget
routes/                Route modules
scripts/backup.js      JSON export
utils/                 Logger, validation, credit-card matching, HttpError
```
