/** HTTP-утилиты: fetch с таймаутом и браузерным User-Agent. */

const DEFAULT_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export interface FetchTextResult {
  ok: boolean;
  status: number;
  body: string;
}

/**
 * Загружает текст по URL с таймаутом. Не бросает на сетевых ошибках по статусу,
 * но бросает на таймаут/сетевой сбой — вызывающая сторона ловит для diagnostics.
 * @param url адрес ресурса
 * @param timeoutMs таймаут в миллисекундах
 */
export async function fetchText(url: string, timeoutMs = 12000): Promise<FetchTextResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": DEFAULT_UA,
        Accept: "text/html,application/xhtml+xml,application/xml,application/json;q=0.9,*/*;q=0.8",
        "Accept-Language": "ru,en;q=0.8",
      },
      redirect: "follow",
    });
    const body = await res.text();
    return { ok: res.ok, status: res.status, body };
  } finally {
    clearTimeout(timer);
  }
}
