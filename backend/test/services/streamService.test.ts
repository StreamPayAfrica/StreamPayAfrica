import { Account } from "@stellar/stellar-sdk";
import * as walletService from "../../src/services/walletService";
import {
  createStream,
  startStream,
  pauseStream,
  stopStream,
  getStream,
  listStreams,
} from "../../src/services/streamService";
import { NotFoundError, ValidationError } from "../../src/utils/errors";

function mockSuccessfulPayment() {
  jest
    .spyOn(walletService.server, "loadAccount")
    .mockImplementation(async (publicKey: string) => new Account(publicKey, "1") as any);
  jest.spyOn(walletService.server, "submitTransaction").mockResolvedValue({} as any);
}

describe("streamService", () => {
  const sender = walletService.createWallet();
  const recipient = walletService.createWallet();

  describe("createStream", () => {
    it("creates a paused stream with valid input", () => {
      const stream = createStream(sender.publicKey, recipient.publicKey, "0.1", 5000);
      expect(stream.status).toBe("paused");
      expect(stream.totalSent).toBe("0");
      expect(getStream(stream.id)).toEqual(stream);
    });

    it("rejects an invalid sender public key", () => {
      expect(() => createStream("bad", recipient.publicKey, "0.1", 5000)).toThrow(ValidationError);
    });

    it("rejects sender === recipient", () => {
      expect(() => createStream(sender.publicKey, sender.publicKey, "0.1", 5000)).toThrow(
        /must differ/
      );
    });

    it("rejects a non-positive rate", () => {
      expect(() => createStream(sender.publicKey, recipient.publicKey, "0", 5000)).toThrow(
        /positive number/
      );
      expect(() => createStream(sender.publicKey, recipient.publicKey, "-1", 5000)).toThrow(
        /positive number/
      );
      expect(() =>
        createStream(sender.publicKey, recipient.publicKey, "not-a-number", 5000)
      ).toThrow(/positive number/);
    });

    it("rejects a rate with more than 7 decimal places", () => {
      expect(() =>
        createStream(sender.publicKey, recipient.publicKey, "0.123456789", 5000)
      ).toThrow(/decimal places/);
    });

    it("accepts a rate with exactly 7 decimal places", () => {
      const stream = createStream(sender.publicKey, recipient.publicKey, "0.1234567", 5000);
      expect(stream.ratePerInterval).toBe("0.1234567");
    });

    it("rejects scientific notation", () => {
      expect(() => createStream(sender.publicKey, recipient.publicKey, "1e5", 5000)).toThrow(
        /positive number/
      );
    });

    it("rejects an interval below the minimum", () => {
      expect(() => createStream(sender.publicKey, recipient.publicKey, "0.1", 999)).toThrow(
        /intervalMs/
      );
    });

    it("rejects a non-integer interval", () => {
      expect(() => createStream(sender.publicKey, recipient.publicKey, "0.1", 1000.5)).toThrow(
        /intervalMs/
      );
    });
  });

  describe("lifecycle", () => {
    it("throws NotFoundError for an unknown stream id", async () => {
      expect(() => pauseStream("does-not-exist")).toThrow(NotFoundError);
      expect(() => stopStream("does-not-exist")).toThrow(NotFoundError);
      await expect(startStream("does-not-exist", sender.secretKey)).rejects.toThrow(NotFoundError);
    });

    it("rejects starting with a secret key that doesn't match the sender", async () => {
      const stream = createStream(sender.publicKey, recipient.publicKey, "0.1", 5000);
      await expect(startStream(stream.id, recipient.secretKey)).rejects.toThrow(/does not match/);
    });

    it("starts a stream, sends the first payment immediately, and updates totals", async () => {
      mockSuccessfulPayment();
      const stream = createStream(sender.publicKey, recipient.publicKey, "0.1", 60_000);
      const started = await startStream(stream.id, sender.secretKey);

      expect(started.status).toBe("active");
      expect(started.totalSent).toBe("0.1000000");
      expect(started.lastPaymentAt).not.toBeNull();

      stopStream(stream.id);
    });

    it("is idempotent when starting an already-active stream", async () => {
      mockSuccessfulPayment();
      const stream = createStream(sender.publicKey, recipient.publicKey, "0.1", 60_000);
      await startStream(stream.id, sender.secretKey);
      const again = await startStream(stream.id, sender.secretKey);
      expect(again.status).toBe("active");

      stopStream(stream.id);
    });

    it("pauses an active stream", async () => {
      mockSuccessfulPayment();
      const stream = createStream(sender.publicKey, recipient.publicKey, "0.1", 60_000);
      await startStream(stream.id, sender.secretKey);
      const paused = pauseStream(stream.id);
      expect(paused.status).toBe("paused");
    });

    it("stops a stream and refuses to restart it", async () => {
      mockSuccessfulPayment();
      const stream = createStream(sender.publicKey, recipient.publicKey, "0.1", 60_000);
      await startStream(stream.id, sender.secretKey);
      const stopped = stopStream(stream.id);
      expect(stopped.status).toBe("stopped");

      await expect(startStream(stream.id, sender.secretKey)).rejects.toThrow(
        /Cannot start a stopped stream/
      );
    });

    it("pauses automatically when a payment fails", async () => {
      jest
        .spyOn(walletService.server, "loadAccount")
        .mockRejectedValue(new Error("destination account does not exist"));

      const stream = createStream(sender.publicKey, recipient.publicKey, "0.1", 60_000);
      const started = await startStream(stream.id, sender.secretKey);
      expect(started.status).toBe("paused");
      expect(started.totalSent).toBe("0");
    });
  });

  describe("listStreams", () => {
    it("filters by sender or recipient public key", () => {
      const other = walletService.createWallet();
      const s1 = createStream(sender.publicKey, recipient.publicKey, "0.1", 5000);
      createStream(other.publicKey, walletService.createWallet().publicKey, "0.1", 5000);

      const filtered = listStreams(sender.publicKey);
      expect(filtered.some((s) => s.id === s1.id)).toBe(true);
      expect(filtered.every((s) => s.senderPublicKey === sender.publicKey)).toBe(true);
    });
  });
});
