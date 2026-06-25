/**
 * Нормализация сырых статей: чистка HTML, эвристическое саммари,
 * стабильный id, релевантность, дедупликация.
 */
import { createHash } from "node:crypto";
import type { Article, RawArticle } from "./types.js";
import { analyzeRelevance } from "./relevance.js";

/** Удаляет HTML-теги и декодирует базовые сущности. */
export function stripHtml(input: string): string {
  if (!input) return "";
  return input
    .replace(/<!\[CDATA\[/g, "")
    .replace(/\]\]>/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&laquo;/g, "«")
    .replace(/&raquo;/g, "»")
    .replace(/&mdash;/g, "—")
    .replace(/&hellip;/g, "…")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Делает короткое саммари: 1–3 предложения, не длиннее maxLen символов.
 * @param description описание/сниппет статьи
 * @param maxLen максимальная длина результата
 */
export function makeSummary(description: string, maxLen = 240): string {
  const text = stripHtml(description);
  if (!text) return "";
  const sentences = text.match(/[^.!?…]+[.!?…]+/g);
  let summary: string;
  if (sentences && sentences.length > 0) {
    summary = "";
    for (const s of sentences.slice(0, 3)) {
      const candidate = (summary + s).trim();
      if (candidate.length > maxLen && summary.length > 0) break;
      summary = candidate;
    }
    if (!summary) summary = sentences[0].trim();
  } else {
    summary = text;
  }
  if (summary.length > maxLen) {
    summary = summary.slice(0, maxLen - 1).replace(/\s+\S*$/, "") + "…";
  }
  return summary.trim();
}

/** Стабильный id статьи на основе её URL. */
export function articleId(url: string): string {
  return createHash("sha1").update(url).digest("hex").slice(0, 16);
}

/**
 * Нормализует сырую статью в готовый объект Article.
 * @returns Article, либо null если материал не релевантен теме ИИ.
 */
export function normalizeArticle(raw: RawArticle): Article | null {
  const title = stripHtml(raw.title);
  const url = (raw.url || "").trim();
  if (!title || !url) return null;

  const analysis = analyzeRelevance(title, raw.description);
  if (!analysis.relevant) return null;

  const summary = makeSummary(raw.description) || title;

  return {
    id: articleId(url),
    source: raw.source,
    sourceLabel: raw.sourceLabel,
    title,
    url,
    publishedAt: raw.publishedAt,
    summary,
    tags: analysis.tags,
    reasons: analysis.reasons,
    relevance: analysis.relevance,
  };
}

/**
 * Нормализует список, отбрасывает нерелевантные, дедуплицирует по id,
 * сортирует по дате (свежие выше), затем по релевантности.
 */
export function normalizeArticles(raws: RawArticle[]): Article[] {
  const byId = new Map<string, Article>();
  for (const raw of raws) {
    const article = normalizeArticle(raw);
    if (!article) continue;
    const existing = byId.get(article.id);
    if (!existing || article.relevance > existing.relevance) {
      byId.set(article.id, article);
    }
  }
  const list = [...byId.values()];
  list.sort((a, b) => {
    const ta = a.publishedAt ? Date.parse(a.publishedAt) : 0;
    const tb = b.publishedAt ? Date.parse(b.publishedAt) : 0;
    if (tb !== ta) return tb - ta;
    return b.relevance - a.relevance;
  });
  return list;
}
