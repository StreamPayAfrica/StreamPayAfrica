import { Router, Request, Response } from "express";
import { createWallet, fundWallet, getBalance } from "../services/walletService";
import { statusCodeFor } from "../utils/errors";

const router = Router();

// POST /api/wallet - create a new wallet
router.post("/", async (_req: Request, res: Response) => {
  const wallet = createWallet();
  res.status(201).json(wallet);
});

// POST /api/wallet/fund - fund a testnet wallet via Friendbot
router.post("/fund", async (req: Request, res: Response) => {
  const { publicKey } = req.body;
  if (!publicKey) return res.status(400).json({ error: "publicKey required" });
  try {
    await fundWallet(publicKey);
    res.json({ message: "Wallet funded successfully", publicKey });
  } catch (err: any) {
    res.status(statusCodeFor(err)).json({ error: err.message });
  }
});

// GET /api/wallet/:publicKey/balance
router.get("/:publicKey/balance", async (req: Request, res: Response) => {
  try {
    const balance = await getBalance(req.params.publicKey);
    res.json({ publicKey: req.params.publicKey, balance, asset: "XLM" });
  } catch (err: any) {
    res.status(statusCodeFor(err)).json({ error: err.message });
  }
});

export default router;
