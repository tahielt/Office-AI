import { NextResponse } from "next/server";

import {
  AgentDescriptor,
  AgentStep,
  OrchestratorRequest,
  OrchestratorStreamEvent,
  RouteTrace,
} from "@/lib/orchestrator/types";
import { runOrchestrator } from "@/lib/orchestrator/runner";
import { listRecentRuns } from "@/lib/orchestrator/persistence";
import { getErrorMessage } from "@/lib/orchestrator/text";

export const runtime = "nodejs";

function isAgentDescriptor(value: unknown): value is AgentDescriptor {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<AgentDescriptor>;
  return typeof candidate.id === "string" && typeof candidate.name === "string" && typeof candidate.role === "string";
}

function isTeamModeEnabled(value: unknown) {
  return typeof value === "boolean" ? value : true;
}

interface ParsedRequest {
  prompt: string;
  sessionId: string;
  teamModeEnabled: boolean;
  currentAgents: AgentDescriptor[];
  stream: boolean;
}

function parseRequest(body: OrchestratorRequest): ParsedRequest | null {
  if (typeof body.prompt !== "string" || !body.prompt.trim()) return null;
  return {
    prompt: body.prompt.trim(),
    sessionId: typeof body.sessionId === "string" && body.sessionId.trim() ? body.sessionId.trim() : "default",
    teamModeEnabled: isTeamModeEnabled(body.teamMode),
    currentAgents: Array.isArray(body.currentAgents) ? body.currentAgents.filter(isAgentDescriptor) : [],
    stream: body.stream === true,
  };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const parsedLimit = Number.parseInt(searchParams.get("limit") ?? "6", 10);
  const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 12) : 6;
  const runs = await listRecentRuns(limit);
  return NextResponse.json({ runs });
}

/** Convierte el stream de eventos del runner en un cuerpo SSE (text/event-stream). */
function toSSEStream(input: ParsedRequest): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: OrchestratorStreamEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };
      try {
        for await (const event of runOrchestrator(input)) {
          send(event);
        }
      } catch (error) {
        send({
          type: "run_error",
          runId: "error",
          error: getErrorMessage(error),
          steps: [],
          trace: {
            runId: "error",
            task: "soporte",
            delegatedAgents: [],
            mode: "direct",
            startedAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
            totalDurationMs: 0,
            steps: [],
          },
        });
      } finally {
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      }
    },
  });

  return new Response(body, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

export async function POST(req: Request) {
  let parsed: ParsedRequest | null = null;
  try {
    parsed = parseRequest((await req.json()) as OrchestratorRequest);
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }
  if (!parsed) {
    return NextResponse.json({ error: "Prompt inválido." }, { status: 400 });
  }

  if (parsed.stream) {
    return toSSEStream(parsed);
  }

  // Modo JSON: drenamos el mismo generador y nos quedamos con el evento final.
  try {
    let steps: AgentStep[] = [];
    let trace: RouteTrace | null = null;
    let runId = "";
    let runError: string | undefined;

    for await (const event of runOrchestrator(parsed)) {
      if (event.type === "run_start") runId = event.runId;
      if (event.type === "run_complete") {
        steps = event.steps;
        trace = event.trace;
      }
      if (event.type === "run_error") {
        steps = event.steps;
        trace = event.trace;
        runError = event.error;
      }
    }

    if (runError) {
      return NextResponse.json({ runId, steps, trace, error: runError });
    }
    return NextResponse.json({ runId, steps, trace });
  } catch (error) {
    console.error("Error en el Orquestador:", error);
    return NextResponse.json(
      {
        runId: "error",
        steps: [
          {
            agentId: "ARIA",
            task: "soporte",
            provider: "stub",
            thought: `Hubo un error en el backend. ${getErrorMessage(error)}`,
            message: "La oficina sigue en pie, pero este pedido falló. Probá otra vez.",
          },
        ],
        error: getErrorMessage(error),
      },
      { status: 200 }
    );
  }
}
