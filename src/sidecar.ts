import express from "express";
import cors from "cors";
import "dotenv/config";
import { analyzeToken } from "./lib/analyzer";

const PORT = Number(process.env.SIDECAR_PORT ?? 3001);
const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "scout-sidecar" });
});

app.post("/api/scout/analyze", async (req, res) => {
  const query = req.body?.query?.trim();
  if (!query) {
    return res.status(400).json({ error: "Missing 'query' in request body", code: "MISSING_QUERY" });
  }

  try {
    const result = await analyzeToken(query);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[Sidecar] Analysis failed:", err);
    res.status(500).json({ error: message, code: "ANALYSIS_FAILED" });
  }
});

app.listen(PORT, () => {
  console.log(`[Scout Sidecar] Listening on http://localhost:${PORT}`);
  console.log(`[Scout Sidecar] Health: http://localhost:${PORT}/health`);
  console.log(`[Scout Sidecar] Endpoint: POST http://localhost:${PORT}/api/scout/analyze`);
});
