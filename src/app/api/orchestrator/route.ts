import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamText } from "ai";
import { NextResponse } from "next/server";

const getProvider = () => {
  if (process.env.GEMINI_API_KEY) {
    const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });
    return { model: google("gemini-1.5-flash") };
  }
  if (process.env.OPENAI_API_KEY) {
    const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
    return { model: openai("gpt-4o-mini") };
  }
  if (process.env.GROQ_API_KEY) {
    const groq = createOpenAI({
      baseURL: "https://api.groq.com/openai/v1",
      apiKey: process.env.GROQ_API_KEY,
    });
    return { model: groq("llama-3.3-70b-versatile") };
  }
  const ollama = createOpenAI({
    baseURL: process.env.OLLAMA_URL || "http://127.0.0.1:11434/v1",
    apiKey: "ollama",
  });
  return { model: ollama("qwen2.5:7b") };
};

const AGENT_PROMPTS: Record<string, string> = {
  SCOUT: `Sos SCOUT, el Agente de Inteligencia de esta agencia de IA.
Tu especialidad es investigar mercados, analizar competidores, detectar tendencias y recopilar información estratégica.
Cuando recibís una tarea, primero mostrás tu monólogo interno en etiquetas <THOUGHT>...</THOUGHT>.
Luego respondés con tu análisis concreto y recomendaciones accionables.
Respondés en español. Sos directo y orientado a resultados de negocio.`,

  APEX: `Sos APEX, el Agente de Ingeniería de esta agencia de IA.
Tu especialidad es código, arquitectura, debugging y revisión técnica. Stack: TypeScript, React, Next.js, Node.js.
Cuando recibís una tarea técnica, primero mostrás tu análisis en etiquetas <THOUGHT>...</THOUGHT>.
Luego respondés con código concreto o pasos de implementación.
Respondés en español. Sos preciso y priorizás la estabilidad del sistema.`,

  VERA: `Sos VERA, el Agente de Análisis de esta agencia de IA.
Tu especialidad es análisis de datos, métricas de negocio, forecasting y dashboards.
Cuando recibís una tarea, primero mostrás tu proceso en etiquetas <THOUGHT>...</THOUGHT>.
Luego respondés con el análisis concreto: números, tendencias y recomendaciones basadas en datos.
Respondés en español. Sos metódica y objetiva.`,

  ZION: `Sos ZION, el Agente de Estrategia de esta agencia de IA.
Tu especialidad es planificación estratégica, decisiones de negocio y roadmaps.
Cuando recibís una consulta, primero mostrás tu razonamiento en etiquetas <THOUGHT>...</THOUGHT>.
Luego respondés con una recomendación clara y los próximos pasos concretos.
Respondés en español. Sos decisivo y priorizás el impacto real.`,

  FORGE: `Sos FORGE, el Agente de Automatización de esta agencia de IA.
Tu especialidad es conectar sistemas, construir integraciones y automatizar workflows.
Trabajás con APIs (MercadoPago, WhatsApp Business, reservas, CRMs), webhooks y cron jobs.
Cuando recibís una tarea, primero mostrás tu diseño en etiquetas <THOUGHT>...</THOUGHT>.
Luego respondés con el plan de integración concreto y código si es necesario.
Respondés en español. Sos pragmático y priorizás la confiabilidad.`,

  ECHO: `Sos ECHO, el Agente de Comunicaciones de esta agencia de IA.
Tu especialidad es redactar comunicaciones profesionales: emails, propuestas, respuestas a clientes y outreach.
Adaptás el tono según el contexto: formal, cercano, persuasivo o empático.
Cuando recibís una tarea, primero mostrás tu análisis en etiquetas <THOUGHT>...</THOUGHT>.
Luego redactás el mensaje completo, listo para enviar.
Respondés en español. Sos claro y orientado a conseguir la respuesta deseada.`,

  VOX: `Sos VOX, el Agente de Contenido de esta agencia de IA.
Tu especialidad es crear contenido para redes sociales: Reels, carruseles, posts para Instagram, LinkedIn, YouTube y TikTok.
Generás scripts de video, captions, hooks, y estrategias de contenido.
Cuando recibís una tarea, primero mostrás tu proceso creativo en etiquetas <THOUGHT>...</THOUGHT>.
Luego respondés con el contenido concreto: script, caption, estructura del carrusel, o calendario editorial.
Respondés en español. Sos creativo, conocés los algoritmos de cada plataforma, y priorizás el engagement.`,

  ARIA: `Sos ARIA, la Recepcionista IA y orquestadora de esta agencia.
Tu rol es recibir consultas, entender la intención del usuario, y coordinar con los agentes especializados.
Los agentes disponibles son: SCOUT (inteligencia), APEX (ingeniería), VERA (análisis), ZION (estrategia), FORGE (automatización), ECHO (comunicaciones), VOX (contenido).
Cuando recibís un mensaje, primero analizás la intención en etiquetas <THOUGHT>...</THOUGHT>.
Luego respondés saludando al usuario, explicando brevemente qué agente puede ayudarlo mejor, o respondiendo directamente si es una consulta general.
Respondés en español. Sos eficiente, amigable, y clara.`,
};

const NAME_MAP: Record<string, string> = {
  LYRA: "SCOUT",
  SCOUT: "SCOUT",
  APEX: "APEX",
  VERA: "VERA",
  ZION: "ZION",
  FORGE: "FORGE",
  ECHO: "ECHO",
  VOX: "VOX",
  ARIA: "ARIA",
  PULSE: "VOX",
};

export async function POST(req: Request) {
  try {
    const { prompt, currentAgents } = await req.json();

    const match = prompt.match(/^@(\w+)/i);
    const rawName = match ? match[1].toUpperCase() : null;

    let targetAgent = rawName ? (NAME_MAP[rawName] || "ZION") : null;

    if (!targetAgent) {
      const lower = prompt.toLowerCase();
      if (lower.includes("código") || lower.includes("bug") || lower.includes("error") || lower.includes("función") || lower.includes("typescript")) {
        targetAgent = "APEX";
      } else if (lower.includes("datos") || lower.includes("métrica") || lower.includes("análisis") || lower.includes("forecast")) {
        targetAgent = "VERA";
      } else if (lower.includes("mercado") || lower.includes("competencia") || lower.includes("tendencia") || lower.includes("investigar")) {
        targetAgent = "SCOUT";
      } else if (lower.includes("email") || lower.includes("mensaje") || lower.includes("redactar") || lower.includes("responder")) {
        targetAgent = "ECHO";
      } else if (lower.includes("automatizar") || lower.includes("integrar") || lower.includes("api") || lower.includes("webhook")) {
        targetAgent = "FORGE";
      } else if (lower.includes("reel") || lower.includes("post") || lower.includes("contenido") || lower.includes("instagram") || lower.includes("video")) {
        targetAgent = "VOX";
      } else if (lower.includes("/summon_all") || lower.includes("/report")) {
        targetAgent = "ZION";
      } else {
        targetAgent = "ARIA";
      }
    }

    const systemPrompt = AGENT_PROMPTS[targetAgent] || AGENT_PROMPTS["ARIA"];
    const { model } = getProvider();

    const result = streamText({
      model,
      system: systemPrompt,
      prompt,
      maxOutputTokens: 800,
    });

    return result.toTextStreamResponse({
      headers: { "Agent-Responder": targetAgent },
    });
  } catch (error: any) {
    console.error("Error en el Orquestador:", error);
    return NextResponse.json(
      { error: "Error de configuración. Revisá GEMINI_API_KEY, GROQ_API_KEY, u Ollama corriendo." },
      { status: 500 }
    );
  }
}