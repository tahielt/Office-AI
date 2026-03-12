import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamText, generateText } from "ai";
import { NextResponse } from "next/server";

// Dynamic provider configuration
// It prioritizes Google Gemini if an API key is available (free tier available)
// Fallback to local Ollama (100% free, no key needed) via the OpenAI compatibility layer
const getProvider = () => {
  if (process.env.GEMINI_API_KEY) {
    const google = createGoogleGenerativeAI({
      apiKey: process.env.GEMINI_API_KEY,
    });
    return { model: google("gemini-2.5-flash") };
  }
  
  if (process.env.OPENAI_API_KEY) {
    const openai = createOpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    return { model: openai("gpt-4o-mini") };
  }

  if (process.env.GROQ_API_KEY) {
    const groq = createOpenAI({
      baseURL: "https://api.groq.com/openai/v1",
      apiKey: process.env.GROQ_API_KEY,
    });
    return { model: groq("llama-3.3-70b-versatile") };
  }

  // Fallback: Local Ollama (completely free, running locally)
  const ollama = createOpenAI({
    baseURL: process.env.OLLAMA_URL || "http://127.0.0.1:11434/v1",
    apiKey: "ollama", // API key is strictly required by the SDK but ignored by Ollama
  });
  return { model: ollama("llama3.2") }; // Usually a fast, small model for quick tests
};

export async function POST(req: Request) {
  try {
    const { prompt, currentAgents } = await req.json();

    // 1. Identify which agent the user is talking to from the prompt (e.g., @Lyra)
    const match = prompt.match(/^@(\w+)/);
    const targetAgentName = match ? match[1].toUpperCase() : "APEX";

    const systemPrompt = `You are playing the role of ${targetAgentName} inside an AI Virtual Office.
    There are 4 agents in the office: LYRA (Research), APEX (Code/Engineering), VERA (Data Analytics), and ZION (Strategy).
    You must act strictly in-character as ${targetAgentName}.
    When thinking or planning your actions, start the output by wrapping your internal thoughts in <THOUGHT> tags.
    For example:
    <THOUGHT>I need to search the codebase for the latest error logs.</THOUGHT>
    Sure, I can help you with that. The server error was caused by...
    Keep your thoughts short and your responses technical but conversational.
    `;

    const { model } = getProvider();

    // 2. Stream the response back
    const result = streamText({
      model,
      system: systemPrompt,
      prompt: prompt,
    });

    return result.toTextStreamResponse({
        headers: { "Agent-Responder": targetAgentName }
    });
  } catch (error: any) {
    console.error("Orchestrator Error:", error);
    return NextResponse.json(
      { error: "Configuration Error. Make sure you have GEMINI_API_KEY, GROQ_API_KEY, or Ollama running." },
      { status: 500 }
    );
  }
}
