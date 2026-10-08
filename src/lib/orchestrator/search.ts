import { SearchResult } from "./types";
import { CONFIG } from "./config";
import { clip, decodeHtml, fetchWithTimeout, getErrorMessage, normalizePlainText } from "./text";

const SEARCH_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0 Safari/537.36 Office-AI/1.0";
const SEARCH_CACHE_TTL_MS = 5 * 60 * 1000;
const scoutSearchCache = new Map<string, { expiresAt: number; results: SearchResult[] }>();

const SEARCH_STOPWORDS = new Set([
  "como", "qué", "que", "para", "sobre", "del", "de", "la", "el", "los", "las",
  "un", "una", "por", "favor", "investigue", "investigar", "investiga",
  "investigacion", "necesito", "quiero", "decile", "pedile", "delegale",
  "asignale", "dile", "aria", "scout",
]);

const SCOUT_TRANSLATIONS = [
  { pattern: /\borquestador(?:es)? de agentes de ia\b/gi, replacement: "AI agent orchestration" },
  { pattern: /\bagentes? de ia\b/gi, replacement: "AI agents" },
  { pattern: /\bescalar\b/gi, replacement: "scaling" },
  { pattern: /\bescalabilidad\b/gi, replacement: "scalability" },
  { pattern: /\bcomo\b/gi, replacement: "how to" },
  { pattern: /\bconsultas\b/gi, replacement: "orchestration" },
];

function unwrapDuckUrl(raw: string) {
  const absolute = raw.startsWith("//") ? `https:${raw}` : raw;
  const url = new URL(absolute, "https://duckduckgo.com");
  return decodeURIComponent(url.searchParams.get("uddg") ?? absolute);
}

function buildKeywordQuery(task: string) {
  const keywords = normalizePlainText(task)
    .split(" ")
    .filter((word) => word.length > 2 && !SEARCH_STOPWORDS.has(word))
    .slice(0, 8);
  return keywords.join(" ");
}

function buildTranslatedScoutQuery(task: string) {
  let translated = task;
  for (const rule of SCOUT_TRANSLATIONS) {
    translated = translated.replace(rule.pattern, rule.replacement);
  }
  return translated.replace(/\s+/g, " ").trim();
}

function buildScoutQueries(task: string) {
  const variants = [task.trim(), buildTranslatedScoutQuery(task), buildKeywordQuery(task)]
    .map((query) => query.trim())
    .filter(Boolean);
  return [...new Set(variants)].slice(0, 2);
}

async function searchDuckDuckGo(query: string) {
  const response = await fetchWithTimeout(
    `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
    { headers: { "User-Agent": SEARCH_UA, Accept: "text/html,application/xhtml+xml" } },
    4000
  );

  if (!response.ok) throw new Error(`DuckDuckGo devolvió ${response.status}`);

  const html = await response.text();
  const regex =
    /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]{0,1600}?(?:<a[^>]*class="result__snippet"|<div[^>]*class="result__snippet"|<span[^>]*class="result__snippet")[^>]*>([\s\S]*?)<\/(?:a|div|span)>/gi;

  const results: SearchResult[] = [];
  for (const match of html.matchAll(regex)) {
    const url = unwrapDuckUrl(match[1]);
    if (!url.startsWith("http") || results.some((item) => item.url === url)) continue;
    if (url.includes("duckduckgo.com/y.js") || url.includes("duckduckgo.com/l/?")) continue;

    results.push({
      title: clip(decodeHtml(match[2]), 160),
      url,
      snippet: clip(decodeHtml(match[3]), 320),
    });
    if (results.length >= 5) break;
  }
  return results;
}

function extractReadableText(html: string, maxChars: number) {
  const withoutBlocks = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<header[\s\S]*?<\/header>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");
  // Priorizamos el contenido principal si existe.
  const mainMatch = withoutBlocks.match(/<(article|main)[^>]*>([\s\S]*?)<\/\1>/i);
  const target = mainMatch?.[2] ?? withoutBlocks;
  return clip(decodeHtml(target), maxChars);
}

/**
 * Lee en profundidad las N páginas top y llena pageExcerpt con texto real.
 * Antes este campo existía en los tipos pero nunca se llenaba: SCOUT trabajaba
 * solo con snippets de 320 caracteres. Con contenido real, la síntesis con
 * modelo deja de alucinar sobre títulos sueltos.
 */
export async function fetchPageExcerpts(results: SearchResult[]) {
  const count = CONFIG.scoutPageFetchCount;
  if (count <= 0 || results.length === 0) return results;

  const targets = results.slice(0, count);
  await Promise.allSettled(
    targets.map(async (result) => {
      try {
        const response = await fetchWithTimeout(
          result.url,
          { headers: { "User-Agent": SEARCH_UA, Accept: "text/html" } },
          CONFIG.scoutPageTimeoutMs
        );
        if (!response.ok) return;
        const contentType = response.headers.get("content-type") ?? "";
        if (!contentType.includes("html")) return;
        const html = await response.text();
        const excerpt = extractReadableText(html, CONFIG.scoutPageExcerptChars);
        if (excerpt.length > 120) result.pageExcerpt = excerpt;
      } catch {
        // página caída o lenta: seguimos con el snippet
      }
    })
  );
  return results;
}

export async function searchWeb(task: string) {
  const cacheKey = normalizePlainText(task);
  const cached = scoutSearchCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.results;

  const queries = buildScoutQueries(task);
  const settled = await Promise.allSettled(queries.map((query) => searchDuckDuckGo(query)));
  const combined: SearchResult[] = [];
  const errors: string[] = [];

  for (let index = 0; index < settled.length; index += 1) {
    const result = settled[index];
    if (result.status === "fulfilled") {
      for (const item of result.value) {
        if (combined.some((existing) => existing.url === item.url)) continue;
        combined.push(item);
        if (combined.length >= 5) break;
      }
    } else {
      errors.push(`${queries[index]}: ${getErrorMessage(result.reason)}`);
    }
    if (combined.length >= 5) break;
  }

  if (combined.length === 0 && errors.length > 0) throw new Error(errors.join(" | "));

  const finalResults = await fetchPageExcerpts(combined.slice(0, 5));
  scoutSearchCache.set(cacheKey, { expiresAt: Date.now() + SEARCH_CACHE_TTL_MS, results: finalResults });
  return finalResults;
}

export function sourceBlock(results: SearchResult[]) {
  if (results.length === 0) return "";
  return `Fuentes:\n${results.map((item, index) => `[${index + 1}] ${item.title} - ${item.url}`).join("\n")}`;
}

export function scoutContextBlock(results: SearchResult[]) {
  if (results.length === 0) return "No se obtuvo contexto web útil.";
  return results
    .map((item, index) =>
      [
        `[${index + 1}] ${item.title}`,
        `URL: ${item.url}`,
        `Snippet: ${item.snippet}`,
        item.pageExcerpt ? `Lectura de página: ${item.pageExcerpt}` : "",
      ]
        .filter(Boolean)
        .join("\n")
    )
    .join("\n\n");
}

export function selectRelevantEvidence(result: SearchResult, task: string) {
  const keywords = normalizePlainText(task)
    .split(" ")
    .filter((word) => word.length > 3 && !SEARCH_STOPWORDS.has(word));
  const segments = [result.snippet, result.pageExcerpt, result.title]
    .filter((value): value is string => Boolean(value))
    .flatMap((value) => value.split(/(?<=[.!?])\s+/))
    .map((value) => value.trim())
    .filter((value) => value.length > 40);

  if (segments.length === 0) return result.snippet || result.title;

  const scored = segments
    .map((segment) => ({
      segment,
      score:
        keywords.reduce((total, keyword) => total + (normalizePlainText(segment).includes(keyword) ? 3 : 0), 0) +
        segment.length / 200,
    }))
    .sort((a, b) => b.score - a.score);

  return clip(scored[0]?.segment || result.snippet || result.title, 220);
}
