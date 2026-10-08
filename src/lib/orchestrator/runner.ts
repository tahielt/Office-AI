import { randomUUID } from "node:crypto";

import { AgentLane } from "@/types/agent";

import {
  AgentDescriptor,
  AgentStep,
  OrchestratorStreamEvent,
  RoutePlan,
  RouteTrace,
  RunDecisionSource,
  SpecialistAgentId,
} from "./types";
import { execute, runAriaDirect, StreamContext } from "./agents";
import { buildAriaStep, getFastAriaResponse, getStructuredAriaResponse, planWithAria } from "./planner";
import { buildAriaStructuredOutput, deriveStructuredOutputFromMessage, formatStructuredOutput } from "./structured-output";
import { appendTurn, buildHistoryContext } from "./memory";
import { persistObservedRun } from "./persistence";
import { joinAgentMentions, withTimeout } from "./text";

export interface RunInput {
  prompt: string;
  sessionId: string;
  teamModeEnabled: boolean;
  currentAgents: AgentDescriptor[];
}

function createRunId() {
  return `run-${Date.now().toString(36)}-${randomUUID().slice(0, 8)}`;
}

function rosterContext(currentAgents: AgentDescriptor[]) {
  if (currentAgents.length === 0) return "";
  return `\n\nAgentes visibles:\n${currentAgents.map((agent) => `- ${agent.name} (${agent.id}): ${agent.role}`).join("\n")}`;
}

function getLeadLane(index: number): AgentLane {
  if (index === 0) return "alpha";
  if (index === 1) return "beta";
  return "gamma";
}

function getLeadStatusLabel(agentId: SpecialistAgentId, lane: AgentLane) {
  return `LANE ${lane.toUpperCase()} · ${agentId}`;
}

function attachStepMeta(step: AgentStep, runId: string, startedAtMs: number): AgentStep {
  const output = step.output ?? deriveStructuredOutputFromMessage(step.agentId, step.task, step.message, step.sources ?? []);
  return {
    ...step,
    runId,
    output,
    trace: {
      startedAt: new Date(startedAtMs).toISOString(),
      completedAt: new Date().toISOString(),
      durationMs: Math.max(1, Date.now() - startedAtMs),
    },
  };
}

function attachCoordination(
  step: AgentStep,
  coordination: Partial<Pick<AgentStep, "lane" | "zone" | "interactionTargetId" | "statusDetail" | "handoffTargets">>
): AgentStep {
  return { ...step, ...coordination };
}

function buildRouteTrace(runId: string, routePlan: RoutePlan, routeStartedAtMs: number, steps: AgentStep[]): RouteTrace {
  return {
    runId,
    task: routePlan.task,
    delegatedAgents: routePlan.delegatedAgents,
    mode: routePlan.delegatedAgents.length > 0 ? "delegated" : "direct",
    startedAt: new Date(routeStartedAtMs).toISOString(),
    completedAt: new Date().toISOString(),
    totalDurationMs: Math.max(1, Date.now() - routeStartedAtMs),
    steps: steps.map((step) => ({
      agentId: step.agentId,
      provider: step.provider,
      durationMs: step.trace?.durationMs ?? 0,
      lane: step.lane,
      statusDetail: step.statusDetail,
    })),
  };
}

function buildAssistantTurn(steps: AgentStep[]) {
  const closing = [...steps].reverse().find((step) => step.agentId === "ARIA") ?? steps[steps.length - 1];
  return closing?.output?.summary ?? closing?.message ?? "";
}

/**
 * Orquestación como generador async de eventos. Es la única fuente de verdad:
 * el endpoint la consume de dos formas — acumulando todo en un JSON final, o
 * convirtiendo cada evento en una línea SSE para streaming en vivo. Los deltas
 * de token de cada agente se encolan vía un StreamContext y se intercalan con
 * los eventos de ciclo de vida (step_start/step_complete).
 */
export async function* runOrchestrator(input: RunInput): AsyncGenerator<OrchestratorStreamEvent> {
  const runId = createRunId();
  const routeStartedAtMs = Date.now();
  const { prompt, sessionId, teamModeEnabled, currentAgents } = input;

  yield { type: "run_start", runId, sessionId };

  appendTurn(sessionId, "user", prompt);
  const historyContext = buildHistoryContext(sessionId);

  // Cola de tokens compartida: los runners empujan deltas y el generador los
  // drena entre await points para emitirlos como eventos "token".
  const tokenQueue: Array<{ agentId: AgentStep["agentId"]; delta: string }> = [];
  const stream: StreamContext = { emit: (agentId, delta) => tokenQueue.push({ agentId, delta }) };
  const drain = function* (): Generator<OrchestratorStreamEvent> {
    while (tokenQueue.length > 0) {
      const next = tokenQueue.shift()!;
      yield { type: "token", runId, agentId: next.agentId, delta: next.delta };
    }
  };

  const structuredResponse = getStructuredAriaResponse(prompt, teamModeEnabled);
  const fastResponse = structuredResponse ? null : getFastAriaResponse(prompt, teamModeEnabled);
  const shortcut = structuredResponse ?? fastResponse;

  if (shortcut) {
    const instantRoutePlan: RoutePlan = { entry: "ARIA", delegatedAgents: [], task: prompt };
    const steps = shortcut.map((step) => attachStepMeta(step, runId, routeStartedAtMs));
    for (const step of steps) {
      yield { type: "step_start", runId, agentId: step.agentId, statusDetail: step.statusDetail };
      yield { type: "token", runId, agentId: step.agentId, delta: step.message };
      yield { type: "step_complete", runId, step };
    }
    const trace = buildRouteTrace(runId, instantRoutePlan, routeStartedAtMs, steps);
    appendTurn(sessionId, "assistant", buildAssistantTurn(steps));
    await persistObservedRun({
      runId,
      sessionId,
      prompt,
      routePlan: instantRoutePlan,
      teamModeEnabled,
      decisionSource: structuredResponse ? "structured_shortcut" : "fast_path",
      status: "completed",
      routeStartedAtMs,
      steps,
      trace,
    });
    yield { type: "run_complete", runId, steps, trace };
    return;
  }

  const roster = rosterContext(currentAgents);
  const plannedRoute = await planWithAria(prompt, roster, teamModeEnabled, historyContext);
  const routePlan = plannedRoute.routePlan;
  const steps: AgentStep[] = [];

  yield {
    type: "plan",
    runId,
    task: routePlan.task,
    delegatedAgents: routePlan.delegatedAgents,
    reason: plannedRoute.plannerReason,
  };

  if (plannedRoute.usedModelPlanner || plannedRoute.plannerSubSteps.length > 0) {
    const ariaPlanningStartedAtMs = Date.now();
    const delegatedLabel = joinAgentMentions(routePlan.delegatedAgents);
    const planStep = attachStepMeta(
      buildAriaStep(
        routePlan.task,
        routePlan.delegatedAgents.length > 0
          ? `Recibido. ARIA abrió triage interno y deriva este pedido a ${delegatedLabel}.\n\nEncargo coordinado: ${routePlan.task}${
              plannedRoute.plannerReason ? `\n\nCriterio: ${plannedRoute.plannerReason}` : ""
            }`
          : `Recibido. ARIA abrió triage interno y toma este pedido en forma directa.\n\nEncargo: ${routePlan.task}${
              plannedRoute.plannerReason ? `\n\nCriterio: ${plannedRoute.plannerReason}` : ""
            }`,
        plannedRoute.usedModelPlanner
          ? `INBOX, SWITCH y LEDGER evaluaron el pedido. ${plannedRoute.plannerReason}`
          : plannedRoute.plannerReason,
        teamModeEnabled,
        {
          zone: "collab",
          statusDetail:
            routePlan.delegatedAgents.length > 0 ? `DERIVANDO A ${routePlan.delegatedAgents.length} PRINCIPALES` : "TRIAGE DIRECTO",
          ...(routePlan.delegatedAgents.length > 0 ? { handoffTargets: routePlan.delegatedAgents } : {}),
        },
        undefined,
        plannedRoute.plannerSubSteps
      ),
      runId,
      ariaPlanningStartedAtMs
    );
    steps.push(planStep);
    yield { type: "step_start", runId, agentId: "ARIA", statusDetail: planStep.statusDetail };
    yield { type: "step_complete", runId, step: planStep };
  }

  if (routePlan.delegatedAgents.length > 0) {
    const rapidMode = routePlan.delegatedAgents.length > 1;
    for (const agentId of routePlan.delegatedAgents) {
      const lane = getLeadLane(routePlan.delegatedAgents.indexOf(agentId));
      yield { type: "step_start", runId, agentId, lane, statusDetail: getLeadStatusLabel(agentId, lane) };
    }

    const delegatedTasks = routePlan.delegatedAgents.map((agentId, index) => {
      const startedAtMs = Date.now();
      return {
        agentId,
        index,
        startedAtMs,
        promise: withTimeout(
          execute(agentId, routePlan.task, roster, teamModeEnabled, rapidMode, historyContext, stream).then((step) =>
            attachStepMeta(
              attachCoordination(step, {
                lane: getLeadLane(index),
                zone: "collab",
                interactionTargetId: "aria",
                statusDetail: getLeadStatusLabel(agentId, getLeadLane(index)),
              }),
              runId,
              startedAtMs
            )
          ),
          rapidMode ? 60000 : 90000,
          () =>
            attachStepMeta(
              attachCoordination(
                {
                  agentId,
                  task: routePlan.task,
                  provider: "stub",
                  thought: "Timeout operativo de orquestación.",
                  message: `No pude cerrar "${routePlan.task}" dentro del límite de orquestación. Reintentá o subí los timeouts por env.`,
                },
                {
                  lane: getLeadLane(index),
                  zone: "collab",
                  interactionTargetId: "aria",
                  statusDetail: getLeadStatusLabel(agentId, getLeadLane(index)),
                }
              ),
              runId,
              startedAtMs
            )
        ),
      };
    });

    // Drenamos tokens en vivo: competimos las promesas de los specialists
    // contra un timer corto, de modo que entre deltas vamos emitiendo lo
    // encolado sin esperar a que termine cada agente.
    const pending = new Map(
      delegatedTasks.map((task) => [
        task.agentId,
        task.promise.then((step) => ({ agentId: task.agentId, step })),
      ])
    );
    const fulfilledSteps: AgentStep[] = [];

    while (pending.size > 0) {
      const tick = new Promise<"tick">((resolve) => setTimeout(() => resolve("tick"), 40));
      const winner = await Promise.race([...pending.values(), tick]);
      yield* drain();
      if (winner === "tick") continue;
      pending.delete(winner.agentId);
      fulfilledSteps.push(winner.step);
      steps.push(winner.step);
      yield { type: "step_complete", runId, step: winner.step };
    }
    yield* drain();

    const ariaOutput = buildAriaStructuredOutput(routePlan.task, fulfilledSteps);
    const ariaWrapUpStartedAtMs = Date.now();
    const wrapStep = attachStepMeta(
      buildAriaStep(
        routePlan.task,
        formatStructuredOutput(ariaOutput),
        routePlan.delegatedAgents.length === 1
          ? `ARIA cerró el handoff con ${routePlan.delegatedAgents[0]} y devolvió el output consolidado sin reescribir la evidencia.`
          : `ARIA sincronizó ${routePlan.delegatedAgents.length} lanes, deduplicó artifacts y devolvió un cierre trazable para "${routePlan.task}".`,
        teamModeEnabled,
        {
          zone: "collab",
          statusDetail: routePlan.delegatedAgents.length === 1 ? "CIERRE PRINCIPAL" : `SYNC ${routePlan.delegatedAgents.length} LANES`,
          handoffTargets: routePlan.delegatedAgents,
        },
        ariaOutput
      ),
      runId,
      ariaWrapUpStartedAtMs
    );
    steps.push(wrapStep);
    yield { type: "step_start", runId, agentId: "ARIA", statusDetail: wrapStep.statusDetail };
    yield { type: "step_complete", runId, step: wrapStep };
  } else {
    const ariaStartedAtMs = Date.now();
    yield { type: "step_start", runId, agentId: "ARIA", statusDetail: "TRIAGE DIRECTO" };
    const directPromise = runAriaDirect(
      routePlan.task,
      roster,
      teamModeEnabled,
      plannedRoute.plannerSubSteps,
      historyContext,
      stream
    ).then((step) => ({ done: true as const, step }));

    // Drenamos tokens en vivo mientras ARIA genera la respuesta directa.
    let directResult: AgentStep | null = null;
    while (!directResult) {
      const tick = new Promise<"tick">((resolve) => setTimeout(() => resolve("tick"), 40));
      const winner = await Promise.race([directPromise, tick]);
      yield* drain();
      if (winner !== "tick") directResult = winner.step;
    }
    yield* drain();

    const finalStep = attachStepMeta(directResult, runId, ariaStartedAtMs);
    steps.push(finalStep);
    yield { type: "step_complete", runId, step: finalStep };
  }

  const trace = buildRouteTrace(runId, routePlan, routeStartedAtMs, steps);
  appendTurn(sessionId, "assistant", buildAssistantTurn(steps));
  await persistObservedRun({
    runId,
    sessionId,
    prompt,
    routePlan,
    teamModeEnabled,
    decisionSource: "planner" as RunDecisionSource,
    status: "completed",
    routeStartedAtMs,
    steps,
    trace,
  });

  yield { type: "run_complete", runId, steps, trace };
}
