/**
 * Агрегатор: параллельно опрашивает источники, нормализует и кэширует
 * результат (15 минут), формирует honest diagnostics и degraded-флаг.
 */
import { collectHabr } from "./sources/habr.js";
import { collectVc } from "./sources/vc.js";
import { collectDzen } from "./sources/dzen.js";
import { normalizeArticles } from "./normalize.js";
import type { ArticlesResponse, RawArticle, SourceResult } from "./types.js";

const CACHE_TTL_MS = 15 * 60 * 1000;

/** Список коллекторов источников. */
const COLLECTORS: Array<() => Promise<SourceResult>> = [collectHabr, collectVc, collectDzen];

interface CacheEntry {
  data: ArticlesResponse;
  builtAt: number;
}

let cache: CacheEntry | null = null;
let inflight: Promise<ArticlesResponse> | null = null;

/** Собирает свежий ответ, опрашивая все источники. */
async function build(): Promise<ArticlesResponse> {
  const results = await Promise.all(COLLECTORS.map((c) => c()));

  const allRaw: RawArticle[] = [];
  for (const r of results) allRaw.push(...r.articles);

  const articles = normalizeArticles(allRaw);

  // Честный per-source count: сколько релевантных статей реально попало в выдачу.
  const relevantBySource = new Map<string, number>();
  for (const a of articles) {
    relevantBySource.set(a.source, (relevantBySource.get(a.source) ?? 0) + 1);
  }

  const diagnostics = results.map((r) => ({
    ...r.diagnostic,
    count: r.diagnostic.ok ? relevantBySource.get(r.diagnostic.source) ?? 0 : 0,
  }));

  const degraded = diagnostics.some((d) => !d.ok);
  const lastUpdated = new Date().toISOString();

  return { articles, diagnostics, lastUpdated, cacheAgeSeconds: 0, degraded };
}

/**
 * Возвращает агрегированные статьи, используя кэш.
 * @param force игнорировать кэш и собрать заново
 */
export async function getArticles(force = false): Promise<ArticlesResponse> {
  const now = Date.now();
  if (!force && cache && now - cache.builtAt < CACHE_TTL_MS) {
    return { ...cache.data, cacheAgeSeconds: Math.round((now - cache.builtAt) / 1000) };
  }
  if (inflight) return inflight;

  inflight = build()
    .then((data) => {
      cache = { data, builtAt: Date.now() };
      return { ...data, cacheAgeSeconds: 0 };
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** Сбрасывает кэш (используется в тестах). */
export function resetCache(): void {
  cache = null;
  inflight = null;
}
