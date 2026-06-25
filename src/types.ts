/** Идентификатор площадки-источника. */
export type SourceId = "habr" | "vc" | "dzen";

/** Нормализованная статья, готовая к отдаче во фронтенд. */
export interface Article {
  /** Стабильный id (хеш URL) — используется фронтендом как ключ статуса. */
  id: string;
  source: SourceId;
  /** Человекочитаемое имя площадки. */
  sourceLabel: string;
  title: string;
  /** Ссылка на оригинал. */
  url: string;
  /** ISO-дата публикации или null, если площадка её не отдала. */
  publishedAt: string | null;
  /** Короткое саммари на русском (1–3 предложения, эвристически). */
  summary: string;
  /** Релевантные теги, найденные в тексте. */
  tags: string[];
  /** Почему статья рекомендована (человекочитаемые причины). */
  reasons: string[];
  /** Оценка релевантности 0..100. */
  relevance: number;
}

/** Сырой материал до нормализации (то, что вернул парсер источника). */
export interface RawArticle {
  source: SourceId;
  sourceLabel: string;
  title: string;
  url: string;
  publishedAt: string | null;
  /** Описание/сниппет/контент для эвристического саммари. */
  description: string;
}

/** Диагностика по одному источнику (для честного degraded-статуса). */
export interface SourceDiagnostic {
  source: SourceId;
  label: string;
  ok: boolean;
  /** Сколько релевантных статей отобрано после фильтрации. */
  count: number;
  /** HTTP-статус последнего запроса, если был. */
  httpStatus?: number;
  /** Текст ошибки, если источник не ответил/заблокировал. */
  error?: string;
  fetchedAt: string;
}

/** Ответ эндпоинта GET /api/articles. */
export interface ArticlesResponse {
  articles: Article[];
  diagnostics: SourceDiagnostic[];
  lastUpdated: string;
  /** Возраст кэша в секундах. */
  cacheAgeSeconds: number;
  /** true, если хотя бы один источник недоступен. */
  degraded: boolean;
}

/** Результат работы одного коллектора источника. */
export interface SourceResult {
  articles: RawArticle[];
  diagnostic: SourceDiagnostic;
}
