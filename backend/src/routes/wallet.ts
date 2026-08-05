import { Router, Request, Response } from "express";
import { createWallet, fundWallet, getBalance } from "../services/walletService";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

// POST /api/wallet - create a new wallet
router.post("/", (_req: Request, res: Response) => {
  res.status(201).json(createWallet());
});

// POST /api/wallet/fund - fund a testnet wallet via Friendbot
router.post(
  "/fund",
  asyncHandler(async (req: Request, res: Response) => {
    const { publicKey } = req.body;
    if (!publicKey) return res.status(400).json({ error: "publicKey required" });
    await fundWallet(publicKey);
    res.json({ message: "Wallet funded successfully", publicKey });
  })
);

// GET /api/wallet/:publicKey/balance
router.get(
  "/:publicKey/balance",
  asyncHandler(async (req: Request, res: Response) => {
    const balance = await getBalance(req.params.publicKey);
    res.json({ publicKey: req.params.publicKey, balance, asset: "XLM" });
  })
);

export default router;
