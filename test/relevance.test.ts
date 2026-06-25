import { describe, it, expect } from "vitest";
import { analyzeRelevance } from "../src/relevance.js";

describe("analyzeRelevance", () => {
  it("распознаёт явную AI-статью по заголовку", () => {
    const r = analyzeRelevance("Новая нейросеть GPT обучилась на датасете", "Подробности внутри");
    expect(r.relevant).toBe(true);
    expect(r.relevance).toBeGreaterThan(30);
    expect(r.tags).toContain("нейросети");
    expect(r.tags).toContain("GPT");
    expect(r.reasons.length).toBeGreaterThan(0);
  });

  it("ловит ИИ через границу слова, но не внутри других слов", () => {
    expect(analyzeRelevance("Что такое ИИ", "").relevant).toBe(true);
    // «России» не должно матчиться как токен «ии»
    expect(analyzeRelevance("Новости России о финансах", "обычный текст").relevant).toBe(false);
  });

  it("нерелевантный материал получает relevant=false", () => {
    const r = analyzeRelevance("Как испечь хлеб дома", "рецепт теста и выпечки");
    expect(r.relevant).toBe(false);
    expect(r.relevance).toBe(0);
    expect(r.tags).toEqual([]);
  });

  it("описание весит меньше заголовка", () => {
    const inTitle = analyzeRelevance("Искусственный интеллект в бизнесе", "");
    const inDesc = analyzeRelevance("Бизнес-обзор", "тут про искусственный интеллект");
    expect(inTitle.relevance).toBeGreaterThan(inDesc.relevance);
  });
});
