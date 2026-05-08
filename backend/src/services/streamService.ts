import {
  Asset,
  Keypair,
  Networks,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import { v4 as uuidv4 } from "uuid";
import { server, NETWORK_PASSPHRASE } from "./walletService";

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

export function createStream(
  senderPublicKey: string,
  recipientPublicKey: string,
  ratePerInterval: string,
  intervalMs: number
): Stream {
  const stream: Stream = {
    id: uuidv4(),
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

export async function startStream(
  streamId: string,
  senderSecretKey: string
): Promise<Stream> {
  const stream = getStreamOrThrow(streamId);
  if (stream.status === "active") return stream;

  stream.status = "active";

  const tick = async () => {
    if (stream.status !== "active") return;
    try {
      await sendPayment(senderSecretKey, stream.recipientPublicKey, stream.ratePerInterval);
      stream.totalSent = (
        parseFloat(stream.totalSent) + parseFloat(stream.ratePerInterval)
      ).toFixed(7);
      stream.lastPaymentAt = new Date().toISOString();
    } catch (err) {
      console.error(`Stream ${streamId} payment failed:`, err);
      stream.status = "paused";
      timers.delete(streamId);
    }
  };

  // Fire first tick immediately, then on interval
  await tick();
  const timer = setInterval(tick, stream.intervalMs);
  timers.set(streamId, timer);

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
  return all.filter(
    (s) => s.senderPublicKey === publicKey || s.recipientPublicKey === publicKey
  );
}

// --- helpers ---

function getStreamOrThrow(streamId: string): Stream {
  const stream = streams.get(streamId);
  if (!stream) throw new Error(`Stream not found: ${streamId}`);
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
