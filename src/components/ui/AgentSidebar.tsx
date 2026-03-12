"use client";
import { Agent } from "@/types/agent";
import { STATUS_CONFIG } from "@/lib/agents";

interface Props {
  agents: Agent[];
}

export default function AgentSidebar({ agents }: Props) {
  return (
    <div className="w-[320px] shrink-0 h-full flex flex-col gap-4">
      {/* Sidebar Header */}
      <div className="retro-panel p-3 flex flex-col gap-1 uppercase bg-slate-900">
        <div className="text-[10px] font-mono text-cyan-400 tracking-widest flex items-center justify-between">
          <span>SYSTEM TIME</span>
          <span>{new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
        </div>
        <div className="h-0.5 bg-slate-700 w-full" />
        <div className="text-[11px] font-mono text-white/50 tracking-widest">
          AGENT STATUS PANEL
        </div>
      </div>

      {/* Agents List */}
      <div className="flex-1 flex flex-col gap-3 overflow-y-auto">
        {agents.map((agent) => {
          const statusInfo = STATUS_CONFIG[agent.status] || STATUS_CONFIG.idle;

          // Fake a completion percentage based on tasks completed vs total
          const completionPct = Math.min(100, Math.floor((agent.tasksCompleted / (agent.tasksCompleted + 15)) * 100));

          return (
            <div key={agent.id} className="retro-panel bg-slate-900 border-slate-700 p-3 h-32 flex flex-col gap-2 relative overflow-hidden transition-colors hover:bg-slate-800/80">
              
              <div className="flex items-start gap-4 h-full z-10">
                {/* 1. Agent Avatar (Pixel Style Container) */}
                <div 
                  className="w-12 h-16 shrink-0 bg-black/40 border-2 rounded-sm flex items-center justify-center font-bold text-2xl"
                  style={{ borderColor: agent.color, color: agent.color }}
                >
                  {agent.avatar}
                </div>

                {/* 2. Agent Data */}
                <div className="flex-1 min-w-0 flex flex-col gap-1 justify-center">
                  <div className="flex items-baseline justify-between">
                    <span className="font-mono font-bold text-sm tracking-widest text-white truncate">
                      {agent.name}
                    </span>
                    <span 
                      className="text-[9px] font-mono tracking-widest px-1 py-0.5 bg-black/50 border border-slate-600 rounded" 
                      style={{ color: statusInfo.color }}
                    >
                      {statusInfo.label}
                    </span>
                  </div>

                  <span className="text-[10px] text-white/40 uppercase tracking-wider truncate">
                    {agent.role}
                  </span>

                  <div className="text-[11px] font-mono text-white/80 line-clamp-2 mt-1 leading-tight">
                    <span className="text-cyan-400/50 mr-1">{">"}</span>{agent.currentTask}
                  </div>
                </div>
              </div>

              {/* 3. Progress / Energy Bar */}
              <div className="w-full flex items-center gap-2 mt-auto z-10">
                <span className="text-[9px] font-mono text-white/40">PRG</span>
                <div className="flex-1 h-3 bg-black/60 border border-slate-700 p-0.5 flex items-center">
                  {/* Simulate pixel blocks for progress */}
                  <div 
                    className="h-full bg-cyan-500 transition-all duration-1000" 
                    style={{ width: `${completionPct}%`, backgroundColor: agent.color }}
                  />
                </div>
                <span className="text-[9px] font-mono w-6 text-right" style={{ color: agent.color }}>
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
