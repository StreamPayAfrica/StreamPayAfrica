import request from "supertest";
import app from "../src/app";

describe("app", () => {
  it("GET /health returns ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
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
