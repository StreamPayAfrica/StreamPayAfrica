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
├── backend/                  # Node.js + TypeScript API
│   ├── src/
│   │   ├── index.ts          # Express app entry point
│   │   ├── routes/
│   │   │   ├── wallet.ts     # Wallet endpoints
│   │   │   ├── streams.ts    # Stream CRUD + controls
│   │   │   └── webhooks.ts   # Payment history
│   │   └── services/
│   │       ├── walletService.ts   # Stellar keypair + Friendbot + balance
│   │       └── streamService.ts  # Stream state machine + Stellar payments
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
└── frontend/
    └── index.html            # Single-page dashboard
```

The backend uses an **in-memory store** for stream state (suitable for demos and development). For production, replace the `Map` in `streamService.ts` with a database.

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

Open `frontend/index.html` directly in your browser. No build step required.

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

Stream statuses: `paused` → `active` → `paused` / `stopped`

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
| `NETWORK` | `testnet` | `testnet` or `mainnet` |
| `HORIZON_URL` | Testnet Horizon | Custom Horizon endpoint |

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Blockchain | [Stellar](https://stellar.org) (XLM, Horizon API) |
| Backend | Node.js, TypeScript, Express |
| Stellar SDK | `@stellar/stellar-sdk` v12 |
| Frontend | Vanilla HTML/CSS/JS |

---

## Production Considerations

- **Persist stream state** — replace the in-memory `Map` in `streamService.ts` with PostgreSQL or Redis
- **Secret key handling** — never send secret keys over the wire in production; use a signing service or hardware wallet
- **Rate limiting** — add rate limiting to the API (e.g., `express-rate-limit`)
- **HTTPS** — terminate TLS at a reverse proxy (nginx, Caddy) in front of the Node server
- **Mainnet** — set `NETWORK=mainnet` and update `HORIZON_URL` to `https://horizon.stellar.org`

---

## License

MIT
