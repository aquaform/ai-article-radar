/** Источник Habr: RSS хаба «Искусственный интеллект». */
import { fetchText } from "../http.js";
import { parseRss } from "./rss.js";
import type { SourceResult } from "../types.js";

const LABEL = "Habr";
const FEED_URL = "https://habr.com/ru/rss/hubs/artificial_intelligence/articles/?fl=ru";

/** Собирает свежие AI-статьи с Habr. Никогда не бросает — ошибки идут в diagnostic. */
export async function collectHabr(): Promise<SourceResult> {
  const fetchedAt = new Date().toISOString();
  try {
    const res = await fetchText(FEED_URL);
    if (!res.ok) {
      return {
        articles: [],
        diagnostic: { source: "habr", label: LABEL, ok: false, count: 0, httpStatus: res.status, error: `HTTP ${res.status}`, fetchedAt },
      };
    }
    const articles = parseRss(res.body, "habr", LABEL);
    return {
      articles,
      diagnostic: { source: "habr", label: LABEL, ok: true, count: articles.length, httpStatus: res.status, fetchedAt },
    };
  } catch (err) {
    return {
      articles: [],
      diagnostic: { source: "habr", label: LABEL, ok: false, count: 0, error: errorMessage(err), fetchedAt },
    };
  }
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.name === "AbortError" ? "timeout" : err.message;
  return String(err);
}
