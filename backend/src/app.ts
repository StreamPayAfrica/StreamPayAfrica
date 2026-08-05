import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import walletRoutes from "./routes/wallet";
import streamRoutes from "./routes/streams";
import webhookRoutes from "./routes/webhooks";
import { statusCodeFor } from "./utils/errors";

/** Accepts "*", a single origin, or a comma-separated list of allowed origins. */
export function resolveCorsOrigin(): string | string[] {
  const raw = process.env.CORS_ORIGIN || "*";
  if (raw === "*") return raw;
  const origins = raw
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  return origins.length <= 1 ? (origins[0] ?? "*") : origins;
}

const CORS_ORIGIN = resolveCorsOrigin();
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS) || 60_000;
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX) || 60;

const app = express();

app.use(helmet());
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json({ limit: "10kb" }));
app.use(
  "/api",
  rateLimit({
    windowMs: RATE_LIMIT_WINDOW_MS,
    limit: RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.use("/api/wallet", walletRoutes);
app.use("/api/streams", streamRoutes);
app.use("/api/webhooks", webhookRoutes);

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Not found" });
});

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Malformed JSON body" });
  }
  if (err.type === "entity.too.large") {
    return res.status(413).json({ error: "Request body too large" });
  }
  console.error("Unhandled error:", err);
  res.status(statusCodeFor(err)).json({ error: err.message || "Internal server error" });
});

export default app;
