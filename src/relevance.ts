/**
 * Эвристики релевантности: определяем, относится ли материал к ИИ,
 * считаем оценку 0..100, извлекаем теги и причины рекомендации.
 * Без LLM/платных API — только ключевые слова.
 */

/** Ключевые слова → каноничный тег. Регистр игнорируется, ищем по подстроке. */
const KEYWORDS: ReadonlyArray<{ patterns: string[]; tag: string }> = [
  { patterns: ["искусственн", "artificial intelligence"], tag: "ИИ" },
  { patterns: ["нейросет", "нейронн", "neural"], tag: "нейросети" },
  { patterns: ["машинн", "machine learning"], tag: "машинное обучение" },
  { patterns: ["глубок", "deep learning"], tag: "deep learning" },
  { patterns: ["chatgpt", "gpt-", "gpt ", "gpt4", "gpt-4", "gpt-5"], tag: "GPT" },
  { patterns: ["llm", "языков"], tag: "LLM" },
  { patterns: ["claude", "anthropic"], tag: "Claude" },
  { patterns: ["gemini", "deepmind"], tag: "Gemini" },
  { patterns: ["midjourney", "stable diffusion", "генерац изображ", "генеративн"], tag: "генеративный AI" },
  { patterns: ["компьютерн зрен", "computer vision"], tag: "computer vision" },
  { patterns: ["трансформер", "transformer"], tag: "трансформеры" },
  { patterns: ["датасет", "dataset", "обучающ выборк"], tag: "датасеты" },
  { patterns: ["agent", "агент"], tag: "AI-агенты" },
];

/** Короткие токены, которые ищем как отдельное слово (во избежание ложных срабатываний). */
const WORD_BOUNDARY_TOKENS: ReadonlyArray<{ token: string; tag: string }> = [
  { token: "ии", tag: "ИИ" },
  { token: "ai", tag: "ИИ" },
  { token: "ml", tag: "машинное обучение" },
];

/** Результат анализа текста на тему ИИ. */
export interface RelevanceResult {
  relevant: boolean;
  relevance: number;
  tags: string[];
  reasons: string[];
}

function hasWord(haystack: string, token: string): boolean {
  // Границы слова с поддержкой кириллицы (\b в JS не работает с не-латиницей).
  const re = new RegExp(`(^|[^a-zа-яё0-9])${token}([^a-zа-яё0-9]|$)`, "i");
  return re.test(haystack);
}

/**
 * Анализирует заголовок и описание на тему ИИ.
 * @param title заголовок статьи
 * @param description описание/сниппет
 */
export function analyzeRelevance(title: string, description: string): RelevanceResult {
  const titleLc = (title || "").toLowerCase();
  const descLc = (description || "").toLowerCase();
  const tags = new Set<string>();
  let score = 0;

  for (const { patterns, tag } of KEYWORDS) {
    const inTitle = patterns.some((p) => titleLc.includes(p));
    const inDesc = patterns.some((p) => descLc.includes(p));
    if (inTitle) {
      score += 30;
      tags.add(tag);
    } else if (inDesc) {
      score += 12;
      tags.add(tag);
    }
  }

  for (const { token, tag } of WORD_BOUNDARY_TOKENS) {
    if (hasWord(titleLc, token)) {
      score += 30;
      tags.add(tag);
    } else if (hasWord(descLc, token)) {
      score += 12;
      tags.add(tag);
    }
  }

  const tagList = [...tags];
  const relevant = tagList.length > 0;
  const relevance = Math.max(0, Math.min(100, score));

  const reasons: string[] = [];
  if (tagList.length > 0) {
    reasons.push(`Темы: ${tagList.join(", ")}`);
  }
  if (KEYWORDS.some(({ patterns }) => patterns.some((p) => titleLc.includes(p)))) {
    reasons.push("Ключевые слова про ИИ в заголовке");
  }

  return { relevant, relevance, tags: tagList, reasons };
}
