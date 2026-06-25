import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";

// Мокаем коллекторы источников, чтобы тест не ходил в сеть.
vi.mock("../src/sources/habr.js", () => ({
  collectHabr: async () => ({
    articles: [
      {
        source: "habr",
        sourceLabel: "Habr",
        title: "Нейросеть нового поколения",
        url: "https://habr.com/ru/articles/777/",
        publishedAt: "2026-06-24T09:00:00.000Z",
        description: "Подробный разбор большой языковой модели и нейросетей.",
      },
    ],
    diagnostic: { source: "habr", label: "Habr", ok: true, count: 1, httpStatus: 200, fetchedAt: "2026-06-24T09:00:00.000Z" },
  }),
}));
vi.mock("../src/sources/vc.js", () => ({
  collectVc: async () => ({
    articles: [
      { source: "vc", sourceLabel: "VC.ru", title: "Маркетинг для малого бизнеса", url: "https://vc.ru/x/1", publishedAt: null, description: "советы по продажам и рекламе" },
    ],
    diagnostic: { source: "vc", label: "VC.ru", ok: true, count: 1, httpStatus: 200, fetchedAt: "2026-06-24T09:00:00.000Z" },
  }),
}));
vi.mock("../src/sources/dzen.js", () => ({
  collectDzen: async () => ({
    articles: [],
    diagnostic: { source: "dzen", label: "Дзен", ok: false, count: 0, error: "timeout", fetchedAt: "2026-06-24T09:00:00.000Z" },
  }),
}));

const { createApp } = await import("../src/app.js");
const { resetCache } = await import("../src/aggregator.js");

describe("HTTP API", () => {
  const app = createApp();
  beforeEach(() => resetCache());

  it("GET /health возвращает 200 и тело ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.text).toBe("ok");
  });

  it("GET /api/articles отдаёт релевантные статьи и diagnostics", async () => {
    const res = await request(app).get("/api/articles");
    expect(res.status).toBe(200);
    // Только AI-релевантная статья Habr; нерелевантный VC отфильтрован.
    expect(res.body.articles).toHaveLength(1);
    expect(res.body.articles[0].source).toBe("habr");
    expect(res.body.diagnostics).toHaveLength(3);
    // Dzen недоступен → degraded.
    expect(res.body.degraded).toBe(true);
    const vc = res.body.diagnostics.find((d: any) => d.source === "vc");
    expect(vc.count).toBe(0); // VC ответил, но AI-статей нет
  });
});
