import "dotenv/config";
import app from "./app";
import { clearAllTimers } from "./services/streamService";
import { logger } from "./utils/logger";

const PORT = process.env.PORT || 3000;
const SHUTDOWN_TIMEOUT_MS = Number(process.env.SHUTDOWN_TIMEOUT_MS) || 10_000;

const server = app.listen(PORT, () => {
  logger.info(`StreamPayAfrica API running on http://localhost:${PORT}`);
});

function shutdown(signal: string) {
  logger.info(`${signal} received, shutting down...`);
  clearAllTimers();

  // server.close() waits for in-flight requests to finish, but a stuck or
  // keep-alive connection could otherwise block shutdown indefinitely.
  const forceExit = setTimeout(() => {
    logger.warn("Graceful shutdown timed out, forcing exit");
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  forceExit.unref();

  server.close(() => {
    clearTimeout(forceExit);
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

// Last-resort safety net: log what would otherwise be a silent crash (or a
// bare stack trace on stderr) through the structured logger before exiting,
// so production log aggregation actually captures the cause.
process.on("uncaughtException", (err) => {
  logger.error("Uncaught exception, shutting down", { error: err.message, stack: err.stack });
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled promise rejection, shutting down", {
    error: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
  });
  process.exit(1);
});
