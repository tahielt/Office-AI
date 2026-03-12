"use client";
import { Agent } from "@/types/agent";
import { motion } from "framer-motion";
import { STATUS_CONFIG } from "@/lib/agents";

interface Props {
  agent: Agent;
  isSelected?: boolean;
  onClick?: () => void;
}

export default function AgentDesk({ agent, isSelected, onClick }: Props) {
  const statusInfo = STATUS_CONFIG[agent.status] || STATUS_CONFIG.idle;

  return (
    <div
      onClick={onClick}
      className={`relative p-4 rounded-xl border cursor-pointer transition-all duration-300 panel hover:border-[${agent.color}]/50 ${
        isSelected ? "bg-white/5 border-white/20 shadow-lg" : "bg-black/40 border-white/5"
      }`}
      style={{
        boxShadow: isSelected ? `0 0 20px -5px ${agent.color}40` : "none",
        borderColor: isSelected ? agent.color : undefined,
      }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded bg-white/5 border flex items-center justify-center font-mono text-lg font-bold"
            style={{ borderColor: agent.color, color: agent.color }}
          >
            {agent.avatar}
          </div>
          <div>
            <h3 className="font-bold text-white tracking-widest text-sm">{agent.name}</h3>
            <p className="text-[10px] text-white/50 tracking-widest uppercase">{agent.role}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {statusInfo.pulse && (
            <motion.div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: statusInfo.color }}
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            />
          )}
          <span
            className="text-[10px] font-mono tracking-widest px-2 py-0.5 rounded bg-black/50 border border-white/10"
            style={{ color: statusInfo.color }}
          >
            {statusInfo.label}
          </span>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <div className="text-[9px] text-white/30 tracking-widest mb-1 font-mono">CURRENT TASK</div>
          <div className="text-xs text-white/80 font-mono truncate">{agent.currentTask}</div>
        </div>

        <div className="h-px bg-white/5 w-full" />

        <div className="flex justify-between items-center text-[10px] font-mono">
          <div>
            <span className="text-white/30">TASKS: </span>
            <span className="text-white/70">{agent.tasksCompleted}</span>
          </div>
          <div>
            <span className="text-white/30">UPTIME: </span>
            <span className="text-white/70">{agent.uptime}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
