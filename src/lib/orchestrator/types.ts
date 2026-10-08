import { AgentLane, AgentZone, TeamAssignment } from "@/types/agent";

export type AgentId = "SCOUT" | "APEX" | "VERA" | "ZION" | "FORGE" | "ECHO" | "VOX" | "ARIA";
export type SpecialistAgentId = Exclude<AgentId, "ARIA">;
export type ProviderId = "auto" | "gemini" | "openai" | "groq" | "ollama" | "stub";

export interface AgentDescriptor {
  id: string;
  name: string;
  role: string;
}

export interface OrchestratorRequest {
  prompt?: unknown;
  currentAgents?: unknown;
  teamMode?: unknown;
  sessionId?: unknown;
  stream?: unknown;
}

export interface GenerationUsage {
  promptTokens: number;
  completionTokens: number;
}

export interface GenerationOptions {
  agentId?: AgentId;
  maxOutputTokens?: number;
  timeoutMs?: number;
  temperature?: number;
  numCtx?: number;
  /** Callback de streaming: recibe cada delta de texto a medida que el modelo genera. */
  onToken?: (delta: string) => void;
}

export interface GenerationResult {
  text: string | null;
  provider: ProviderId;
  errors: string[];
  usage?: GenerationUsage;
}

export interface ObjectGenerationResult {
  object: unknown;
  provider: ProviderId;
  errors: string[];
  usage?: GenerationUsage;
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  pageExcerpt?: string;
}

export interface AgentEvidence {
  title: string;
  claim: string;
  url?: string;
  snippet?: string;
}

export interface AgentArtifact {
  kind: string;
  title: string;
  content: string;
}

export interface AgentStructuredOutput {
  summary: string;
  evidence: AgentEvidence[];
  risks: string[];
  nextSteps: string[];
  artifacts: AgentArtifact[];
}

export interface AgentExecutionTrace {
  startedAt: string;
  completedAt: string;
  durationMs: number;
}

export interface SubAgentStep {
  subAgentId: string;
  subAgentName: string;
  subAgentRole: string;
  objective: string;
  thought: string;
  message: string;
  provider: ProviderId;
  output?: AgentStructuredOutput;
  trace?: AgentExecutionTrace;
}

export interface AgentStep {
  agentId: AgentId;
  task: string;
  thought: string;
  message: string;
  provider: ProviderId;
  runId?: string;
  output?: AgentStructuredOutput;
  trace?: AgentExecutionTrace;
  subSteps?: SubAgentStep[];
  teamAssignments?: TeamAssignment[];
  teamModeUsed?: boolean;
  lane?: AgentLane;
  zone?: AgentZone;
  interactionTargetId?: string;
  statusDetail?: string;
  handoffTargets?: string[];
  sources?: SearchResult[];
  usage?: GenerationUsage;
}

/** Eventos del stream SSE del orquestador. */
export type OrchestratorStreamEvent =
  | { type: "run_start"; runId: string; sessionId: string }
  | { type: "plan"; runId: string; task: string; delegatedAgents: SpecialistAgentId[]; reason: string }
  | { type: "step_start"; runId: string; agentId: AgentId; lane?: AgentLane; statusDetail?: string }
  | { type: "token"; runId: string; agentId: AgentId; delta: string }
  | { type: "step_complete"; runId: string; step: AgentStep }
  | { type: "run_complete"; runId: string; steps: AgentStep[]; trace: RouteTrace }
  | { type: "run_error"; runId: string; error: string; steps: AgentStep[]; trace: RouteTrace };

export interface RoutePlan {
  entry: "ARIA";
  delegatedAgents: SpecialistAgentId[];
  task: string;
}

export interface AriaPlannerDecision {
  task: string;
  shouldDelegate: boolean;
  delegatedAgents: SpecialistAgentId[];
  reason: string;
}

export interface PlannedRoute {
  routePlan: RoutePlan;
  plannerSubSteps: SubAgentStep[];
  plannerReason: string;
  usedModelPlanner: boolean;
}

export interface RouteTrace {
  runId: string;
  task: string;
  delegatedAgents: SpecialistAgentId[];
  mode: "delegated" | "direct";
  startedAt: string;
  completedAt: string;
  totalDurationMs: number;
  steps: Array<{
    agentId: AgentId;
    provider: ProviderId;
    durationMs: number;
    lane?: AgentLane;
    statusDetail?: string;
  }>;
}

export type RunDecisionSource = "structured_shortcut" | "fast_path" | "planner" | "error";
export type PersistedRunStatus = "completed" | "error";

export interface PersistedOrchestratorRunRecord {
  runId: string;
  sessionId: string;
  prompt: string;
  task: string;
  entry: "ARIA";
  delegatedAgents: SpecialistAgentId[];
  teamModeEnabled: boolean;
  mode: "delegated" | "direct";
  decisionSource: RunDecisionSource;
  status: PersistedRunStatus;
  createdAt: string;
  completedAt: string;
  totalDurationMs: number;
  trace: RouteTrace;
  steps: AgentStep[];
  error?: string;
}

export interface PersistedOrchestratorRunSummary {
  runId: string;
  createdAt: string;
  task: string;
  mode: "delegated" | "direct";
  decisionSource: RunDecisionSource;
  delegatedAgents: SpecialistAgentId[];
  status: PersistedRunStatus;
  totalDurationMs: number;
  stepCount: number;
  summary: string;
}

export interface ConversationTurn {
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}
