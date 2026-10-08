import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { generateObject, generateText, jsonSchema, streamText } from "ai";

import {
  CONFIG,
  getOllamaModel,
  getOllamaNativeChatUrl,
  getOllamaBaseUrl,
  getRequestedProvider,
} from "./config";
import {
  GenerationOptions,
  GenerationResult,
  GenerationUsage,
  ObjectGenerationResult,
  ProviderId,
} from "./types";
import { fetchWithTimeout, getErrorMessage } from "./text";

type ModelFactory = () => Parameters<typeof generateText>[0]["model"];

interface ProviderCandidate {
  id: Exclude<ProviderId, "auto" | "stub">;
  label: string;
  enabled: boolean;
  createModel: ModelFactory;
}

interface OllamaChatResponse {
  message?: { content?: string };
  prompt_eval_count?: number;
  eval_count?: number;
  done?: boolean;
}

type ResolvedOptions = Required<Pick<GenerationOptions, "maxOutputTokens" | "timeoutMs" | "numCtx" | "temperature">> & {
  agentId?: GenerationOptions["agentId"];
  onToken?: GenerationOptions["onToken"];
};

export function getProviders(): ProviderCandidate[] {
  return [
    {
      id: "openai",
      label: "OpenAI",
      enabled: Boolean(process.env.OPENAI_API_KEY),
      createModel: () => createOpenAI({ apiKey: process.env.OPENAI_API_KEY })("gpt-4o-mini"),
    },
    {
      id: "groq",
      label: "Groq",
      enabled: Boolean(process.env.GROQ_API_KEY),
      createModel: () =>
        createOpenAI({ baseURL: "https://api.groq.com/openai/v1", apiKey: process.env.GROQ_API_KEY })(
          "llama-3.3-70b-versatile"
        ),
    },
    {
      id: "gemini",
      label: "Gemini",
      enabled: Boolean(process.env.GEMINI_API_KEY),
      createModel: () => createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY })("gemini-2.0-flash"),
    },
    {
      id: "ollama",
      label: "Ollama",
      enabled: Boolean(process.env.OLLAMA_URL) || getRequestedProvider() === "ollama",
      createModel: () =>
        createOpenAI({ baseURL: getOllamaBaseUrl(), apiKey: "ollama" }).chat(
          process.env.OLLAMA_MODEL || "qwen2.5:7b"
        ),
    },
  ];
}

function resolveOptions(options: GenerationOptions): ResolvedOptions {
  return {
    agentId: options.agentId,
    onToken: options.onToken,
    maxOutputTokens: options.maxOutputTokens ?? CONFIG.leadTokens,
    timeoutMs: options.timeoutMs ?? CONFIG.defaultTimeoutMs,
    numCtx: options.numCtx ?? CONFIG.ollamaNumCtx,
    temperature: options.temperature ?? 0.2,
  };
}

/** Normaliza el usage del AI SDK (inputTokens/outputTokens o promptTokens/completionTokens según versión). */
function normalizeSdkUsage(usage: unknown): GenerationUsage | undefined {
  if (typeof usage !== "object" || usage === null) return undefined;
  const raw = usage as Record<string, unknown>;
  const promptTokens = Number(raw.inputTokens ?? raw.promptTokens ?? 0);
  const completionTokens = Number(raw.outputTokens ?? raw.completionTokens ?? 0);
  if (!Number.isFinite(promptTokens) && !Number.isFinite(completionTokens)) return undefined;
  return {
    promptTokens: Number.isFinite(promptTokens) ? promptTokens : 0,
    completionTokens: Number.isFinite(completionTokens) ? completionTokens : 0,
  };
}

function ollamaUsage(payload: OllamaChatResponse): GenerationUsage | undefined {
  if (typeof payload.eval_count !== "number" && typeof payload.prompt_eval_count !== "number") return undefined;
  return { promptTokens: payload.prompt_eval_count ?? 0, completionTokens: payload.eval_count ?? 0 };
}

function buildOllamaBody(system: string, prompt: string, options: ResolvedOptions, extra: Record<string, unknown> = {}) {
  return {
    model: getOllamaModel(options.agentId),
    keep_alive: CONFIG.ollamaKeepAlive,
    messages: [
      { role: "system", content: system },
      { role: "user", content: prompt },
    ],
    options: {
      temperature: options.temperature,
      num_predict: options.maxOutputTokens,
      num_ctx: options.numCtx,
    },
    ...extra,
  };
}

async function callOllamaNative(system: string, prompt: string, options: ResolvedOptions): Promise<GenerationResult> {
  const errors: string[] = [];
  try {
    const response = await fetchWithTimeout(
      getOllamaNativeChatUrl(),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildOllamaBody(system, prompt, options, { stream: false })),
      },
      options.timeoutMs
    );

    if (response.ok) {
      const payload = (await response.json()) as OllamaChatResponse;
      const text = payload.message?.content?.trim();
      if (text) return { text, provider: "ollama", errors, usage: ollamaUsage(payload) };
      errors.push("Ollama: respuesta vacía");
    } else {
      errors.push(`Ollama: ${response.status}`);
    }
  } catch (error) {
    errors.push(`Ollama: ${getErrorMessage(error)}`);
  }
  return { text: null, provider: "stub", errors };
}

/**
 * Streaming nativo de Ollama: lee NDJSON chunk a chunk, dispara onToken por
 * delta y devuelve el texto completo + usage real del chunk final
 * (prompt_eval_count / eval_count).
 */
async function callOllamaNativeStream(system: string, prompt: string, options: ResolvedOptions): Promise<GenerationResult> {
  const errors: string[] = [];
  try {
    const response = await fetchWithTimeout(
      getOllamaNativeChatUrl(),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildOllamaBody(system, prompt, options, { stream: true })),
      },
      options.timeoutMs
    );

    if (!response.ok || !response.body) {
      errors.push(`Ollama: ${response.status}`);
      return { text: null, provider: "stub", errors };
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let fullText = "";
    let usage: GenerationUsage | undefined;

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let newlineIndex = buffer.indexOf("\n");
      while (newlineIndex >= 0) {
        const line = buffer.slice(0, newlineIndex).trim();
        buffer = buffer.slice(newlineIndex + 1);
        newlineIndex = buffer.indexOf("\n");
        if (!line) continue;
        try {
          const chunk = JSON.parse(line) as OllamaChatResponse;
          const delta = chunk.message?.content ?? "";
          if (delta) {
            fullText += delta;
            options.onToken?.(delta);
          }
          if (chunk.done) usage = ollamaUsage(chunk) ?? usage;
        } catch {
          // chunk parcial: lo ignoramos, el siguiente read lo completa
        }
      }
    }

    const text = fullText.trim();
    if (text) return { text, provider: "ollama", errors, usage };
    errors.push("Ollama: respuesta vacía");
  } catch (error) {
    errors.push(`Ollama: ${getErrorMessage(error)}`);
  }
  return { text: null, provider: "stub", errors };
}

function cloudCandidates(preferred: ProviderId) {
  return getProviders().filter(
    (provider) => provider.enabled && provider.id !== "ollama" && (preferred === "auto" || provider.id === preferred)
  );
}

/**
 * Genera texto eligiendo provider según AI_PROVIDER. En "auto" intenta Ollama
 * primero (local-first) y luego cae a los providers cloud habilitados por API
 * key. Si options.onToken está presente, usa el camino de streaming del
 * provider que toque (Ollama NDJSON o streamText del AI SDK), así el caller
 * recibe los mismos deltas sin importar el backend.
 * Devuelve provider="stub" solo si nada respondió.
 */
export async function tryGenerate(
  system: string,
  prompt: string,
  options: GenerationOptions = {}
): Promise<GenerationResult> {
  const preferred = getRequestedProvider();
  const resolved = resolveOptions(options);
  const streaming = Boolean(resolved.onToken);

  if (preferred === "stub") {
    return { text: null, provider: "stub", errors: ["AI_PROVIDER=stub"] };
  }

  const errors: string[] = [];

  if (preferred === "auto" || preferred === "ollama") {
    const ollama = streaming
      ? await callOllamaNativeStream(system, prompt, resolved)
      : await callOllamaNative(system, prompt, resolved);
    if (ollama.text) return ollama;
    errors.push(...ollama.errors);
    if (preferred === "ollama") {
      return { text: null, provider: "stub", errors: errors.length ? errors : ["Ollama no respondió"] };
    }
  }

  for (const provider of cloudCandidates(preferred)) {
    try {
      if (streaming) {
        const result = streamText({
          model: provider.createModel(),
          system,
          prompt,
          maxOutputTokens: resolved.maxOutputTokens,
          maxRetries: 0,
        });
        let fullText = "";
        for await (const delta of result.textStream) {
          fullText += delta;
          resolved.onToken?.(delta);
        }
        if (fullText.trim()) {
          const usage = normalizeSdkUsage(await Promise.resolve(result.usage).catch(() => undefined));
          return { text: fullText.trim(), provider: provider.id, errors, usage };
        }
        errors.push(`${provider.label}: respuesta vacía`);
        continue;
      }

      const result = await generateText({
        model: provider.createModel(),
        system,
        prompt,
        maxOutputTokens: resolved.maxOutputTokens,
        maxRetries: 0,
      });
      if (result.text.trim()) {
        return { text: result.text.trim(), provider: provider.id, errors, usage: normalizeSdkUsage(result.usage) };
      }
      errors.push(`${provider.label}: respuesta vacía`);
    } catch (error) {
      console.error(`Error en proveedor ${provider.label}:`, error);
      errors.push(`${provider.label}: ${getErrorMessage(error)}`);
    }
  }

  return { text: null, provider: "stub", errors: errors.length ? errors : ["No hay proveedores configurados"] };
}

/**
 * Generación con salida estructurada garantizada, multi-provider:
 * - Ollama: usa `format` nativo de /api/chat con el JSON Schema → el modelo
 *   queda forzado a emitir JSON válido con la forma exacta (clave para
 *   modelos chicos tipo llama3.2:3b en el planner).
 * - Cloud: usa generateObject del AI SDK con el mismo schema (OpenAI structured
 *   outputs, Gemini responseSchema, etc. según provider).
 * Devuelve object=null solo si ningún backend produjo un objeto parseable.
 */
export async function tryGenerateObject(
  system: string,
  prompt: string,
  schema: Record<string, unknown>,
  options: GenerationOptions = {}
): Promise<ObjectGenerationResult> {
  const preferred = getRequestedProvider();
  const resolved = resolveOptions(options);

  if (preferred === "stub") {
    return { object: null, provider: "stub", errors: ["AI_PROVIDER=stub"] };
  }

  const errors: string[] = [];

  if (preferred === "auto" || preferred === "ollama") {
    try {
      const response = await fetchWithTimeout(
        getOllamaNativeChatUrl(),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildOllamaBody(system, prompt, resolved, { stream: false, format: schema })),
        },
        resolved.timeoutMs
      );
      if (response.ok) {
        const payload = (await response.json()) as OllamaChatResponse;
        const raw = payload.message?.content?.trim();
        if (raw) {
          try {
            return { object: JSON.parse(raw), provider: "ollama", errors, usage: ollamaUsage(payload) };
          } catch {
            errors.push("Ollama: JSON inválido pese al schema");
          }
        } else {
          errors.push("Ollama: respuesta vacía");
        }
      } else {
        errors.push(`Ollama: ${response.status}`);
      }
    } catch (error) {
      errors.push(`Ollama: ${getErrorMessage(error)}`);
    }
    if (preferred === "ollama") {
      return { object: null, provider: "stub", errors };
    }
  }

  for (const provider of cloudCandidates(preferred)) {
    try {
      const result = await generateObject({
        model: provider.createModel(),
        system,
        prompt,
        schema: jsonSchema(schema),
        maxRetries: 0,
      });
      if (result.object !== undefined && result.object !== null) {
        return { object: result.object, provider: provider.id, errors, usage: normalizeSdkUsage(result.usage) };
      }
      errors.push(`${provider.label}: objeto vacío`);
    } catch (error) {
      console.error(`Error en proveedor ${provider.label} (object):`, error);
      errors.push(`${provider.label}: ${getErrorMessage(error)}`);
    }
  }

  return { object: null, provider: "stub", errors: errors.length ? errors : ["No hay proveedores configurados"] };
}
