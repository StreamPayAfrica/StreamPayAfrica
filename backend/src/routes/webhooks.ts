import { Router, Request, Response } from "express";
import { server } from "../services/walletService";

const router = Router();

// GET /api/webhooks/payments/:publicKey - stream recent payments for an account
router.get("/payments/:publicKey", async (req: Request, res: Response) => {
  try {
    const payments = await server
      .payments()
      .forAccount(req.params.publicKey)
      .limit(10)
      .order("desc")
      .call();

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
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

export default router;
