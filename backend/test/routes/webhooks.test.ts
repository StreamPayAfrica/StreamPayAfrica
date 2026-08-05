import request from "supertest";
import { NetworkError } from "@stellar/stellar-sdk";
import app from "../../src/app";
import * as walletService from "../../src/services/walletService";

function mockPaymentsCall(impl: () => Promise<any>) {
  jest.spyOn(walletService.server, "payments").mockReturnValue({
    forAccount: () => ({
      limit: () => ({
        order: () => ({
          call: impl,
        }),
      }),
    }),
  } as any);
}

describe("GET /api/webhooks/payments/:publicKey", () => {
  it("rejects an invalid public key", async () => {
    const res = await request(app).get("/api/webhooks/payments/not-a-key");
    expect(res.status).toBe(400);
  });

  it("returns recent payments for a valid account", async () => {
    const { publicKey } = walletService.createWallet();
    mockPaymentsCall(() =>
      Promise.resolve({
        records: [
          {
            id: "1",
            type: "payment",
            amount: "0.1000000",
            asset_type: "native",
            from: "GFROM",
            to: "GTO",
            created_at: "2026-01-01T00:00:00Z",
          },
        ],
      })
    );

    const res = await request(app).get(`/api/webhooks/payments/${publicKey}`);

    expect(res.status).toBe(200);
    expect(res.body.payments).toHaveLength(1);
    expect(res.body.payments[0].asset).toBe("XLM");
  });

  it("maps a Horizon 404 to a 404 response", async () => {
    const { publicKey } = walletService.createWallet();
    mockPaymentsCall(() => Promise.reject(new NetworkError("Not Found", { status: 404 })));

    const res = await request(app).get(`/api/webhooks/payments/${publicKey}`);

    expect(res.status).toBe(404);
  });
});
