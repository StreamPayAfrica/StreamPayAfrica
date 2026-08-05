import { Router, Request, Response } from "express";
import { NetworkError } from "@stellar/stellar-sdk";
import { assertValidPublicKey, server } from "../services/walletService";
import { NotFoundError } from "../utils/errors";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

// GET /api/webhooks/payments/:publicKey - recent payments for an account
router.get(
  "/payments/:publicKey",
  asyncHandler(async (req: Request, res: Response) => {
    assertValidPublicKey(req.params.publicKey);
    const payments = await server
      .payments()
      .forAccount(req.params.publicKey)
      .limit(10)
      .order("desc")
      .call()
      .catch((err: unknown) => {
        if (err instanceof NetworkError && err.response?.status === 404) {
          throw new NotFoundError(`Account not found: ${req.params.publicKey}`);
        }
        throw err;
      });

    const records = payments.records.map((p: any) => ({
      id: p.id,
      type: p.type,
      amount: p.amount,
      asset: p.asset_type === "native" ? "XLM" : `${p.asset_code}:${p.asset_issuer}`,
      from: p.from,
      to: p.to,
      createdAt: p.created_at,
    }));

    res.json({ publicKey: req.params.publicKey, payments: records });
  })
);

export default router;
