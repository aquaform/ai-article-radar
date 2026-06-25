import { describe, it, expect } from "vitest";
import { stripHtml, makeSummary, articleId, normalizeArticles } from "../src/normalize.js";
import type { RawArticle } from "../src/types.js";

describe("stripHtml", () => {
  it("убирает теги, CDATA и сущности", () => {
    expect(stripHtml("<p>Привет&nbsp;&laquo;мир&raquo;</p>")).toBe("Привет «мир»");
    expect(stripHtml("<![CDATA[<b>текст</b>]]>")).toBe("текст");
  });
});

describe("makeSummary", () => {
  it("берёт не более 3 предложений и обрезает по длине", () => {
    const text = "Первое предложение. Второе предложение! Третье предложение? Четвёртое лишнее.";
    const s = makeSummary(text, 240);
    expect(s).toContain("Первое предложение.");
    expect(s).not.toContain("Четвёртое");
  });

  it("обрезает длинный текст без предложений с многоточием", () => {
    const s = makeSummary("a".repeat(500), 50);
    expect(s.length).toBeLessThanOrEqual(50);
    expect(s.endsWith("…")).toBe(true);
  });

  it("пустой ввод даёт пустую строку", () => {
    expect(makeSummary("")).toBe("");
  });
});

describe("articleId", () => {
  it("стабилен и зависит от URL", () => {
    expect(articleId("https://x/y")).toBe(articleId("https://x/y"));
    expect(articleId("https://x/y")).not.toBe(articleId("https://x/z"));
  });
});

describe("normalizeArticles", () => {
  const make = (over: Partial<RawArticle>): RawArticle => ({
    source: "habr",
    sourceLabel: "Habr",
    title: "Нейросеть для всех",
    url: "https://habr.com/a",
    publishedAt: "2026-06-20T10:00:00.000Z",
    description: "Большая статья про искусственный интеллект и нейросети.",
    ...over,
  });

  it("отбрасывает нерелевантные и дедуплицирует по URL", () => {
    const list = normalizeArticles([
      make({}),
      make({ url: "https://habr.com/a" }), // дубль
      make({ title: "Рецепт борща", description: "овощи и мясо", url: "https://habr.com/b" }),
    ]);
    expect(list).toHaveLength(1);
    expect(list[0].source).toBe("habr");
    expect(list[0].tags.length).toBeGreaterThan(0);
  });

  it("сортирует свежие выше", () => {
    const list = normalizeArticles([
      make({ url: "https://h/old", publishedAt: "2026-06-01T00:00:00.000Z" }),
      make({ url: "https://h/new", publishedAt: "2026-06-24T00:00:00.000Z" }),
    ]);
    expect(list[0].url).toBe("https://h/new");
  });
});
