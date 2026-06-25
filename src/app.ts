/** Express-приложение: health-check, API статей и статика SPA. */
import express, { type Express, type Request, type Response } from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getArticles } from "./aggregator.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// dist/app.js → ../public ; src/app.ts (tsx) → ../public
const PUBLIC_DIR = path.resolve(__dirname, "../public");

/** Создаёт сконфигурированное Express-приложение. */
export function createApp(): Express {
  const app = express();
  app.disable("x-powered-by");

  // Health-check по контракту деплоя: 200 и тело "ok".
  app.get("/health", (_req: Request, res: Response) => {
    res.status(200).type("text/plain").send("ok");
  });

  // Основной API: статьи + diagnostics по источникам.
  app.get("/api/articles", async (req: Request, res: Response) => {
    const force = req.query.refresh === "1" || req.query.refresh === "true";
    try {
      const data = await getArticles(force);
      res.status(200).json(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: "aggregation_failed", message });
    }
  });

  app.use(express.static(PUBLIC_DIR));

  // SPA fallback на корень.
  app.get("/", (_req: Request, res: Response) => {
    res.sendFile(path.join(PUBLIC_DIR, "index.html"));
  });

  return app;
}
