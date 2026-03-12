export type AgentStatus = 
  | "idle"
  | "coding"
  | "researching"
  | "analyzing"
  | "walking"
  | "meeting"
  | "break"
  | "thinking"
  | "running"
  | "done";

export interface LogEntry {
  id: string;
  type: "system" | "thought" | "communication";
  text: string;
  timestamp: Date;
}

export interface Agent {
  id: string;
  name: string;
  role: string;
  color: string;
  status: AgentStatus;
  currentTask: string;
  tasksCompleted: number;
  tokensUsed: number;
  uptime: string;
  avatar: string;
  position: { x: number; y: number };
  log: LogEntry[];
}

export interface Task {
  id: string;
  agentId: string;
  agentName: string;
  description: string;
  status: string;
  startedAt: Date;
  completedAt?: Date;
  color: string;
}

export interface SystemMetrics {
  totalTasks: number;
  activeTasks: number;
  tokensTotal: number;
  requestsPerMin: number;
  uptime: string;
  status: string;
}
