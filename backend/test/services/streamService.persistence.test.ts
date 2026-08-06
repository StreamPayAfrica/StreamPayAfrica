import { Account } from "@stellar/stellar-sdk";
import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

describe("streamService tick persistence failures", () => {
  let dir: string;
  let filePath: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "streampay-test-"));
    filePath = join(dir, "streams.json");
    jest.resetModules();
    process.env.STREAM_STORE = "file";
    process.env.STREAM_STORE_PATH = filePath;
  });

  afterEach(() => {
    delete process.env.STREAM_STORE;
    delete process.env.STREAM_STORE_PATH;
    rmSync(dir, { recursive: true, force: true });
  });

  it("does not let a persistence failure escape tick() and crash the process", async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const walletService = require("../../src/services/walletService");
    jest
      .spyOn(walletService.server, "loadAccount")
      .mockImplementation(async (...args: unknown[]) => new Account(args[0] as string, "1") as any);
    jest.spyOn(walletService.server, "submitTransaction").mockResolvedValue({} as any);

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const streamService = require("../../src/services/streamService");
    const sender = walletService.createWallet();
    const recipient = walletService.createWallet();

    // Succeeds: this is the store.set() during createStream(). Use a long interval
    // so the real setInterval it schedules doesn't fire again during the test.
    const stream = streamService.createStream(sender.publicKey, recipient.publicKey, "0.1", 60_000);

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require("fs");
    const realWriteFileSync = fs.writeFileSync;
    let writeCount = 0;
    jest.spyOn(fs, "writeFileSync").mockImplementation((...args: unknown[]) => {
      writeCount += 1;
      // The spy is installed after createStream()'s write already happened, so
      // call 1 here is startStream() marking the stream "active" — let it
      // through. Only the write from inside tick()'s finally block (call 2)
      // should fail.
      if (writeCount > 1) {
        throw new Error("ENOSPC: no space left on device");
      }
      return realWriteFileSync(...(args as Parameters<typeof realWriteFileSync>));
    });
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);

    try {
      // This drives the same tick() that setInterval later calls unawaited; if
      // the write failure here escaped tick(), startStream() itself would reject.
      await expect(streamService.startStream(stream.id, sender.secretKey)).resolves.toMatchObject({
        status: "active",
      });
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining("Failed to persist stream state")
      );
    } finally {
      streamService.clearAllTimers();
    }
  });
});
