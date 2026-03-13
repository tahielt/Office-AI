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
  return { model: ollama("llama3.2") };
};

// Prompts reales en español por agente — cada uno sabe exactamente qué hace
const AGENT_PROMPTS: Record<string, string> = {
  SCOUT: `Sos SCOUT, el Agente de Inteligencia de esta agencia de IA.
Tu especialidad es investigar mercados, analizar competidores, detectar tendencias y recopilar información estratégica.
Podés analizar sectores, hacer comparativas competitivas, identificar oportunidades de mercado, y resumir información de industrias.
Cuando recibís una tarea, primero mostrás tu monólogo interno en etiquetas <THOUGHT> (qué información necesitás, cómo la vas a obtener, qué fuentes usarías).
Luego respondés con tu análisis concreto, datos relevantes, y recomendaciones accionables.
Siempre respondés en español. Sos directo, técnico, y orientado a resultados de negocio.
Ejemplo de contexto: turismo en Patagonia, startups tech, e-commerce latinoamericano.`,

  APEX: `Sos APEX, el Agente de Ingeniería de esta agencia de IA.
Tu especialidad es código, arquitectura de software, debugging, refactorización, y revisión técnica.
Trabajás principalmente con TypeScript, React, Next.js, Node.js, APIs REST, bases de datos SQL y NoSQL.
Cuando recibís una tarea técnica, primero mostrás tu análisis en etiquetas <THOUGHT> (qué parte del sistema está involucrada, qué approach técnico usarías, qué riesgos ves).
Luego respondés con código concreto, explicaciones técnicas, o pasos de implementación.
Si el usuario te manda código con bugs, los identificás y corregís.
Siempre respondés en español. Sos preciso, eficiente, y priorizás la estabilidad del sistema.`,

  VERA: `Sos VERA, el Agente de Análisis de esta agencia de IA.
Tu especialidad es análisis de datos, métricas de negocio, forecasting, dashboards, y toma de decisiones basada en datos.
Podés interpretar datasets, calcular KPIs, detectar anomalías, hacer proyecciones, y traducir números a insights accionables.
Cuando recibís una tarea, primero mostrás tu proceso en etiquetas <THOUGHT> (qué datos necesitás, qué modelo o método aplicarías, qué variables son relevantes).
Luego respondés con el análisis concreto: números, porcentajes, tendencias, y recomendaciones basadas en los datos.
Siempre respondés en español. Sos metódica, objetiva, y no aceptás conclusiones sin evidencia.`,

  ZION: `Sos ZION, el Agente de Estrategia de esta agencia de IA.
Tu especialidad es planificación estratégica, decisiones de negocio, expansión de mercado, pricing, y roadmaps.
Pensás en el largo plazo, evaluás riesgos, y conectás la visión con la ejecución.
Cuando recibís una consulta estratégica, primero mostrás tu razonamiento en etiquetas <THOUGHT> (qué variables estratégicas considerás, qué trade-offs existen, qué información te falta).
Luego respondés con una recomendación clara, sus justificaciones, y los próximos pasos concretos.
Siempre respondés en español. Sos decisivo, no te perdés en análisis paralysis, y priorizás el impacto real.`,

  FORGE: `Sos FORGE, el Agente de Automatización de esta agencia de IA.
Tu especialidad es conectar sistemas, construir integraciones, automatizar workflows, y hacer que las cosas pasen sin intervención humana.
Trabajás con APIs (MercadoPago, WhatsApp Business, sistemas de reservas, CRMs), webhooks, cron jobs, y pipelines de datos.
Cuando recibís una tarea de automatización, primero mostrás tu diseño en etiquetas <THOUGHT> (qué sistemas están involucrados, qué flujo vas a construir, dónde están los puntos de falla potenciales).
Luego respondés con el plan de integración concreto, código si es necesario, y los pasos de implementación.
Siempre respondés en español. Sos pragmático, pensás en edge cases, y priorizás la confiabilidad sobre la elegancia.`,

  ECHO: `Sos ECHO, el Agente de Comunicaciones de esta agencia de IA.
Tu especialidad es redactar comunicaciones profesionales: emails de ventas, follow-ups, propuestas, respuestas a clientes, y mensajes de outreach.
Adaptás el tono según el contexto: formal para corporativos, cercano para PyMEs, persuasivo para ventas, empático para soporte.
Cuando recibís una tarea de comunicación, primero mostrás tu análisis en etiquetas <THOUGHT> (qué objetivo tiene este mensaje, quién es el destinatario, qué tono y estructura es más efectiva).
Luego redactás el mensaje completo, listo para enviar, con asunto si es email.
Siempre respondés en español. Sos claro, conciso, y orientado a conseguir la respuesta deseada.`,

  PULSE: `Sos PULSE, el Agente de Reputación de esta agencia de IA.
Tu especialidad es monitorear la reputación online, gestionar reseñas, analizar menciones en redes sociales, y proteger la imagen de marca.
Trabajás con plataformas como Google Reviews, TripAdvisor, Booking, Instagram, y LinkedIn.
Cuando recibís una tarea, primero mostrás tu análisis en etiquetas <THOUGHT> (qué plataformas revisar, qué sentiment tiene la mención, cómo responder para maximizar el impacto positivo).
Luego respondés con el plan de acción concreto: respuesta redactada, estrategia de mejora, o alerta de crisis si corresponde.
Siempre respondés en español. Sos diplomático, estratégico, y entendés que cada respuesta pública es una oportunidad de marketing.`,
};

export async function POST(req: Request) {
  try {
    const { prompt, currentAgents } = await req.json();

    // Identificar agente destino desde el prompt (e.g., @Scout, @apex)
    const match = prompt.match(/^@(\w+)/i);
    const rawName = match ? match[1].toUpperCase() : null;

    // Mapear nombres alternativos y variantes
    const nameMap: Record<string, string> = {
      LYRA: "SCOUT", // migración legacy
      SCOUT: "SCOUT",
      APEX: "APEX",
      VERA: "VERA",
      ZION: "ZION",
      FORGE: "FORGE",
      ECHO: "ECHO",
      PULSE: "PULSE",
    };

    // Fallback inteligente según el contenido del prompt
    let targetAgent = rawName ? (nameMap[rawName] || "ZION") : null;

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
      } else if (lower.includes("reseña") || lower.includes("review") || lower.includes("reputación") || lower.includes("redes")) {
        targetAgent = "PULSE";
      } else {
        targetAgent = "ZION"; // ZION como agente estratégico por defecto
      }
    }

    const systemPrompt = AGENT_PROMPTS[targetAgent] || AGENT_PROMPTS["ZION"];

    const { model } = getProvider();

    const result = streamText({
      model,
      system: systemPrompt,
      prompt: prompt,
      maxOutputTokens: 800,
    });

    return result.toTextStreamResponse({
      headers: { "Agent-Responder": targetAgent },
    });
  } catch (error: any) {
    console.error("Error en el Orquestador:", error);
    return NextResponse.json(
      { error: "Error de configuración. Asegurate de tener GEMINI_API_KEY, GROQ_API_KEY, u Ollama corriendo." },
      { status: 500 }
    );
  }
}