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

/** Storage for stream records, decoupled from the Stellar payment logic in streamService. */
export interface StreamStore {
  get(id: string): Stream | undefined;
  set(stream: Stream): void;
  all(): Stream[];
}

export class MemoryStreamStore implements StreamStore {
  private readonly streams = new Map<string, Stream>();

  get(id: string): Stream | undefined {
    return this.streams.get(id);
  }

  set(stream: Stream): void {
    this.streams.set(stream.id, stream);
  }

  all(): Stream[] {
    return Array.from(this.streams.values());
  }
}
