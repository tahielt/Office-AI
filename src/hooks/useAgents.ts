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

  // Simulated log updates removed as we are now using the real Orchestrator API

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

  const handleCommand = useCallback(async (cmd: string) => {
    // Determine target agent (e.g. "@Lyra")
    const match = cmd.match(/^@(\w+)/);
    let targetId = match ? match[1].toLowerCase() : null;

    if (targetId && !agents.some(a => a.id === targetId)) {
      targetId = null;
    }

    // Fallbacks if user didn't specify an agent
    if (!targetId) {
      if (cmd.startsWith("/summon_all") || cmd.startsWith("/report_status")) {
        targetId = "zion"; // The strategy agent handles global queries
      } else {
        targetId = "lyra"; // Default fallback
      }
    }

    setAgents((prev) =>
      prev.map((agent) => {
        // If it's targeted at this agent, or it's a broadcast
        if (targetId === agent.id || cmd.startsWith("/") ) {
          // Unique ID for each log to prevent React Key collisions
          const userLog = {
            id: crypto.randomUUID(),
            type: "communication" as const,
            text: cmd,
            timestamp: new Date(),
          };
          return { ...agent, log: [...agent.log.slice(-14), userLog] };
        }
        return agent;
      })
    );

    // If it's a known agent, let's call the real backend!
    if (targetId) {
      // Set to thinking
      setAgents((prev) =>
        prev.map((a) => (a.id === targetId ? { ...a, status: "thinking" } : a))
      );

      try {
        const res = await fetch("/api/orchestrator", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: cmd, currentAgents: agents.map(a => ({id: a.id, name: a.name})) }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to connect to the orchestrator");
        }

        if (!res.body) throw new Error("No readable stream");

        // Prepare the response log object that we will update iteratively
        const responseLogId = crypto.randomUUID();
        const thoughtLogId = crypto.randomUUID();
        
        // Add empty placeholders initially
        setAgents((prev) =>
          prev.map((agent) => {
            if (agent.id === targetId) {
              return {
                ...agent,
                status: "coding", // Active processing
                log: [
                  ...agent.log.slice(-13), 
                  { id: thoughtLogId, type: "thought", text: "", timestamp: new Date() },
                  { id: responseLogId, type: "communication", text: "...", timestamp: new Date() }
                ],
              };
            }
            return agent;
          })
        );

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let fullText = "";
        let inThoughtBox = false;
        let thoughtContent = "";
        let communicationContent = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          // toTextStreamResponse streams raw text directly
          const chunk = decoder.decode(value, { stream: true });
          fullText += chunk;

          // Robust parsing for <THOUGHT> tags (handles newlines and partials better)
          const thoughtMatch = fullText.match(/<THOUGHT>([\s\S]*?)<\/THOUGHT>/i);
          
          if (thoughtMatch) {
             inThoughtBox = true;
             thoughtContent = thoughtMatch[1].trim();
             // Whatever is after the closing tag is the actual communication
             communicationContent = fullText.substring(thoughtMatch.index! + thoughtMatch[0].length).trim();
          } else if (fullText.includes('<THOUGHT>')) {
             // Still thinking... extract from opening tag to end
             const startIndex = fullText.indexOf('<THOUGHT>') + 9; // length of <THOUGHT>
             thoughtContent = fullText.substring(startIndex).trim();
             communicationContent = ""; // Hasn't started talking yet
          } else {
             // No thought tags found at all, just normal communication
             communicationContent = fullText.trim();
          }

          // Update the specific logs in real time
          setAgents((prev) =>
            prev.map((agent) => {
              if (agent.id === targetId) {
                const logs = [...agent.log];
                const thoughtIdx = logs.findIndex(l => l.id === thoughtLogId);
                const commIdx = logs.findIndex(l => l.id === responseLogId);
                
                if (thoughtIdx > -1) logs[thoughtIdx].text = thoughtContent || "Processing...";
                if (commIdx > -1) logs[commIdx].text = communicationContent || "...";
                
                return { ...agent, log: logs };
              }
              return agent;
            })
          );
        }

        // Processing finished
        setAgents((prev) =>
          prev.map((a) => (a.id === targetId ? { ...a, status: "idle" } : a))
        );

      } catch (error: any) {
        // Handle Error rendering
        const errorLog = {
          id: crypto.randomUUID(),
          type: "system" as const,
          text: `ERR: ${error.message}`,
          timestamp: new Date(),
        };
        setAgents((prev) =>
          prev.map((agent) => {
            if (agent.id === targetId) {
              return { ...agent, status: "idle", log: [...agent.log.slice(-14), errorLog] };
            }
            return agent;
          })
        );
      }
    }
    
  }, [agents]);

  return { agents, tasks, metrics, selectedAgent, selectAgent, handleCommand };
}
