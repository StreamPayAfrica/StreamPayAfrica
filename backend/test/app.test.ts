import request from "supertest";
import app, { resolveCorsOrigin, resolveTrustProxy } from "../src/app";

describe("resolveCorsOrigin", () => {
  const original = process.env.CORS_ORIGIN;

  afterEach(() => {
    process.env.CORS_ORIGIN = original;
  });

  it("defaults to * when unset", () => {
    delete process.env.CORS_ORIGIN;
    expect(resolveCorsOrigin()).toBe("*");
  });

  it("returns a single string for one origin", () => {
    process.env.CORS_ORIGIN = "https://app.example.com";
    expect(resolveCorsOrigin()).toBe("https://app.example.com");
  });

  it("splits a comma-separated list into an array", () => {
    process.env.CORS_ORIGIN = "https://a.example.com, https://b.example.com";
    expect(resolveCorsOrigin()).toEqual(["https://a.example.com", "https://b.example.com"]);
  });
});

describe("resolveTrustProxy", () => {
  const original = process.env.TRUST_PROXY;

  afterEach(() => {
    process.env.TRUST_PROXY = original;
  });

  it("defaults to false when unset", () => {
    delete process.env.TRUST_PROXY;
    expect(resolveTrustProxy()).toBe(false);
  });

  it("parses 'true' and 'false' as booleans", () => {
    process.env.TRUST_PROXY = "true";
    expect(resolveTrustProxy()).toBe(true);
    process.env.TRUST_PROXY = "false";
    expect(resolveTrustProxy()).toBe(false);
  });

  it("parses an integer hop count as a number", () => {
    process.env.TRUST_PROXY = "1";
    expect(resolveTrustProxy()).toBe(1);
  });

  it("passes through other values (e.g. an IP or CIDR) as-is", () => {
    process.env.TRUST_PROXY = "loopback";
    expect(resolveTrustProxy()).toBe("loopback");
  });
});

describe("app", () => {
  it("GET /health returns ok with uptime and network info", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: "ok", network: "testnet" });
    expect(typeof res.body.uptimeSeconds).toBe("number");
    expect(typeof res.body.timestamp).toBe("string");
  });

  it("returns a JSON 404 for unknown routes", async () => {
    const res = await request(app).get("/api/does-not-exist");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Not found" });
  });

  it("returns a JSON 400 for malformed request bodies", async () => {
    const res = await request(app)
      .post("/api/wallet/fund")
      .set("Content-Type", "application/json")
      .send("{not valid json");
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Malformed JSON/);
  });

  it("sets standard security headers", async () => {
    const res = await request(app).get("/health");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
  });
});
