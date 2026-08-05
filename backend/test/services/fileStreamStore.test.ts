import { mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { FileStreamStore } from "../../src/services/fileStreamStore";
import { Stream } from "../../src/services/streamStore";

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

describe("FileStreamStore", () => {
  let dir: string;
  let filePath: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "streampay-test-"));
    filePath = join(dir, "streams.json");
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("starts empty when no file exists yet", () => {
    const store = new FileStreamStore(filePath);
    expect(store.all()).toEqual([]);
  });

  it("persists a stream to disk and reloads it in a new instance", () => {
    const stream = makeStream();
    const store = new FileStreamStore(filePath);
    store.set(stream);

    const reloaded = new FileStreamStore(filePath);
    expect(reloaded.get("stream-1")).toEqual(stream);
  });

  it("creates the parent directory if it does not exist", () => {
    const nestedPath = join(dir, "nested", "streams.json");
    const store = new FileStreamStore(nestedPath);
    store.set(makeStream());

    const reloaded = new FileStreamStore(nestedPath);
    expect(reloaded.all()).toHaveLength(1);
  });

  it("reloads an active stream as paused, since secret keys are never persisted", () => {
    const store = new FileStreamStore(filePath);
    store.set(makeStream({ status: "active" }));

    const reloaded = new FileStreamStore(filePath);
    expect(reloaded.get("stream-1")?.status).toBe("paused");
  });

  it("ignores a corrupt store file instead of throwing", () => {
    const store = new FileStreamStore(filePath);
    store.set(makeStream());
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);

    writeFileSync(filePath, "{not valid json");
    expect(() => new FileStreamStore(filePath)).not.toThrow();

    errorSpy.mockRestore();
  });
});
