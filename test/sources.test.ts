import { describe, it, expect } from "vitest";
import { parseRss } from "../src/sources/rss.js";
import { parseDzen } from "../src/sources/dzen.js";

const RSS_FIXTURE = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
  <title>Test</title>
  <item>
    <title><![CDATA[Нейросеть обыграла человека]]></title>
    <link>https://habr.com/ru/articles/1/</link>
    <pubDate>Mon, 23 Jun 2026 12:00:00 GMT</pubDate>
    <description><![CDATA[<p>Описание про ИИ.</p>]]></description>
  </item>
  <item>
    <title>Без ссылки</title>
    <description>нет линка — пропустить</description>
  </item>
</channel></rss>`;

describe("parseRss", () => {
  it("парсит валидные item и пропускает без ссылки", () => {
    const items = parseRss(RSS_FIXTURE, "habr", "Habr");
    expect(items).toHaveLength(1);
    expect(items[0].title).toContain("Нейросеть");
    expect(items[0].url).toBe("https://habr.com/ru/articles/1/");
    expect(items[0].publishedAt).toBe("2026-06-23T12:00:00.000Z");
    expect(items[0].source).toBe("habr");
  });

  it("не падает на мусоре", () => {
    expect(parseRss("<not-rss/>", "vc", "VC.ru")).toEqual([]);
  });
});

describe("parseDzen", () => {
  it("извлекает карточки и чистит трекинговые параметры из URL", () => {
    const json = JSON.stringify({
      items: [
        { type: "card", title: "AI новость", link: "https://dzen.ru/a/abc?from=feed&rid=123", text: "про нейросети" },
        { type: "card", title: "", link: "https://dzen.ru/a/empty" },
        { type: "ad", title: "реклама", link: "https://ad" },
      ],
    });
    const items = parseDzen(json);
    expect(items).toHaveLength(1);
    expect(items[0].url).toBe("https://dzen.ru/a/abc");
    expect(items[0].source).toBe("dzen");
  });
});
