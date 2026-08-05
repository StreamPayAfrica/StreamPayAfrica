import { StrKey } from "@stellar/stellar-sdk";
import * as walletService from "../../src/services/walletService";
import { NotFoundError, ValidationError } from "../../src/utils/errors";

describe("walletService", () => {
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
      expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining(encodeURIComponent(publicKey)));
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
