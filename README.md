# SpendWise API

Express + MongoDB backend for [SpendWise](https://spendwise.abhiiiijain.com) — personal expense and income tracking.

**Live:** [https://expense-app-backend-srz0.onrender.com](https://expense-app-backend-srz0.onrender.com)

## Stack

- Node.js 18+
- Express
- MongoDB / Mongoose
- JWT auth, Helmet, CORS, auth rate limiting

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

## API overview

`GET /` returns service status, uptime, and the full endpoint list.

### Public

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | API index + uptime |
| `GET` | `/api/v1/health` | Readiness (includes DB status) |
| `GET` | `/api/v1/ping` | Liveness ping |
| `POST` | `/api/v1/auth/register` | Register |
| `POST` | `/api/v1/auth/login` | Login |

### Authenticated (Bearer JWT)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/auth/me` | Current user |
| `PUT` | `/api/v1/auth/opening-balance` | Update opening balance |
| `GET` | `/api/v1/transactions` | List expenses & incomes |
| `POST` | `/api/v1/add-expense` | Add expense |
| `DELETE` | `/api/v1/delete-expense/:id` | Delete expense |
| `POST` | `/api/v1/add-income` | Add income |
| `DELETE` | `/api/v1/delete-income/:id` | Delete income |

## Deploy (Render)

1. Create a **Web Service** from this repo.
2. **Build Command:** `npm install`
3. **Start Command:** `npm start`
4. **Health Check Path:** `/api/v1/health`
5. Set Dashboard env vars (`MONGO_URL`, `JWT_SECRET`, `CORS_ORIGIN`, plus the non-secret defaults from `render.yaml`).
6. Allow your Atlas cluster to accept connections from Render (`0.0.0.0/0` or Render IPs).

### Keep free tier awake

Ping every ~30 seconds (UptimeRobot, cron-job.org, etc.):

```text
GET https://expense-app-backend-srz0.onrender.com/api/v1/ping
```

Blueprint reference: `render.yaml`.

## Project layout

```text
app.js                 Express app
server.js              Process entry (listen + DB connect)
config/env.js          Mode-based env loading
controllers/           Route handlers
middleware/            Auth, rate limit, logging, asyncHandler
models/                Mongoose models
routes/                Route modules
utils/                 Logger, validation, uptime, HttpError
```
