"use client";
import { Agent, LogEntry } from "@/types/agent";
import { Terminal as TerminalIcon, Send } from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface Props {
  agents: Agent[];
  onCommand: (cmd: string) => void;
}

export default function Terminal({ agents, onCommand }: Props) {
  const [input, setInput] = useState("");
  const [mounted, setMounted] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Combine and sort all logs from all agents to create a global feed
  const allLogs = agents
    .flatMap((agent) =>
      agent.log.map((log) => ({
        ...log,
        agentName: agent.name,
        agentColor: agent.color,
      }))
    )
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  // Auto-scroll to bottom of terminal
  useEffect(() => {
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [allLogs]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    onCommand(input);
    setInput("");
  };

  return (
    <div className="h-full flex flex-col retro-panel bg-black/90 border-t-2 border-slate-700/50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b-2 border-slate-800">
        <div className="flex items-center gap-2">
          <TerminalIcon className="w-4 h-4 text-cyan-400" />
          <span className="text-xs tracking-widest font-mono text-cyan-400 uppercase">
            AGENT COMMAND CENTER & LOGS
          </span>
        </div>
      </div>

      {/* Log History */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1 font-mono text-[11px] leading-relaxed">
        {allLogs.map((log) => (
          <div key={log.id} className="flex gap-3">
            <span className="text-slate-500 shrink-0 select-none">
              [{mounted ? log.timestamp.toLocaleTimeString([], { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "..."}]
            </span>

            {/* Render based on log type */}
            {log.type === "system" && (
              <span className="text-green-400">
                [SYSTEM] {log.agentName}: {log.text}
              </span>
            )}

            {log.type === "thought" && (
              <span className="text-slate-400 italic">
                Agent Internal Monologue: [{log.agentName}] {log.text}
              </span>
            )}

            {log.type === "communication" && (
              <span className="font-bold tracking-wide" style={{ color: log.agentColor }}>
                [{log.agentName}] {log.text}
              </span>
            )}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {/* Quick Actions & Input Area */}
      <div className="p-3 border-t-2 border-slate-800 bg-[#0a0a0f]">
        <div className="flex gap-2 mb-2">
          {["/summon_all", "/pause_tasks", "/report_status"].map((cmd) => (
            <button
              key={cmd}
              onClick={() => setInput(cmd)}
              className="px-2 py-1 text-[10px] font-mono text-slate-400 bg-slate-800 hover:bg-slate-700 rounded cursor-pointer transition-colors"
            >
              {cmd}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <span className="text-green-400 font-mono text-lg leading-none">{">"}</span>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="@Apex begin server maintenance..."
            className="flex-1 bg-transparent border border-slate-700 rounded px-2 py-1.5 text-green-400 font-mono text-sm focus:outline-none focus:border-cyan-500"
          />
          <button
            type="submit"
            className="p-1.5 rounded bg-green-500/20 text-green-400 hover:bg-green-500/40 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
