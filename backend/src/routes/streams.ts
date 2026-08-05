import { Router, Request, Response } from "express";
import {
  createStream,
  startStream,
  pauseStream,
  stopStream,
  getStream,
  listStreams,
} from "../services/streamService";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

// POST /api/streams - create a stream
router.post("/", (req: Request, res: Response) => {
  const { senderPublicKey, recipientPublicKey, ratePerInterval, intervalMs } = req.body;
  if (!senderPublicKey || !recipientPublicKey || !ratePerInterval || !intervalMs) {
    return res
      .status(400)
      .json({ error: "senderPublicKey, recipientPublicKey, ratePerInterval, intervalMs required" });
  }
  const stream = createStream(
    senderPublicKey,
    recipientPublicKey,
    String(ratePerInterval),
    Number(intervalMs)
  );
  res.status(201).json(stream);
});

// GET /api/streams - list all streams (optionally filter by ?publicKey=)
router.get("/", (req: Request, res: Response) => {
  const { publicKey } = req.query;
  res.json(listStreams(publicKey as string | undefined));
});

// GET /api/streams/:id
router.get("/:id", (req: Request, res: Response) => {
  const stream = getStream(req.params.id);
  if (!stream) return res.status(404).json({ error: "Stream not found" });
  res.json(stream);
});

// POST /api/streams/:id/start
router.post(
  "/:id/start",
  asyncHandler(async (req: Request, res: Response) => {
    const { senderSecretKey } = req.body;
    if (!senderSecretKey) return res.status(400).json({ error: "senderSecretKey required" });
    const stream = await startStream(req.params.id, senderSecretKey);
    res.json(stream);
  })
);

// POST /api/streams/:id/pause
router.post("/:id/pause", (req: Request, res: Response) => {
  res.json(pauseStream(req.params.id));
});

// POST /api/streams/:id/stop
router.post("/:id/stop", (req: Request, res: Response) => {
  res.json(stopStream(req.params.id));
});

export default router;
