"use client";
import { SystemMetrics } from "@/types/agent";

export default function MetricsBar({ metrics }: { metrics: SystemMetrics }) {
  return (
    <div className="flex items-center justify-between px-6 py-3 border-b border-white/10 bg-black/50 backdrop-blur-md">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-sm font-mono text-cyan-400 tracking-wider">SYSTEM ONLINE</span>
        </div>
        <div className="h-4 w-px bg-white/20" />
        <div className="flex flex-col">
          <span className="text-[10px] text-white/50 tracking-widest font-mono">UPTIME</span>
          <span className="text-xs font-mono text-white/80">{metrics.uptime}</span>
        </div>
      </div>

      <div className="flex items-center gap-8">
        <div className="flex flex-col items-end">
          <span className="text-[10px] text-white/50 tracking-widest font-mono">ACTIVE ENTITIES</span>
          <span className="text-xs font-mono text-white/80">{metrics.activeTasks} TASKS RUNNING</span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[10px] text-white/50 tracking-widest font-mono">TOKENS SPENT</span>
          <span className="text-xs font-mono text-white/80">{(metrics.tokensTotal / 1000000).toFixed(2)}M</span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[10px] text-white/50 tracking-widest font-mono">THROUGHPUT</span>
          <span className="text-xs font-mono text-white/80">{metrics.requestsPerMin} REQ/M</span>
        </div>
      </div>
    </div>
  );
}
