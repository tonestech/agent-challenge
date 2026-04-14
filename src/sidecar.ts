import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import "dotenv/config";
import { analyzeToken } from "./lib/analyzer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

const uiDistPath = path.resolve(__dirname, "../ui/dist");
const uiExists = fs.existsSync(path.join(uiDistPath, "index.html"));

if (uiExists) {
  app.use(express.static(uiDistPath));
  app.get(/^(?!\/api|\/health).*/, (_req, res) => {
    res.sendFile(path.join(uiDistPath, "index.html"));
  });
  console.log(`[Scout Sidecar] Serving UI from ${uiDistPath}`);
} else {
  console.log(`[Scout Sidecar] UI dist not found — run 'bun run ui:build' to enable static serving`);
}

app.listen(PORT, () => {
  console.log(`[Scout Sidecar] Listening on http://localhost:${PORT}`);
  console.log(`[Scout Sidecar] Health: http://localhost:${PORT}/health`);
  console.log(`[Scout Sidecar] Endpoint: POST http://localhost:${PORT}/api/scout/analyze`);
});
