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
