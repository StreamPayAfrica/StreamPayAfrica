import request from "supertest";
import { ValidationError, NotFoundError } from "../../src/utils/errors";

jest.mock("../../src/services/walletService");

import app from "../../src/app";
import * as walletService from "../../src/services/walletService";

const mocked = walletService as jest.Mocked<typeof walletService>;

describe("POST /api/wallet", () => {
  it("creates a wallet", async () => {
    mocked.createWallet.mockReturnValue({ publicKey: "GPUB", secretKey: "SSEC" });

    const res = await request(app).post("/api/wallet");

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ publicKey: "GPUB", secretKey: "SSEC" });
  });
});

describe("POST /api/wallet/fund", () => {
  it("requires a publicKey", async () => {
    const res = await request(app).post("/api/wallet/fund").send({});
    expect(res.status).toBe(400);
  });

  it("funds a wallet", async () => {
    mocked.fundWallet.mockResolvedValue(undefined);

    const res = await request(app).post("/api/wallet/fund").send({ publicKey: "GPUB" });

    expect(res.status).toBe(200);
    expect(res.body.publicKey).toBe("GPUB");
  });

  it("maps ValidationError to 400", async () => {
    mocked.fundWallet.mockRejectedValue(new ValidationError("Invalid Stellar public key"));

    const res = await request(app).post("/api/wallet/fund").send({ publicKey: "bad" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Invalid/);
  });
});

describe("GET /api/wallet/:publicKey/balance", () => {
  it("returns the balance", async () => {
    mocked.getBalance.mockResolvedValue("100.0000000");

    const res = await request(app).get("/api/wallet/GPUB/balance");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ publicKey: "GPUB", balance: "100.0000000", asset: "XLM" });
  });

  it("maps NotFoundError to 404", async () => {
    mocked.getBalance.mockRejectedValue(new NotFoundError("Account not found"));

    const res = await request(app).get("/api/wallet/GPUB/balance");

    expect(res.status).toBe(404);
  });
});
