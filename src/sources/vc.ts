/**
 * Источник VC.ru: общий RSS-фид. Тематический тег-RSS отдаёт 404,
 * поэтому берём общий фид, а фильтрацию по теме ИИ делает normalize.
 */
import { fetchText } from "../http.js";
import { parseRss } from "./rss.js";
import type { SourceResult } from "../types.js";

const LABEL = "VC.ru";
const FEED_URL = "https://vc.ru/rss";

/** Собирает материалы VC.ru. Никогда не бросает — ошибки идут в diagnostic. */
export async function collectVc(): Promise<SourceResult> {
  const fetchedAt = new Date().toISOString();
  try {
    const res = await fetchText(FEED_URL);
    if (!res.ok) {
      return {
        articles: [],
        diagnostic: { source: "vc", label: LABEL, ok: false, count: 0, httpStatus: res.status, error: `HTTP ${res.status}`, fetchedAt },
      };
    }
    const articles = parseRss(res.body, "vc", LABEL);
    return {
      articles,
      diagnostic: { source: "vc", label: LABEL, ok: true, count: articles.length, httpStatus: res.status, fetchedAt },
    };
  } catch (err) {
    return {
      articles: [],
      diagnostic: { source: "vc", label: LABEL, ok: false, count: 0, error: errorMessage(err), fetchedAt },
    };
  }
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.name === "AbortError" ? "timeout" : err.message;
  return String(err);
}
