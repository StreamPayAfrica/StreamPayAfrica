import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "fs";
import { dirname } from "path";
import { logger } from "../utils/logger";
import { Stream, StreamStore } from "./streamStore";

/**
 * Persists streams as JSON on disk so stream metadata (id, rate, totalSent,
 * history) survives a process restart. Writes go to a temp file and are then
 * renamed into place so a crash mid-write can't corrupt the store.
 *
 * Secret keys are never stored, so a stream that was "active" before a
 * restart can't resume sending payments automatically — it's reloaded as
 * "paused" and must be started again with the sender's secret key.
 */
export class FileStreamStore implements StreamStore {
  private readonly streams = new Map<string, Stream>();

  constructor(private readonly filePath: string) {
    this.load();
  }

  get(id: string): Stream | undefined {
    return this.streams.get(id);
  }

  set(stream: Stream): void {
    this.streams.set(stream.id, stream);
    this.persist();
  }

  all(): Stream[] {
    return Array.from(this.streams.values());
  }

  private load(): void {
    if (!existsSync(this.filePath)) return;
    try {
      const records: Stream[] = JSON.parse(readFileSync(this.filePath, "utf-8"));
      for (const stream of records) {
        this.streams.set(
          stream.id,
          stream.status === "active" ? { ...stream, status: "paused" } : stream
        );
      }
    } catch (err) {
      logger.error("Failed to load stream store", {
        filePath: this.filePath,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  private persist(): void {
    const dir = dirname(this.filePath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const tmpPath = `${this.filePath}.${process.pid}.tmp`;
    writeFileSync(tmpPath, JSON.stringify(this.all(), null, 2));
    renameSync(tmpPath, this.filePath);
  }
}
