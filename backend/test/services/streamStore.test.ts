import { MemoryStreamStore, Stream } from "../../src/services/streamStore";

function makeStream(overrides: Partial<Stream> = {}): Stream {
  return {
    id: "stream-1",
    senderPublicKey: "GSENDER",
    recipientPublicKey: "GRECIPIENT",
    ratePerInterval: "0.1",
    intervalMs: 5000,
    status: "paused",
    totalSent: "0",
    createdAt: new Date().toISOString(),
    lastPaymentAt: null,
    ...overrides,
  };
}

describe("MemoryStreamStore", () => {
  it("returns undefined for an unknown id", () => {
    const store = new MemoryStreamStore();
    expect(store.get("missing")).toBeUndefined();
  });

  it("stores and retrieves a stream by id", () => {
    const store = new MemoryStreamStore();
    const stream = makeStream();
    store.set(stream);
    expect(store.get(stream.id)).toEqual(stream);
  });

  it("lists all stored streams", () => {
    const store = new MemoryStreamStore();
    store.set(makeStream({ id: "a" }));
    store.set(makeStream({ id: "b" }));
    expect(
      store
        .all()
        .map((s) => s.id)
        .sort()
    ).toEqual(["a", "b"]);
  });

  it("overwrites an existing entry with the same id", () => {
    const store = new MemoryStreamStore();
    store.set(makeStream({ id: "a", status: "paused" }));
    store.set(makeStream({ id: "a", status: "active" }));
    expect(store.all()).toHaveLength(1);
    expect(store.get("a")?.status).toBe("active");
  });
});
