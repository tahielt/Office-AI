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
  type: "system" | "thought" | "communication" | "command";
  text: string;
  timestamp: Date;
}

export interface SubAgent {
  id: string;
  name: string;
  role: string;
  specialty: string;
}

export interface TeamAssignment {
  subAgentId: string;
  subAgentName: string;
  subAgentRole: string;
  objective: string;
}

export type AgentLane = "alpha" | "beta" | "gamma";
export type AgentZone = "desk" | "handoff" | "collab";

export type AgentAnimation = 
  | "typing" 
  | "idle" 
  | "walking" 
  | "sitting" 
  | "talking" 
  | "thinking" 
  | "clapping" 
  | "drinking" 
  | "pointing";

export interface Agent {
  id: string;
  name: string;
  role: string;
  color: string;
  status: AgentStatus;
  animation: AgentAnimation;
  isSummoned: boolean;
  currentTask: string;
  tasksCompleted: number;
  tokensUsed: number;
  uptime: string;
  avatar: string;
  position: { x: number; y: number };
  log: LogEntry[];
  teamMembers: SubAgent[];
  activeTeamAssignments?: TeamAssignment[];
  lane?: AgentLane | null;
  zone?: AgentZone;
  interactionTargetId?: string | null;
  statusDetail?: string | null;
  teamLead?: boolean;
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
