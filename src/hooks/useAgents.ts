"use client";
import { useState, useEffect, useCallback } from "react";
import { Agent, Task, SystemMetrics } from "@/types/agent";
import {
  INITIAL_AGENTS,
  generateMockTask,
  getInitialMetrics,
} from "@/lib/agents";

const LOG_LINES: Record<string, { type: "system" | "thought" | "communication"; text: string }[]> = {
  lyra: [
    { type: "system", text: "Fetching feed from arxiv.org..." },
    { type: "thought", text: "Parsing 38 entries. Applying relevance filter." },
    { type: "system", text: "Extracting key findings..." },
    { type: "communication", text: "@Zion Summary generated. It's ready for your matrix." },
    { type: "system", text: "Saved to /research/2024-Q4.md" },
  ],
  apex: [
    { type: "system", text: "Reading middleware.ts (412 lines)..." },
    { type: "thought", text: "Detected 3 JWT references. Creating OAuth2 adapter." },
    { type: "system", text: "Running tests... 12/12 passed" },
    { type: "communication", text: "@Lyra The new auth system is deployed. Verify?" },
    { type: "system", text: "Committing: feat/oauth2-migration" },
  ],
  vera: [
    { type: "system", text: "Loading dataset (84,231 rows)..." },
    { type: "thought", text: "Normalizing timestamps. Running regression model. R² = 0.914" },
    { type: "system", text: "Plotting forecast chart..." },
    { type: "communication", text: "@Apex Found an anomaly in the traffic data from yesterday. Check logs?" },
    { type: "system", text: "Report saved to /analytics/q3.pdf" },
  ],
  zion: [
    { type: "system", text: "Fetching LATAM market data..." },
    { type: "thought", text: "Regulatory scan: 7 countries. Comparing TAM estimates." },
    { type: "system", text: "Building decision matrix..." },
    { type: "thought", text: "Risk-adjusted NPV: $4.2M vs $2.8M. Recommendation: LATAM Q2" },
    { type: "communication", text: "@Vera Send over the final Q3 impact analysis." },
  ],
};

export function useAgents() {
  const [agents, setAgents] = useState<Agent[]>(INITIAL_AGENTS);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [metrics, setMetrics] = useState<SystemMetrics>(getInitialMetrics());
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [logIndex, setLogIndex] = useState<Record<string, number>>({
    lyra: 0, apex: 0, vera: 0, zion: 0,
  });

  // Simulate log updates
  useEffect(() => {
    const interval = setInterval(() => {
      setAgents((prev) =>
        prev.map((agent) => {
          const lines = LOG_LINES[agent.id] || [];
          const idx = logIndex[agent.id] ?? 0;
          const next = (idx + 1) % lines.length;
          const newLineTemplate = lines[next];
          const newLine = {
            id: crypto.randomUUID(),
            type: newLineTemplate.type,
            text: newLineTemplate.text,
            timestamp: new Date(),
          };
          return {
            ...agent,
            log: [...agent.log.slice(-14), newLine],
          };
        })
      );
      setLogIndex((prev) => {
        const updated: Record<string, number> = {};
        for (const id in prev) {
          updated[id] = (prev[id] + 1) % (LOG_LINES[id]?.length || 6);
        }
        return updated;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, [logIndex]);

  // Simulate task completions
  useEffect(() => {
    const interval = setInterval(() => {
      const task = generateMockTask();
      const duration = 3000 + Math.random() * 4000;

      setTasks((prev) => [{ ...task, status: "running" }, ...prev.slice(0, 19)]);
      setMetrics((prev) => ({ ...prev, activeTasks: prev.activeTasks + 1 }));

      setTimeout(() => {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === task.id
              ? { ...t, status: "done", completedAt: new Date() }
              : t
          )
        );
        setMetrics((prev) => ({
          ...prev,
          activeTasks: Math.max(0, prev.activeTasks - 1),
          totalTasks: prev.totalTasks + 1,
          tokensTotal: prev.tokensTotal + Math.floor(Math.random() * 8000 + 1000),
          requestsPerMin: Math.max(
            10,
            prev.requestsPerMin + Math.floor(Math.random() * 5) - 2
          ),
        }));
        setAgents((prev) =>
          prev.map((a) =>
            a.id === task.agentId
              ? { ...a, tasksCompleted: a.tasksCompleted + 1 }
              : a
          )
        );
      }, duration);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Update selected agent when agents state changes
  useEffect(() => {
    if (selectedAgent) {
      const updated = agents.find((a) => a.id === selectedAgent.id);
      if (updated) setSelectedAgent(updated);
    }
  }, [agents]);

  const selectAgent = useCallback((agent: Agent | null) => {
    setSelectedAgent(agent);
  }, []);

  const handleCommand = useCallback((cmd: string) => {
    // 1. Instantly add user's command as a system/communication message
    const userLog = {
      id: crypto.randomUUID(),
      type: "communication" as const,
      text: cmd,
      timestamp: new Date(),
    };

    // Determine target agent (e.g. "@Lyra")
    const match = cmd.match(/^@(\w+)/);
    let targetId = match ? match[1].toLowerCase() : null;

    // Validate target exists
    if (targetId && !agents.some(a => a.id === targetId)) {
      targetId = null;
    }

    setAgents((prev) =>
      prev.map((agent) => {
        // If it's targeted at this agent, or it's a broadcast
        if (targetId === agent.id || (!targetId && cmd.startsWith("/summon_all"))) {
          // Add the user log to this specific agent
          const updatedLog = [...agent.log.slice(-14), userLog];
          return { ...agent, log: updatedLog };
        }
        return agent;
      })
    );

    // 2. Simulate a response after 1.5 seconds
    setTimeout(() => {
      setAgents((prev) =>
        prev.map((agent) => {
          if (targetId === agent.id || (!targetId && cmd.startsWith("/summon_all"))) {
            const responses = [
              "Acknowledged. Processing your request...",
              `I'm on it. Evaluating: ${cmd.replace(/^@\w+/, "").trim()}`,
              "Executing command sequence now.",
              "Analyzing the parameters...",
            ];
            const responseText = responses[Math.floor(Math.random() * responses.length)];
            const responseLog = {
              id: crypto.randomUUID(),
              type: "communication" as const,
              text: responseText,
              timestamp: new Date(),
            };
            return {
              ...agent,
              status: "thinking", // Change status briefly
              log: [...agent.log.slice(-14), responseLog],
            };
          }
          return agent;
        })
      );
    }, 1500);

    // Revert status after another 3 seconds
    setTimeout(() => {
      setAgents((prev) =>
        prev.map((agent) => {
          if (targetId === agent.id || (!targetId && cmd.startsWith("/summon_all"))) {
            return { ...agent, status: "coding" }; // Defaulting back to active
          }
           return agent;
        })
      );
    }, 4500);
    
  }, [agents]);

  return { agents, tasks, metrics, selectedAgent, selectAgent, handleCommand };
}
