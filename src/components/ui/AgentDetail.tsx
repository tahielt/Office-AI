"use client";
import { Agent, Task } from "@/types/agent";
import { STATUS_CONFIG } from "@/lib/agents";
import { X, Activity } from "lucide-react";

interface Props {
  agent: Agent;
  tasks: Task[];
  onClose: () => void;
}

export default function AgentDetail({ agent, tasks, onClose }: Props) {
  const agentTasks = tasks.filter((t) => t.agentId === agent.id);
  const statusInfo = STATUS_CONFIG[agent.status] || STATUS_CONFIG.idle;

  return (
    <div className="flex flex-col h-full bg-black/40 border border-white/10 rounded-xl panel relative overflow-hidden">
      {/* Decorative top border */}
      <div 
        className="absolute top-0 left-0 w-full h-1" 
        style={{ backgroundColor: agent.color }} 
      />

      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <Activity className="w-4 h-4" style={{ color: agent.color }} />
          <span className="text-xs tracking-widest font-mono text-white/70 uppercase">
            {agent.name} TERMINAL
          </span>
        </div>
        <button 
          onClick={onClose}
          className="p-1 hover:bg-white/10 rounded text-white/50 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 flex-1 overflow-y-auto space-y-6">
        {/* Status */}
        <div className="flex items-center justify-between">
          <div className="text-[10px] text-white/30 tracking-widest font-mono">STATUS</div>
          <div className="px-2 py-1 bg-black/50 rounded border border-white/5 text-[10px] uppercase font-mono tracking-widest" style={{ color: statusInfo.color }}>
            {statusInfo.label}
          </div>
        </div>

        {/* Console view */}
        <div className="bg-black/80 rounded border border-white/5 p-3 min-h-[120px] font-mono text-[10px] leading-relaxed space-y-1">
          <div className="text-white/20 mb-2">-- LIVE OUTPUT --</div>
          {agent.log.map((entry) => (
            <div key={entry.id} className={entry.type === "system" ? "text-green-400" : "text-white/70"}>
              {entry.type === "thought" && <span className="italic text-slate-500 mr-2">*thinking*</span>}
              {entry.type === "communication" && <span className="font-bold mr-2" style={{ color: agent.color }}>{">"}</span>}
              {entry.text}
            </div>
          ))}
          <div className="flex items-center gap-2 mt-2">
            <span style={{ color: agent.color }}>{">"}</span>
            <div className="w-2 h-3 bg-white/50 animate-pulse" />
          </div>
        </div>

        {/* Task History */}
        <div>
          <div className="text-[10px] text-white/30 tracking-widest font-mono mb-3">RECENT ACTIVITY</div>
          <div className="space-y-2">
            {agentTasks.length === 0 ? (
              <div className="text-xs text-white/30 font-mono">No recent tasks.</div>
            ) : (
              agentTasks.slice(0, 5).map((task) => (
                <div key={task.id} className="p-3 bg-white/5 border border-white/5 rounded font-mono">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-xs text-white/80 line-clamp-2">{task.description}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase ${task.status === "running" ? "bg-cyan-500/20 text-cyan-400" : "bg-green-500/20 text-green-400"}`}>
                      {task.status}
                    </span>
                  </div>
                  <div className="text-[9px] text-white/30">
                    {task.startedAt.toLocaleTimeString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
