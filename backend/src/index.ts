import "dotenv/config";
import express from "express";
import cors from "cors";
import walletRoutes from "./routes/wallet";
import streamRoutes from "./routes/streams";
import webhookRoutes from "./routes/webhooks";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use("/api/wallet", walletRoutes);
app.use("/api/streams", streamRoutes);
app.use("/api/webhooks", webhookRoutes);

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.listen(PORT, () => {
  console.log(`StreamPayAfrica API running on http://localhost:${PORT}`);
});

export default app;
