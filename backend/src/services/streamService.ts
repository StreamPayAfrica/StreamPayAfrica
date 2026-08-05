import { Asset, Keypair, Operation, TransactionBuilder } from "@stellar/stellar-sdk";
import { randomUUID } from "crypto";
import {
  assertValidPublicKey,
  assertValidSecretKey,
  server,
  NETWORK_PASSPHRASE,
} from "./walletService";
import { NotFoundError, ValidationError } from "../utils/errors";

/** Minimum interval to avoid hammering Horizon / burning fees on tiny streams. */
const MIN_INTERVAL_MS = 1000;

export type StreamStatus = "active" | "paused" | "stopped";

export interface Stream {
  id: string;
  senderPublicKey: string;
  recipientPublicKey: string;
  /** XLM per interval */
  ratePerInterval: string;
  /** Interval in milliseconds */
  intervalMs: number;
  status: StreamStatus;
  totalSent: string;
  createdAt: string;
  lastPaymentAt: string | null;
}

// In-memory store (replace with DB in production)
const streams = new Map<string, Stream>();
const timers = new Map<string, NodeJS.Timeout>();
const ticking = new Set<string>();

export function createStream(
  senderPublicKey: string,
  recipientPublicKey: string,
  ratePerInterval: string,
  intervalMs: number
): Stream {
  assertValidPublicKey(senderPublicKey);
  assertValidPublicKey(recipientPublicKey);
  if (senderPublicKey === recipientPublicKey) {
    throw new ValidationError("senderPublicKey and recipientPublicKey must differ");
  }

  const rate = Number(ratePerInterval);
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new ValidationError("ratePerInterval must be a positive number");
  }

  if (!Number.isInteger(intervalMs) || intervalMs < MIN_INTERVAL_MS) {
    throw new ValidationError(`intervalMs must be an integer >= ${MIN_INTERVAL_MS}`);
  }

  const stream: Stream = {
    id: randomUUID(),
    senderPublicKey,
    recipientPublicKey,
    ratePerInterval,
    intervalMs,
    status: "paused",
    totalSent: "0",
    createdAt: new Date().toISOString(),
    lastPaymentAt: null,
  };
  streams.set(stream.id, stream);
  return stream;
}

export async function startStream(streamId: string, senderSecretKey: string): Promise<Stream> {
  const stream = getStreamOrThrow(streamId);
  if (stream.status === "active") return stream;
  if (stream.status === "stopped") {
    throw new ValidationError("Cannot start a stopped stream");
  }

  assertValidSecretKey(senderSecretKey);
  const senderKeypair = Keypair.fromSecret(senderSecretKey);
  if (senderKeypair.publicKey() !== stream.senderPublicKey) {
    throw new ValidationError("senderSecretKey does not match the stream's senderPublicKey");
  }

  stream.status = "active";

  const tick = async () => {
    if (stream.status !== "active" || ticking.has(streamId)) return;
    ticking.add(streamId);
    try {
      await sendPayment(senderSecretKey, stream.recipientPublicKey, stream.ratePerInterval);
      stream.totalSent = (
        parseFloat(stream.totalSent) + parseFloat(stream.ratePerInterval)
      ).toFixed(7);
      stream.lastPaymentAt = new Date().toISOString();
    } catch (err) {
      console.error(`Stream ${streamId} payment failed:`, err);
      stream.status = "paused";
      clearTimer(streamId);
    } finally {
      ticking.delete(streamId);
    }
  };

  // Fire first tick immediately, then on interval
  await tick();
  if (stream.status === "active") {
    const timer = setInterval(tick, stream.intervalMs);
    timers.set(streamId, timer);
  }

  return stream;
}

export function pauseStream(streamId: string): Stream {
  const stream = getStreamOrThrow(streamId);
  stream.status = "paused";
  clearTimer(streamId);
  return stream;
}

export function stopStream(streamId: string): Stream {
  const stream = getStreamOrThrow(streamId);
  stream.status = "stopped";
  clearTimer(streamId);
  return stream;
}

export function getStream(streamId: string): Stream | undefined {
  return streams.get(streamId);
}

export function listStreams(publicKey?: string): Stream[] {
  const all = Array.from(streams.values());
  if (!publicKey) return all;
  return all.filter((s) => s.senderPublicKey === publicKey || s.recipientPublicKey === publicKey);
}

/** Stop all running interval timers, e.g. during graceful shutdown. */
export function clearAllTimers(): void {
  for (const streamId of timers.keys()) {
    clearTimer(streamId);
  }
}

// --- helpers ---

function getStreamOrThrow(streamId: string): Stream {
  const stream = streams.get(streamId);
  if (!stream) throw new NotFoundError(`Stream not found: ${streamId}`);
  return stream;
}

function clearTimer(streamId: string) {
  const t = timers.get(streamId);
  if (t) {
    clearInterval(t);
    timers.delete(streamId);
  }
}

async function sendPayment(
  senderSecret: string,
  destination: string,
  amount: string
): Promise<void> {
  const senderKeypair = Keypair.fromSecret(senderSecret);
  const senderAccount = await server.loadAccount(senderKeypair.publicKey());

  const tx = new TransactionBuilder(senderAccount, {
    fee: "100",
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      Operation.payment({
        destination,
        asset: Asset.native(),
        amount,
      })
    )
    .setTimeout(30)
    .build();

  tx.sign(senderKeypair);
  await server.submitTransaction(tx);
}
