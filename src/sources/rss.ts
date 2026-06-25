/** Парсинг RSS 2.0 в список сырых статей. */
import { XMLParser } from "fast-xml-parser";
import type { RawArticle, SourceId } from "../types.js";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  cdataPropName: "__cdata",
  trimValues: true,
});

/** Достаёт текст из значения, которое может быть строкой, CDATA или объектом. */
function textOf(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (typeof obj.__cdata === "string") return obj.__cdata;
    if (typeof obj["#text"] === "string") return obj["#text"];
  }
  return "";
}

function toIso(pubDate: string): string | null {
  if (!pubDate) return null;
  const ts = Date.parse(pubDate);
  return Number.isNaN(ts) ? null : new Date(ts).toISOString();
}

/**
 * Парсит RSS-документ в массив RawArticle.
 * @param xml тело RSS-фида
 * @param source id площадки
 * @param sourceLabel читаемое имя площадки
 */
export function parseRss(xml: string, source: SourceId, sourceLabel: string): RawArticle[] {
  const doc = parser.parse(xml) as Record<string, any>;
  const channel = doc?.rss?.channel ?? doc?.feed;
  if (!channel) return [];
  const rawItems = channel.item ?? channel.entry ?? [];
  const items = Array.isArray(rawItems) ? rawItems : [rawItems];

  const result: RawArticle[] = [];
  for (const item of items) {
    const title = textOf(item.title);
    let url = textOf(item.link);
    if (!url && item.link?.["@_href"]) url = String(item.link["@_href"]);
    const description = textOf(item.description) || textOf(item["content:encoded"]) || textOf(item.summary);
    const publishedAt = toIso(textOf(item.pubDate) || textOf(item.published) || textOf(item.updated));
    if (!title || !url) continue;
    result.push({ source, sourceLabel, title, url: url.trim(), publishedAt, description });
  }
  return result;
}
