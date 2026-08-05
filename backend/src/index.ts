import "dotenv/config";
import app from "./app";
import { clearAllTimers } from "./services/streamService";
import { logger } from "./utils/logger";

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  logger.info(`StreamPayAfrica API running on http://localhost:${PORT}`);
});

function shutdown(signal: string) {
  logger.info(`${signal} received, shutting down...`);
  clearAllTimers();
  server.close(() => process.exit(0));
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
