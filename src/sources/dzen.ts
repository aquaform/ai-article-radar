/**
 * Источник Дзен: у площадки нет публичного RSS/поиска по теме,
 * поэтому используем публичный JSON-эндпоинт ленты launcher.
 * Возвращаются реальные карточки с реальными URL; тематическую
 * фильтрацию по ИИ выполняет normalize. Если эндпоинт блокирует/
 * меняет формат — честно отдаём degraded-диагностику, без фейков.
 */
import { fetchText } from "../http.js";
import type { RawArticle, SourceResult } from "../types.js";

const LABEL = "Дзен";
const FEED_URL = "https://dzen.ru/api/v3/launcher/more?country_code=ru";

interface DzenCard {
  type?: string;
  title?: string;
  text?: string;
  snippet?: string;
  description?: string;
  link?: string;
  url?: string;
  share?: { link?: string };
}

/** Извлекает чистый URL статьи Дзена (без трекинговых параметров). */
function cleanUrl(raw: string): string {
  try {
    const u = new URL(raw);
    u.search = "";
    return u.toString();
  } catch {
    return raw;
  }
}

/** Парсит JSON ленты Дзена в массив RawArticle. */
export function parseDzen(jsonBody: string): RawArticle[] {
  const data = JSON.parse(jsonBody) as { items?: DzenCard[] };
  const items = Array.isArray(data.items) ? data.items : [];
  const result: RawArticle[] = [];
  for (const it of items) {
    if (it.type && it.type !== "card") continue;
    const title = (it.title ?? "").trim();
    const rawUrl = it.link ?? it.url ?? it.share?.link ?? "";
    if (!title || !rawUrl) continue;
    const description = (it.text ?? it.snippet ?? it.description ?? "").trim();
    result.push({
      source: "dzen",
      sourceLabel: LABEL,
      title,
      url: cleanUrl(rawUrl),
      publishedAt: null,
      description,
    });
  }
  return result;
}

/** Собирает материалы Дзена. Никогда не бросает — ошибки идут в diagnostic. */
export async function collectDzen(): Promise<SourceResult> {
  const fetchedAt = new Date().toISOString();
  try {
    const res = await fetchText(FEED_URL);
    if (!res.ok) {
      return {
        articles: [],
        diagnostic: { source: "dzen", label: LABEL, ok: false, count: 0, httpStatus: res.status, error: `HTTP ${res.status}`, fetchedAt },
      };
    }
    const articles = parseDzen(res.body);
    return {
      articles,
      diagnostic: { source: "dzen", label: LABEL, ok: true, count: articles.length, httpStatus: res.status, fetchedAt },
    };
  } catch (err) {
    return {
      articles: [],
      diagnostic: { source: "dzen", label: LABEL, ok: false, count: 0, error: errorMessage(err), fetchedAt },
    };
  }
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.name === "AbortError" ? "timeout" : err.message;
  return String(err);
}
