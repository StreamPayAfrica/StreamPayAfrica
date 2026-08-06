# StreamPay Africa

Real-time income streaming for informal workers, built on the [Stellar](https://stellar.org) blockchain.

StreamPay Africa lets employers or clients stream XLM payments continuously to workers — barbers, freelancers, delivery riders, domestic workers — so they receive money as they work instead of waiting for end-of-day or end-of-week payouts. It targets emerging markets like Nigeria where access to reliable financial infrastructure is limited.

---

## Features

- **Wallet management** — generate Stellar keypairs, fund testnet wallets via Friendbot, check XLM balances
- **Payment streams** — create streams with a configurable rate (XLM per interval) and interval (milliseconds)
- **Stream controls** — start, pause, and stop streams at any time
- **Payment history** — query recent on-chain payments for any account via Horizon
- **REST API** — clean JSON API consumed by the frontend or any third-party client
- **Web dashboard** — single-page UI to manage wallets and streams without writing code

---

## Architecture

```
StreamPayAfrica/
├── .github/workflows/ci.yml  # Lint + build + test on push/PR
├── docker-compose.yml        # Runs the backend + persistent volume via Docker
├── backend/                  # Node.js + TypeScript API
│   ├── Dockerfile            # Multi-stage build: compile, then ship prod deps only
│   ├── src/
│   │   ├── app.ts            # Express app: middleware, routes, error handling
│   │   ├── index.ts          # Process entry point: starts app.ts, graceful shutdown
│   │   ├── routes/
│   │   │   ├── wallet.ts     # Wallet endpoints
│   │   │   ├── streams.ts    # Stream CRUD + controls
│   │   │   └── webhooks.ts   # Payment history
│   │   ├── services/
│   │   │   ├── walletService.ts    # Stellar keypair + Friendbot + balance
│   │   │   ├── streamService.ts    # Stream state machine + Stellar payments
│   │   │   ├── streamStore.ts      # StreamStore interface + in-memory implementation
│   │   │   └── fileStreamStore.ts  # Optional disk-backed StreamStore (STREAM_STORE=file)
│   │   └── utils/
│   │       ├── errors.ts         # Typed ValidationError/NotFoundError + status mapping
│   │       ├── logger.ts         # Leveled, structured logging (LOG_LEVEL)
│   │       ├── asyncHandler.ts   # Forwards async route rejections to the error middleware
│   │       └── requireFields.ts  # Middleware asserting required request body fields
│   ├── test/                 # Jest + Supertest test suite
│   ├── .env.example
│   ├── eslint.config.js
│   ├── package.json
│   └── tsconfig.json
└── frontend/
    └── index.html            # Single-page dashboard
```

The backend stores stream state behind a `StreamStore` interface (`streamStore.ts`). It defaults to
an in-memory `Map`, suitable for demos and development; set `STREAM_STORE=file` to persist to disk
instead (see [Environment Variables](#environment-variables)).

---

## Prerequisites

- Node.js 18+
- npm 9+

---

## Getting Started

### 1. Install dependencies

```bash
cd backend
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env if needed (defaults work for testnet)
```

### 3. Start the API server

```bash
# Development (ts-node, auto-reloads with nodemon if installed)
npm run dev

# Production build
npm run build
npm start
```

The API listens on `http://localhost:3000` by default.

### 4. Open the dashboard

Open `frontend/index.html` directly in your browser. No build step required. It defaults to
`http://localhost:3000/api`; use the "API Server" field at the top to point it at a different
backend (saved in `localStorage`).

---

## API Reference

Base URL: `http://localhost:3000/api`

### Wallet

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/wallet` | Generate a new Stellar keypair |
| `POST` | `/wallet/fund` | Fund a testnet wallet via Friendbot |
| `GET` | `/wallet/:publicKey/balance` | Get XLM balance |

**POST /wallet** — response:
```json
{
  "publicKey": "G...",
  "secretKey": "S..."
}
```

**POST /wallet/fund** — body:
```json
{ "publicKey": "G..." }
```

**GET /wallet/:publicKey/balance** — response:
```json
{ "publicKey": "G...", "balance": "10000.0000000", "asset": "XLM" }
```

---

### Streams

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/streams` | Create a new stream |
| `GET` | `/streams` | List all streams (filter with `?publicKey=`) |
| `GET` | `/streams/:id` | Get a single stream |
| `POST` | `/streams/:id/start` | Start streaming payments |
| `POST` | `/streams/:id/pause` | Pause the stream |
| `POST` | `/streams/:id/stop` | Stop the stream permanently |

**POST /streams** — body:
```json
{
  "senderPublicKey": "G...",
  "recipientPublicKey": "G...",
  "ratePerInterval": "0.1",
  "intervalMs": 5000
}
```

Validation: `senderPublicKey`/`recipientPublicKey` must be valid Stellar public keys and must differ,
`ratePerInterval` must be a positive plain-decimal number with at most 7 decimal places (Stellar's
precision limit), and `intervalMs` must be an integer of at least 1000 (1 second).
`POST /streams/:id/start` also verifies that `senderSecretKey` decodes to the stream's
`senderPublicKey` before starting.

**POST /streams/:id/start** — body:
```json
{ "senderSecretKey": "S..." }
```

Stream object:
```json
{
  "id": "uuid",
  "senderPublicKey": "G...",
  "recipientPublicKey": "G...",
  "ratePerInterval": "0.1",
  "intervalMs": 5000,
  "status": "active",
  "totalSent": "0.3000000",
  "createdAt": "2026-05-08T13:00:00.000Z",
  "lastPaymentAt": "2026-05-08T13:00:15.000Z"
}
```

Stream statuses: created `paused`, toggles freely between `paused` ⇄ `active`, and `stopped` is a
terminal state — a stopped stream cannot be restarted. If a payment fails (e.g. the recipient
account doesn't exist on-chain), the stream automatically moves to `paused`.

---

### Payment History

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/webhooks/payments/:publicKey` | Last 10 on-chain payments |

---

## Quick Demo (testnet)

```bash
# 1. Create two wallets
curl -X POST http://localhost:3000/api/wallet
# → save publicKey + secretKey as SENDER_PUB / SENDER_SEC

curl -X POST http://localhost:3000/api/wallet
# → save publicKey as RECIPIENT_PUB

# 2. Fund the sender
curl -X POST http://localhost:3000/api/wallet/fund \
  -H "Content-Type: application/json" \
  -d '{"publicKey":"<SENDER_PUB>"}'

# 3. Create a stream (0.1 XLM every 5 seconds)
curl -X POST http://localhost:3000/api/streams \
  -H "Content-Type: application/json" \
  -d '{
    "senderPublicKey":"<SENDER_PUB>",
    "recipientPublicKey":"<RECIPIENT_PUB>",
    "ratePerInterval":"0.1",
    "intervalMs":5000
  }'
# → save stream id as STREAM_ID

# 4. Start the stream
curl -X POST http://localhost:3000/api/streams/<STREAM_ID>/start \
  -H "Content-Type: application/json" \
  -d '{"senderSecretKey":"<SENDER_SEC>"}'

# 5. Check recipient balance after a few seconds
curl http://localhost:3000/api/wallet/<RECIPIENT_PUB>/balance

# 6. Stop the stream
curl -X POST http://localhost:3000/api/streams/<STREAM_ID>/stop
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | API server port |
| `LOG_LEVEL` | `info` | Minimum level logged: `debug`, `info`, `warn`, or `error` |
| `NETWORK` | `testnet` | `testnet` or `mainnet` |
| `HORIZON_URL` | Horizon matching `NETWORK` | Custom Horizon endpoint; overrides the per-network default |
| `CORS_ORIGIN` | `*` | Allowed CORS origin(s); a single origin or a comma-separated list, set to your frontend's origin(s) in production |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Rate limit window, in milliseconds |
| `RATE_LIMIT_MAX` | `60` | Max requests per IP per window across all `/api` routes |
| `STREAM_STORE` | `memory` | `memory` (lost on restart) or `file` (persisted as JSON on disk) |
| `STREAM_STORE_PATH` | `./data/streams.json` | Path to the JSON file when `STREAM_STORE=file` |
| `SHUTDOWN_TIMEOUT_MS` | `10000` | Max time to wait for in-flight requests during shutdown before forcing exit |

---

## Running with Docker

```bash
docker compose up --build
```

This builds the backend from `backend/Dockerfile` (multi-stage: compiles TypeScript, then ships
only production dependencies + compiled output), runs it on `http://localhost:3000`, and persists
stream data in a named volume via `STREAM_STORE=file`. Override any environment variable in
`docker-compose.yml` (e.g. `NETWORK`, `CORS_ORIGIN`) to point at a different Stellar network or
frontend origin.

---

## Development

From `backend/`:

```bash
npm test        # run the Jest test suite
npm run lint     # check formatting and lint rules
npm run lint:fix # auto-fix formatting and lint issues
```

Service-layer tests mock only the Stellar network boundary (`server.loadAccount`,
`submitTransaction`, `payments`), so they run offline. Route tests mock the service layer to
exercise request validation and HTTP status codes in isolation. CI (`.github/workflows/ci.yml`)
runs lint, build, and test on Node 18.x and 20.x for every push and pull request to `main`.

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Blockchain | [Stellar](https://stellar.org) (XLM, Horizon API) |
| Backend | Node.js, TypeScript, Express |
| Stellar SDK | `@stellar/stellar-sdk` v12 |
| Security | `helmet`, `express-rate-limit`, configurable CORS |
| Testing | Jest, Supertest |
| Linting | ESLint (typescript-eslint), Prettier |
| Deployment | Docker (multi-stage build), docker-compose |
| Frontend | Vanilla HTML/CSS/JS (API base URL configurable in the UI) |

---

## Production Considerations

Already handled:

- **Input validation** — Stellar keys, rates, and intervals are validated before use; typed errors
  map to correct HTTP status codes
- **Security headers & rate limiting** — `helmet` and a configurable per-IP rate limiter are on by
  default (see [Environment Variables](#environment-variables))
- **Graceful shutdown** — `SIGINT`/`SIGTERM` clear in-flight stream timers and let in-flight
  requests finish, with a forced-exit timeout (`SHUTDOWN_TIMEOUT_MS`) as a safety net
- **Structured logging** — leveled, JSON-formatted logs via `LOG_LEVEL` instead of bare `console.*`
- **Stream persistence** — set `STREAM_STORE=file` to persist stream metadata to disk across
  restarts (see [Environment Variables](#environment-variables)); streams that were `active` reload
  as `paused` since secret keys are never stored, so they must be explicitly restarted
- **Containerized deployment** — a multi-stage `Dockerfile` and `docker-compose.yml` for running the
  backend with a persistent volume (see [Running with Docker](#running-with-docker))
- **Crash-resilient stream ticking** — a persistence failure on a scheduled stream payment (e.g. a
  disk write error under `STREAM_STORE=file`) is caught and logged instead of becoming an unhandled
  promise rejection that would otherwise take down the whole process
- **Dependency security gate** — CI runs `npm audit --audit-level=high` so a dependency with a known
  high/critical vulnerability fails the build

Still open — these are demo simplifications that need real infrastructure before production use:

- **Durable storage at scale** — the `file` store is fine for a single instance; a real deployment
  should replace `FileStreamStore` (see `backend/src/services/streamStore.ts`) with a PostgreSQL- or
  Redis-backed implementation
- **Secret key handling** — never send secret keys over the wire in production; use a signing service or hardware wallet
- **HTTPS** — terminate TLS at a reverse proxy (nginx, Caddy) in front of the Node server
- **Mainnet** — set `NETWORK=mainnet`; `HORIZON_URL` defaults to `https://horizon.stellar.org`
  automatically unless overridden

---

## License

MIT
