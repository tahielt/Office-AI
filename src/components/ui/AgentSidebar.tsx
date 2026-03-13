"use client";
import { Agent } from "@/types/agent";
import { STATUS_CONFIG } from "@/lib/agents";
import { useSyncExternalStore } from "react";

interface Props {
  agents: Agent[];
  teamModeEnabled: boolean;
}

function subscribeToClock(onStoreChange: () => void) {
  const timer = window.setInterval(onStoreChange, 1000);
  return () => window.clearInterval(timer);
}

function getClockSnapshot() {
  return new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}

export default function AgentSidebar({ agents, teamModeEnabled }: Props) {
  const time = useSyncExternalStore(subscribeToClock, getClockSnapshot, () => null);

  const activeCount = agents.filter(a => a.status !== "idle" && a.status !== "done").length;
  const totalSubAgents = agents.reduce((count, agent) => count + agent.teamMembers.length, 0);

  return (
    <div className="w-[280px] shrink-0 h-full flex flex-col gap-2">

      {/* Header */}
      <div
        className="px-3 py-2.5 flex items-center justify-between"
        style={{
          background: "#0d0d18",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: "6px",
        }}
      >
        <div className="flex flex-col gap-0.5">
          <span className="text-[9px] font-mono tracking-[0.25em] text-white/30 uppercase">
            Panel de Agentes
          </span>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-mono text-emerald-400/80">
              {activeCount} activos
            </span>
            <span
              className="text-[8px] font-mono tracking-[0.18em] px-1.5 py-0.5 rounded-sm"
              style={{
                color: teamModeEnabled ? "#00f5ff" : "rgba(255,255,255,0.35)",
                background: teamModeEnabled ? "rgba(0,245,255,0.12)" : "rgba(255,255,255,0.05)",
                border: `1px solid ${teamModeEnabled ? "rgba(0,245,255,0.3)" : "rgba(255,255,255,0.08)"}`,
              }}
            >
              {teamModeEnabled ? `AGENTS TEAM ${totalSubAgents}` : "TEAM OFF"}
            </span>
          </div>
        </div>
        <span className="text-[13px] font-mono text-white/60 tabular-nums">
          {time || "--:--"}
        </span>
      </div>

      {/* Lista de agentes — scrolleable */}
      <div className="flex-1 flex flex-col gap-1.5 overflow-y-auto pr-0.5">
        {agents.map((agent) => {
          const statusInfo = STATUS_CONFIG[agent.status] || STATUS_CONFIG.idle;
          const isActive = agent.status !== "idle" && agent.status !== "done";
          const completionPct = Math.min(100, Math.floor((agent.tasksCompleted / (agent.tasksCompleted + 15)) * 100));

          return (
            <div
              key={agent.id}
              className="relative flex flex-col gap-2 px-3 py-2.5 overflow-hidden transition-all duration-200"
              style={{
                background: isActive ? `${agent.color}08` : "#0d0d18",
                border: `1px solid ${isActive ? agent.color + "25" : "rgba(255,255,255,0.05)"}`,
                borderRadius: "6px",
                borderLeft: `2px solid ${isActive ? agent.color : "rgba(255,255,255,0.08)"}`,
              }}
            >
              {/* Glow de fondo cuando activo */}
              {isActive && (
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: `radial-gradient(ellipse at 0% 50%, ${agent.color}10 0%, transparent 70%)`,
                  }}
                />
              )}

              {/* Fila superior: avatar + nombre + status */}
              <div className="flex items-center gap-2.5 relative z-10">
                {/* Avatar */}
                <div
                  className="w-9 h-9 shrink-0 rounded flex items-center justify-center text-[11px] font-bold font-mono"
                  style={{
                    background: `${agent.color}15`,
                    border: `1px solid ${agent.color}40`,
                    color: agent.color,
                  }}
                >
                  {agent.avatar}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[12px] font-mono font-bold text-white tracking-wider truncate">
                      {agent.name}
                    </span>
                    <span
                      className="text-[8px] font-mono tracking-wider px-1.5 py-0.5 rounded-sm shrink-0"
                      style={{
                        color: statusInfo.color,
                        background: `${statusInfo.color}15`,
                        border: `1px solid ${statusInfo.color}30`,
                      }}
                    >
                      {statusInfo.label}
                    </span>
                  </div>
                  <span className="text-[9px] text-white/30 uppercase tracking-wider">
                    {agent.role}
                  </span>
                  <div className="flex items-center gap-1 mt-1">
                    <span
                      className="text-[8px] font-mono tracking-[0.18em] px-1.5 py-0.5 rounded-sm"
                      style={{
                        color: agent.color,
                        background: `${agent.color}12`,
                        border: `1px solid ${agent.color}28`,
                      }}
                    >
                      {agent.teamLead ? "BRAIN" : `SQUAD ${agent.teamMembers.length}`}
                    </span>
                    <span className="text-[8px] font-mono text-white/20 tracking-[0.18em]">
                      {teamModeEnabled ? "SUBAGENTES ONLINE" : "SUBAGENTES EN ESPERA"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tarea actual */}
              <div
                className="relative z-10 text-[10px] font-mono leading-tight line-clamp-2"
                style={{ color: "rgba(255,255,255,0.5)" }}
              >
                <span style={{ color: agent.color + "80" }}>› </span>
                {agent.currentTask}
              </div>

              <div className="flex flex-wrap gap-1 relative z-10">
                {agent.teamMembers.map((member) => (
                  <span
                    key={`${agent.id}-${member.id}`}
                    className="text-[8px] font-mono tracking-[0.16em] px-1.5 py-0.5 rounded-sm"
                    style={{
                      color: teamModeEnabled ? agent.color : "rgba(255,255,255,0.35)",
                      background: teamModeEnabled ? `${agent.color}10` : "rgba(255,255,255,0.04)",
                      border: `1px solid ${teamModeEnabled ? agent.color + "20" : "rgba(255,255,255,0.06)"}`,
                    }}
                    title={`${member.role}: ${member.specialty}`}
                  >
                    {member.name}
                  </span>
                ))}
              </div>

              {/* Barra de progreso */}
              <div className="flex items-center gap-2 relative z-10">
                <span className="text-[8px] font-mono text-white/25 w-6 shrink-0">PRG</span>
                <div
                  className="flex-1 h-1.5 rounded-full overflow-hidden"
                  style={{ background: "rgba(255,255,255,0.06)" }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{
                      width: `${completionPct}%`,
                      background: isActive
                        ? `linear-gradient(90deg, ${agent.color}80, ${agent.color})`
                        : `${agent.color}40`,
                      boxShadow: isActive ? `0 0 6px ${agent.color}60` : "none",
                    }}
                  />
                </div>
                <span
                  className="text-[8px] font-mono w-7 text-right shrink-0"
                  style={{ color: agent.color + "90" }}
                >
                  {completionPct}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
