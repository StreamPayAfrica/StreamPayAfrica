# Changelog

Notable changes to StreamPay Africa. Format loosely follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

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
