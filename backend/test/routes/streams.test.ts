import request from "supertest";
import { NotFoundError, ValidationError } from "../../src/utils/errors";

jest.mock("../../src/services/streamService");

import app from "../../src/app";
import * as streamService from "../../src/services/streamService";

const mocked = streamService as jest.Mocked<typeof streamService>;

const sampleStream = {
  id: "stream-1",
  senderPublicKey: "GSENDER",
  recipientPublicKey: "GRECIPIENT",
  ratePerInterval: "0.1",
  intervalMs: 5000,
  status: "paused" as const,
  totalSent: "0",
  createdAt: new Date().toISOString(),
  lastPaymentAt: null,
};

describe("POST /api/streams", () => {
  it("requires all fields", async () => {
    const res = await request(app).post("/api/streams").send({});
    expect(res.status).toBe(400);
  });

  it("creates a stream", async () => {
    mocked.createStream.mockReturnValue(sampleStream);

    const res = await request(app).post("/api/streams").send({
      senderPublicKey: "GSENDER",
      recipientPublicKey: "GRECIPIENT",
      ratePerInterval: "0.1",
      intervalMs: 5000,
    });

    expect(res.status).toBe(201);
    expect(res.body.id).toBe("stream-1");
  });

  it("maps ValidationError from the service to 400", async () => {
    mocked.createStream.mockImplementation(() => {
      throw new ValidationError("ratePerInterval must be a positive number");
    });

    const res = await request(app).post("/api/streams").send({
      senderPublicKey: "GSENDER",
      recipientPublicKey: "GRECIPIENT",
      ratePerInterval: "-1",
      intervalMs: 5000,
    });

    expect(res.status).toBe(400);
  });
});

describe("GET /api/streams/:id", () => {
  it("404s for an unknown stream", async () => {
    mocked.getStream.mockReturnValue(undefined);
    const res = await request(app).get("/api/streams/unknown");
    expect(res.status).toBe(404);
  });

  it("returns a known stream", async () => {
    mocked.getStream.mockReturnValue(sampleStream);
    const res = await request(app).get("/api/streams/stream-1");
    expect(res.status).toBe(200);
    expect(res.body.id).toBe("stream-1");
  });
});

describe("POST /api/streams/:id/start", () => {
  it("requires senderSecretKey", async () => {
    const res = await request(app).post("/api/streams/stream-1/start").send({});
    expect(res.status).toBe(400);
  });

  it("maps NotFoundError to 404", async () => {
    mocked.startStream.mockRejectedValue(new NotFoundError("Stream not found"));
    const res = await request(app)
      .post("/api/streams/unknown/start")
      .send({ senderSecretKey: "SSEC" });
    expect(res.status).toBe(404);
  });

  it("starts a stream", async () => {
    mocked.startStream.mockResolvedValue({ ...sampleStream, status: "active" });
    const res = await request(app)
      .post("/api/streams/stream-1/start")
      .send({ senderSecretKey: "SSEC" });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("active");
  });
});

describe("POST /api/streams/:id/pause and /stop", () => {
  it("pauses a stream", async () => {
    mocked.pauseStream.mockReturnValue({ ...sampleStream, status: "paused" });
    const res = await request(app).post("/api/streams/stream-1/pause");
    expect(res.status).toBe(200);
  });

  it("stops a stream", async () => {
    mocked.stopStream.mockReturnValue({ ...sampleStream, status: "stopped" });
    const res = await request(app).post("/api/streams/stream-1/stop");
    expect(res.status).toBe(200);
  });

  it("404s pause/stop for an unknown stream", async () => {
    mocked.pauseStream.mockImplementation(() => {
      throw new NotFoundError("Stream not found");
    });
    const res = await request(app).post("/api/streams/unknown/pause");
    expect(res.status).toBe(404);
  });
});
