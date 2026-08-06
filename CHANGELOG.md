# Changelog

Notable changes to StreamPay Africa. Format loosely follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased] - 2026-08-06

### Fixed

- `createStream` now rejects `ratePerInterval` values with more than 7 decimal places or
  non-plain-decimal notation (e.g. `1e5`) up front. Previously these passed validation and only
  failed with a generic Stellar SDK error the first time the stream ticked.
- Interval-driven stream ticks no longer crash the process if persisting the updated stream state
  fails (e.g. a `FileStreamStore` disk write error). `setInterval` doesn't await `tick()`, so an
  uncaught throw there was an unhandled promise rejection — fatal on Node 18+. The failure is now
  caught and logged instead.
- `logger.error/warn/info/debug` silently dropped the human-readable `message` argument whenever
  the `meta` object also had a `message` key (several call sites did this via `message: err.message`).
  Renamed those call sites to `error` and reordered the logger's field spread so `meta` can no
  longer shadow `message`.
- `HORIZON_URL` now defaults to the Horizon instance matching `NETWORK` (mainnet vs. testnet)
  instead of always defaulting to testnet. Previously, setting `NETWORK=mainnet` without also
  overriding `HORIZON_URL` signed transactions with the mainnet passphrase while submitting them to
  testnet Horizon, failing signature verification on every transaction.
- The Friendbot `fetch` call in `fundWallet` had no timeout and could hang indefinitely on a
  network stall; it's now capped at 10s via `AbortSignal.timeout()`.

### Added

- `esc()` HTML-escaping helper in the frontend dashboard, applied to every dynamic value
  interpolated into `innerHTML` (API error messages that echo user input, stream fields, Horizon
  payment records) as defense-in-depth against HTML/script injection.
- `npm audit --audit-level=high` as a CI step, so a dependency with a known high/critical
  vulnerability fails the build instead of going unnoticed.

## [Unreleased] - 2026-08-05

### Added

- Optional file-based persistence for streams (`STREAM_STORE=file`), so stream metadata survives a
  process restart instead of living only in memory. Streams that were `active` reload as `paused`
  since secret keys are never persisted.
- `StreamStore` interface decoupling stream storage from the Stellar payment logic in
  `streamService.ts`, with `MemoryStreamStore` (default) and `FileStreamStore` implementations.
- Structured, leveled logging (`src/utils/logger.ts`, `LOG_LEVEL`) in place of bare `console.*`
  calls.
- `asyncHandler` and `requireFields` utilities, removing duplicated try/catch and manual field
  checks from every route.
- Support for multiple comma-separated `CORS_ORIGIN` values.
- Forced-exit timeout (`SHUTDOWN_TIMEOUT_MS`) as a safety net around graceful shutdown.
- Expanded `GET /health` with uptime, active network, and timestamp.
- `Dockerfile` (multi-stage) and `docker-compose.yml` for containerized deployment with a
  persistent volume.

### Fixed

- Backend `package.json` name typo (`streampayadfrica-backend` → `streampay-africa-backend`);
  added `license`, `repository`, and `keywords` fields.

### Changed

- README updated throughout to document the above (environment variables, architecture tree,
  Docker usage, production considerations).
