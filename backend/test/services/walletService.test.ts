import { StrKey } from "@stellar/stellar-sdk";
import * as walletService from "../../src/services/walletService";
import { NotFoundError, ValidationError } from "../../src/utils/errors";

describe("walletService", () => {
  describe("resolveHorizonUrl", () => {
    const originalNetwork = process.env.NETWORK;
    const originalHorizonUrl = process.env.HORIZON_URL;

    afterEach(() => {
      process.env.NETWORK = originalNetwork;
      process.env.HORIZON_URL = originalHorizonUrl;
    });

    it("defaults to testnet Horizon when NETWORK is unset", () => {
      delete process.env.NETWORK;
      delete process.env.HORIZON_URL;
      expect(walletService.resolveHorizonUrl()).toBe("https://horizon-testnet.stellar.org");
    });

    it("defaults to mainnet Horizon when NETWORK=mainnet, without needing HORIZON_URL", () => {
      process.env.NETWORK = "mainnet";
      delete process.env.HORIZON_URL;
      expect(walletService.resolveHorizonUrl()).toBe("https://horizon.stellar.org");
    });

    it("prefers an explicit HORIZON_URL over the NETWORK default", () => {
      process.env.NETWORK = "mainnet";
      process.env.HORIZON_URL = "https://custom-horizon.example.com";
      expect(walletService.resolveHorizonUrl()).toBe("https://custom-horizon.example.com");
    });
  });

  describe("createWallet", () => {
    it("returns a valid Stellar keypair", () => {
      const wallet = walletService.createWallet();
      expect(StrKey.isValidEd25519PublicKey(wallet.publicKey)).toBe(true);
      expect(StrKey.isValidEd25519SecretSeed(wallet.secretKey)).toBe(true);
    });

    it("generates a different keypair each call", () => {
      const a = walletService.createWallet();
      const b = walletService.createWallet();
      expect(a.publicKey).not.toBe(b.publicKey);
    });
  });

  describe("assertValidPublicKey", () => {
    it("passes for a valid public key", () => {
      const { publicKey } = walletService.createWallet();
      expect(() => walletService.assertValidPublicKey(publicKey)).not.toThrow();
    });

    it("throws ValidationError for garbage input", () => {
      expect(() => walletService.assertValidPublicKey("not-a-key")).toThrow(ValidationError);
    });

    it("throws ValidationError for a secret key passed as a public key", () => {
      const { secretKey } = walletService.createWallet();
      expect(() => walletService.assertValidPublicKey(secretKey)).toThrow(ValidationError);
    });
  });

  describe("assertValidSecretKey", () => {
    it("passes for a valid secret key", () => {
      const { secretKey } = walletService.createWallet();
      expect(() => walletService.assertValidSecretKey(secretKey)).not.toThrow();
    });

    it("throws ValidationError for garbage input", () => {
      expect(() => walletService.assertValidSecretKey("not-a-secret")).toThrow(ValidationError);
    });
  });

  describe("fundWallet", () => {
    it("throws ValidationError for an invalid public key without making a network call", async () => {
      const fetchSpy = jest.spyOn(global, "fetch");
      await expect(walletService.fundWallet("bad-key")).rejects.toThrow(ValidationError);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("calls Friendbot and resolves on success", async () => {
      const { publicKey } = walletService.createWallet();
      const fetchSpy = jest.spyOn(global, "fetch").mockResolvedValue({ ok: true } as Response);

      await expect(walletService.fundWallet(publicKey)).resolves.toBeUndefined();
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining(encodeURIComponent(publicKey)),
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );
    });

    it("gives up instead of hanging forever when Friendbot stalls", async () => {
      const { publicKey } = walletService.createWallet();
      const controller = new AbortController();
      jest.spyOn(AbortSignal, "timeout").mockReturnValue(controller.signal);
      jest.spyOn(global, "fetch").mockImplementation((_url, init) => {
        const signal = (init as RequestInit).signal;
        return new Promise((_resolve, reject) => {
          signal?.addEventListener("abort", () => reject(new Error("The operation was aborted")));
        });
      });

      const pending = walletService.fundWallet(publicKey);
      controller.abort();

      await expect(pending).rejects.toThrow();
    });

    it("throws when Friendbot responds with an error", async () => {
      const { publicKey } = walletService.createWallet();
      jest.spyOn(global, "fetch").mockResolvedValue({
        ok: false,
        text: () => Promise.resolve("account already funded"),
      } as Response);

      await expect(walletService.fundWallet(publicKey)).rejects.toThrow(/Friendbot failed/);
    });
  });

  describe("getBalance", () => {
    it("throws ValidationError for an invalid public key", async () => {
      await expect(walletService.getBalance("bad-key")).rejects.toThrow(ValidationError);
    });

    it("returns the native XLM balance", async () => {
      const { publicKey } = walletService.createWallet();
      jest.spyOn(walletService.server, "loadAccount").mockResolvedValue({
        balances: [{ asset_type: "native", balance: "9999.9999900" }],
      } as any);

      await expect(walletService.getBalance(publicKey)).resolves.toBe("9999.9999900");
    });

    it("maps a Horizon 404 to NotFoundError", async () => {
      const { NetworkError } = await import("@stellar/stellar-sdk");
      const { publicKey } = walletService.createWallet();
      jest
        .spyOn(walletService.server, "loadAccount")
        .mockRejectedValue(new NetworkError("Not Found", { status: 404 }));

      await expect(walletService.getBalance(publicKey)).rejects.toThrow(NotFoundError);
    });
  });
});
