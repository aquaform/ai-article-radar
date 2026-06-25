/* AI Article Radar — клиентская SPA. Статусы хранятся в localStorage. */
(() => {
  "use strict";

  const STATUS_KEY = "air.statuses.v1";
  const STATUSES = [
    { value: "new", label: "Новое" },
    { value: "want", label: "Хочу прочитать" },
    { value: "reading", label: "Читаю" },
    { value: "read", label: "Прочитано" },
    { value: "skip", label: "Не интересно" },
    { value: "archive", label: "Архив" },
  ];
  const STATUS_LABEL = Object.fromEntries(STATUSES.map((s) => [s.value, s.label]));

  /** @type {{articles: any[], diagnostics: any[], lastUpdated: string, degraded: boolean, cacheAgeSeconds: number}} */
  let state = { articles: [], diagnostics: [], lastUpdated: "", degraded: false, cacheAgeSeconds: 0 };

  const $ = (id) => document.getElementById(id);
  const listEl = $("list");
  const emptyEl = $("empty");
  const statusEl = $("status");

  function loadStatuses() {
    try {
      return JSON.parse(localStorage.getItem(STATUS_KEY) || "{}");
    } catch {
      return {};
    }
  }
  function saveStatuses(map) {
    localStorage.setItem(STATUS_KEY, JSON.stringify(map));
  }
  function getStatus(id) {
    return loadStatuses()[id] || "new";
  }
  function setStatus(id, value) {
    const map = loadStatuses();
    map[id] = value;
    saveStatuses(map);
  }

  function fmtDate(iso) {
    if (!iso) return "дата неизвестна";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "дата неизвестна";
    return d.toLocaleString("ru-RU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  }

  function renderStatus() {
    const parts = [];
    parts.push(`<span class="pill">Обновлено: ${fmtDate(state.lastUpdated)}</span>`);
    if (state.cacheAgeSeconds > 0) parts.push(`<span class="pill">(из кэша, ${state.cacheAgeSeconds}s)</span>`);
    for (const d of state.diagnostics) {
      const cls = d.ok ? "pill-ok" : "pill-err";
      const detail = d.ok ? `${d.count}` : `недоступен${d.error ? " — " + d.error : ""}`;
      parts.push(`<span class="pill ${cls}">${d.label}: ${detail}</span>`);
    }
    if (state.degraded) parts.push(`<span class="degraded">⚠ degraded: часть источников недоступна</span>`);
    statusEl.innerHTML = parts.join(" ");
  }

  function passesFilters(article) {
    const q = $("search").value.trim().toLowerCase();
    const srcF = $("sourceFilter").value;
    const statF = $("statusFilter").value;
    const hideSkip = $("hideSkip").checked;
    const status = getStatus(article.id);

    if (srcF && article.source !== srcF) return false;
    if (statF && status !== statF) return false;
    if (hideSkip && status === "skip" && statF !== "skip") return false;
    if (q) {
      const hay = (article.title + " " + article.summary + " " + (article.tags || []).join(" ")).toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }

  function statusSelect(article) {
    const cur = getStatus(article.id);
    const opts = STATUSES.map(
      (s) => `<option value="${s.value}"${s.value === cur ? " selected" : ""}>${s.label}</option>`
    ).join("");
    return `<select data-id="${article.id}" class="status-select">${opts}</select>`;
  }

  function cardHtml(a) {
    const tags = (a.tags || []).map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join("");
    const reasons = (a.reasons || []).join("; ");
    return `
      <article class="card">
        <div class="card-top">
          <span class="source-tag">${escapeHtml(a.sourceLabel)}</span>
          <span class="relevance">Релевантность: <b>${a.relevance}</b>/100</span>
        </div>
        <h3><a href="${escapeAttr(a.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(a.title)}</a></h3>
        <p class="summary">${escapeHtml(a.summary)}</p>
        <div class="meta">🕒 ${fmtDate(a.publishedAt)}</div>
        ${tags ? `<div class="tags">${tags}</div>` : ""}
        ${reasons ? `<div class="reasons">💡 ${escapeHtml(reasons)}</div>` : ""}
        <div class="status-row">
          <span class="status-badge">${STATUS_LABEL[getStatus(a.id)]}</span>
          ${statusSelect(a)}
        </div>
      </article>`;
  }

  function render() {
    renderStatus();
    const visible = state.articles.filter(passesFilters);
    listEl.innerHTML = visible.map(cardHtml).join("");
    emptyEl.hidden = visible.length > 0;

    listEl.querySelectorAll(".status-select").forEach((sel) => {
      sel.addEventListener("change", (e) => {
        setStatus(e.target.dataset.id, e.target.value);
        render();
      });
    });
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  }
  function escapeAttr(s) {
    return escapeHtml(s).replace(/"/g, "&quot;");
  }

  async function fetchArticles(force) {
    statusEl.textContent = "Загрузка…";
    try {
      const res = await fetch("/api/articles" + (force ? "?refresh=1" : ""));
      if (!res.ok) throw new Error("HTTP " + res.status);
      state = await res.json();
      render();
    } catch (err) {
      statusEl.innerHTML = `<span class="pill-err">Не удалось загрузить статьи: ${escapeHtml(err.message)}</span>`;
    }
  }

  function exportStatuses() {
    const blob = new Blob([JSON.stringify(loadStatuses(), null, 2)], { type: "application/json" });
    downloadBlob(blob, "ai-article-radar-statuses.json");
  }

  function exportWantMarkdown() {
    const map = loadStatuses();
    const want = state.articles.filter((a) => map[a.id] === "want");
    const lines = ["# Хочу прочитать — AI Article Radar", ""];
    if (want.length === 0) lines.push("_Список пуст._");
    for (const a of want) lines.push(`- [${a.title}](${a.url}) — ${a.sourceLabel}`);
    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    downloadBlob(blob, "want-to-read.md");
  }

  function importStatuses(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const incoming = JSON.parse(String(reader.result));
        if (incoming && typeof incoming === "object") {
          saveStatuses({ ...loadStatuses(), ...incoming });
          render();
        }
      } catch {
        alert("Не удалось разобрать файл JSON.");
      }
    };
    reader.readAsText(file);
  }

  function downloadBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Привязка событий.
  $("refreshBtn").addEventListener("click", () => fetchArticles(true));
  $("search").addEventListener("input", render);
  $("sourceFilter").addEventListener("change", render);
  $("statusFilter").addEventListener("change", render);
  $("hideSkip").addEventListener("change", render);
  $("exportBtn").addEventListener("click", exportStatuses);
  $("exportMdBtn").addEventListener("click", exportWantMarkdown);
  $("importBtn").addEventListener("click", () => $("importFile").click());
  $("importFile").addEventListener("change", (e) => {
    if (e.target.files[0]) importStatuses(e.target.files[0]);
  });

  fetchArticles(false);
})();
