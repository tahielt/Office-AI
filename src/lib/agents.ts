import { Agent, Task, SystemMetrics, AgentStatus } from "@/types/agent";

export const INITIAL_AGENTS: Agent[] = [
  {
    id: "lyra",
    name: "LYRA",
    role: "Research Agent",
    color: "#00f5ff",
    status: "researching",
    currentTask: "Scanning arxiv for RL papers (2024-Q4)",
    tasksCompleted: 142,
    tokensUsed: 2400000,
    uptime: "14d 6h",
    avatar: "LY",
    animation: "idle",
    isSummoned: false,
    position: { x: 1, y: 1 },
    log: [
      { id: "1", type: "system", text: "Fetching arxiv feed...", timestamp: new Date() },
      { id: "2", type: "thought", text: "Found 38 relevant papers. Filtering by citation count...", timestamp: new Date() },
      { id: "3", type: "communication", text: "@Apex I found the papers you need for the RL module.", timestamp: new Date() },
    ],
  },
  {
    id: "apex",
    name: "APEX",
    role: "Engineer Agent",
    color: "#00ff88",
    status: "coding",
    currentTask: "Refactoring auth module — JWT → OAuth2",
    tasksCompleted: 89,
    tokensUsed: 1800000,
    uptime: "7d 2h",
    avatar: "AX",
    animation: "idle",
    isSummoned: false,
    position: { x: 3, y: 1 },
    log: [
      { id: "4", type: "system", text: "Reading auth/middleware.ts...", timestamp: new Date() },
      { id: "5", type: "thought", text: "I should probably abstract this OAuth handler into a separate service.", timestamp: new Date() },
      { id: "6", type: "communication", text: "@Vera Do you need me to adjust the analytics payload for the new auth flow?", timestamp: new Date() },
    ],
  },
  {
    id: "vera",
    name: "VERA",
    role: "Analytics Agent",
    color: "#ffaa00",
    status: "analyzing",
    currentTask: "Building Q3 revenue forecast model",
    tasksCompleted: 213,
    tokensUsed: 3100000,
    uptime: "21d 4h",
    avatar: "VR",
    animation: "idle",
    isSummoned: false,
    position: { x: 1, y: 3 },
    log: [
      { id: "7", type: "system", text: "Loading dataset (84k rows)...", timestamp: new Date() },
      { id: "8", type: "thought", text: "The variance in Q2 was high. I'll need to adjust the regression weights.", timestamp: new Date() },
      { id: "9", type: "communication", text: "@Zion The forecast looks solid. Ready for your review.", timestamp: new Date() },
    ],
  },
  {
    id: "zion",
    name: "ZION",
    role: "Strategy Agent",
    color: "#ff4466",
    status: "thinking",
    currentTask: "Evaluating market expansion — LATAM vs APAC",
    tasksCompleted: 67,
    tokensUsed: 920000,
    uptime: "3d 11h",
    avatar: "ZN",
    animation: "idle",
    isSummoned: false,
    position: { x: 3, y: 3 },
    log: [
      { id: "10", type: "system", text: "Comparing TAM estimates...", timestamp: new Date() },
      { id: "11", type: "thought", text: "Regulatory analysis for LATAM reveals potential bottlenecks. Need input.", timestamp: new Date() },
      { id: "12", type: "communication", text: "@Lyra Can you run a deep dive on Brazil's fintech regulations?", timestamp: new Date() },
    ],
  },
];

export const STATUS_CONFIG: Record<
  AgentStatus,
  { label: string; color: string; pulse: boolean }
> = {
  idle: { label: "IDLE", color: "#888", pulse: false },
  coding: { label: "CODING", color: "#00ff88", pulse: true },
  researching: { label: "RESEARCHING", color: "#00f5ff", pulse: true },
  analyzing: { label: "ANALYZING", color: "#ffaa00", pulse: true },
  walking: { label: "MOVING", color: "#a78bfa", pulse: false },
  meeting: { label: "IN MEETING", color: "#f472b6", pulse: false },
  break: { label: "BREAK", color: "#888", pulse: false },
  thinking: { label: "THINKING", color: "#ff4466", pulse: true },
  running: { label: "RUNNING", color: "#00f5ff", pulse: true },
  done: { label: "DONE", color: "#00ff88", pulse: false },
};

const TASK_TEMPLATES = [
  { desc: "Summarizing research paper: {topic}", agent: "lyra" },
  { desc: "Writing unit tests for {module}", agent: "apex" },
  { desc: "Generating weekly metrics report", agent: "vera" },
  { desc: "Drafting investor update email", agent: "zion" },
  { desc: "Scraping competitor pricing data", agent: "lyra" },
  { desc: "Fixing bug in {module}", agent: "apex" },
  { desc: "Forecasting churn rate Q4", agent: "vera" },
  { desc: "Analyzing user feedback sentiment", agent: "vera" },
];

const TOPICS = ["transformer architectures", "vector DBs", "RLHF", "diffusion models"];
const MODULES = ["payments", "auth", "dashboard", "API gateway", "search"];

export function generateMockTask(): Task {
  const template = TASK_TEMPLATES[Math.floor(Math.random() * TASK_TEMPLATES.length)];
  const agent = INITIAL_AGENTS.find((a) => a.id === template.agent)!;
  const desc = template.desc
    .replace("{topic}", TOPICS[Math.floor(Math.random() * TOPICS.length)])
    .replace("{module}", MODULES[Math.floor(Math.random() * MODULES.length)]);

  return {
    id: crypto.randomUUID(),
    agentId: agent.id,
    agentName: agent.name,
    description: desc,
    status: "running",
    startedAt: new Date(),
    color: agent.color,
  };
}

export function getInitialMetrics(): SystemMetrics {
  return {
    totalTasks: 511,
    activeTasks: 4,
    tokensTotal: 8220000,
    requestsPerMin: 24,
    uptime: "45d 3h 12m",
    status: "nominal",
  };
}
