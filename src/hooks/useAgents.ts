"use client";
import { useState, useEffect, useCallback } from "react";
import { Agent, Task, SystemMetrics } from "@/types/agent";
import { INITIAL_AGENTS, generateMockTask, getInitialMetrics } from "@/lib/agents";

export function useAgents() {
  const [agents, setAgents] = useState<Agent[]>(INITIAL_AGENTS);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [metrics, setMetrics] = useState<SystemMetrics>(getInitialMetrics());
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  // Inicializar logIndex dinámicamente desde INITIAL_AGENTS
  const [logIndex, setLogIndex] = useState<Record<string, number>>(
    () => Object.fromEntries(INITIAL_AGENTS.map(a => [a.id, 0]))
  );

  // Simular completado de tareas
  useEffect(() => {
    const interval = setInterval(() => {
      const task = generateMockTask();
      const duration = 3000 + Math.random() * 4000;

      setTasks((prev) => [{ ...task, status: "running" }, ...prev.slice(0, 19)]);
      setMetrics((prev) => ({ ...prev, activeTasks: prev.activeTasks + 1 }));

      setTimeout(() => {
        setTasks((prev) =>
          prev.map((t) => t.id === task.id ? { ...t, status: "done", completedAt: new Date() } : t)
        );
        setMetrics((prev) => ({
          ...prev,
          activeTasks: Math.max(0, prev.activeTasks - 1),
          totalTasks: prev.totalTasks + 1,
          tokensTotal: prev.tokensTotal + Math.floor(Math.random() * 8000 + 1000),
          requestsPerMin: Math.max(10, prev.requestsPerMin + Math.floor(Math.random() * 5) - 2),
        }));
        setAgents((prev) =>
          prev.map((a) => a.id === task.agentId ? { ...a, tasksCompleted: a.tasksCompleted + 1 } : a)
        );
      }, duration);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Sincronizar agente seleccionado
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
    // Detectar agente destino desde @Nombre
    const match = cmd.match(/^@(\w+)/i);
    let targetId = match ? match[1].toLowerCase() : null;

    // Verificar que el agente existe
    if (targetId && !agents.some(a => a.id === targetId)) {
      // Intentar match parcial (ej: "scout" → "scout")
      const partial = agents.find(a => a.id.startsWith(targetId!));
      targetId = partial?.id || null;
    }

    // Comandos globales
    if (cmd.startsWith("/summon_all")) {
      setAgents((prev) => prev.map(a => ({ ...a, isSummoned: true, animation: "walking" })));
      setTimeout(() => {
        setAgents((prev) => prev.map(a => ({
          ...a,
          animation: a.id === "zion" ? "talking" : "idle",
        })));
      }, 1000);
      // El orquestador responde como ZION
      targetId = "zion";
    }

    if (cmd.startsWith("/dismiss")) {
      setAgents((prev) => prev.map(a => ({ ...a, isSummoned: false, animation: "walking" })));
      setTimeout(() => {
        setAgents((prev) => prev.map(a => ({ ...a, animation: "idle" })));
      }, 1000);
      return;
    }

    // Fallback inteligente si no se especificó agente
    if (!targetId) {
      const lower = cmd.toLowerCase();
      if (lower.includes("código") || lower.includes("bug") || lower.includes("typescript") || lower.includes("función")) {
        targetId = "apex";
      } else if (lower.includes("datos") || lower.includes("métrica") || lower.includes("análisis")) {
        targetId = "vera";
      } else if (lower.includes("mercado") || lower.includes("competencia") || lower.includes("tendencia")) {
        targetId = "scout";
      } else if (lower.includes("email") || lower.includes("mensaje") || lower.includes("redactar")) {
        targetId = "echo";
      } else if (lower.includes("automatizar") || lower.includes("api") || lower.includes("webhook")) {
        targetId = "forge";
      } else if (lower.includes("reseña") || lower.includes("review") || lower.includes("reputación")) {
        targetId = "pulse";
      } else if (cmd.startsWith("/report_status")) {
        targetId = "zion";
      } else {
        targetId = "zion";
      }
    }

    // Agregar el mensaje del usuario al log del agente destino
    setAgents((prev) =>
      prev.map((agent) => {
        if (targetId === agent.id || cmd.startsWith("/")) {
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

    if (!targetId) return;

    // Poner al agente en modo "pensando"
    setAgents((prev) =>
      prev.map((a) => a.id === targetId ? { ...a, status: "thinking", animation: "thinking" } : a)
    );

    try {
      const res = await fetch("/api/orchestrator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: cmd,
          currentAgents: agents.map(a => ({ id: a.id, name: a.name, role: a.role })),
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Error al conectar con el orquestador");
      }

      if (!res.body) throw new Error("Sin stream de respuesta");

      const responseLogId = crypto.randomUUID();
      const thoughtLogId = crypto.randomUUID();

      // Placeholders iniciales
      setAgents((prev) =>
        prev.map((agent) => {
          if (agent.id === targetId) {
            return {
              ...agent,
              status: "thinking",
              log: [
                ...agent.log.slice(-13),
                { id: thoughtLogId, type: "thought" as const, text: "", timestamp: new Date() },
                { id: responseLogId, type: "communication" as const, text: "...", timestamp: new Date() },
              ],
            };
          }
          return agent;
        })
      );

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        // En Next.js App Router con streamText, los chunks de texto llegan con el prefix '0:'
        // Ej: 0:"Hola mundo"\n
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('0:')) {
            try {
              // Extraer el string JSON parseable
              const textChunk = JSON.parse(line.slice(2));
              fullText += textChunk;
              
              let thoughtContent = "";
              let communicationContent = "";

              // Parsear tags <THOUGHT>
              const thoughtMatch = fullText.match(/<THOUGHT>([\s\S]*?)<\/THOUGHT>/i);

              if (thoughtMatch) {
                thoughtContent = thoughtMatch[1].trim();
                communicationContent = fullText.substring(thoughtMatch.index! + thoughtMatch[0].length).trim();
              } else if (fullText.includes("<THOUGHT>")) {
                thoughtContent = fullText.substring(fullText.indexOf("<THOUGHT>") + 9).trim();
                communicationContent = "";
              } else {
                communicationContent = fullText.trim();
              }

              // Actualizar logs en tiempo real
              setAgents((prev) =>
                prev.map((agent) => {
                  if (agent.id !== targetId) return agent;
                  const logs = [...agent.log];
                  const ti = logs.findIndex(l => l.id === thoughtLogId);
                  const ci = logs.findIndex(l => l.id === responseLogId);
                  if (ti > -1) logs[ti] = { ...logs[ti], text: thoughtContent || "Procesando..." };
                  if (ci > -1) logs[ci] = { ...logs[ci], text: communicationContent || "..." };
                  const animation = communicationContent.length > 0 ? "typing" : "thinking";
                  return { ...agent, log: logs, animation };
                })
              );
            } catch (e) {
              // Ignorar parsing errors en chunks parciales
            }
          }
        }
      }

      // Respuesta completa — volver a idle
      setAgents((prev) =>
        prev.map((a) => a.id === targetId ? { ...a, status: "idle", animation: "idle" } : a)
      );
    } catch (error: any) {
      const errorLog = {
        id: crypto.randomUUID(),
        type: "system" as const,
        text: `ERROR: ${error.message}`,
        timestamp: new Date(),
      };
      setAgents((prev) =>
        prev.map((agent) =>
          agent.id === targetId
            ? { ...agent, status: "idle", animation: "idle", log: [...agent.log.slice(-14), errorLog] }
            : agent
        )
      );
    }
  }, [agents]);

  return { agents, tasks, metrics, selectedAgent, selectAgent, handleCommand };
}