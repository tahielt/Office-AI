"use client";
import { Task } from "@/types/agent";
import { Server } from "lucide-react";

export default function TaskFeed({ tasks }: { tasks: Task[] }) {
  return (
    <div className="flex flex-col h-full bg-black/40 border border-white/10 rounded-xl panel relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-white/5">
        <Server className="w-4 h-4 text-cyan-400" />
        <span className="text-xs tracking-widest font-mono text-white/70 uppercase">
          GLOBAL EVENT STREAM
        </span>
      </div>

      <div className="p-4 flex-1 overflow-y-auto space-y-3 font-mono">
        {tasks.length === 0 ? (
          <div className="text-xs text-white/30 text-center py-8">SYSTEM IDLE</div>
        ) : (
          tasks.map((task) => (
            <div key={task.id} className="flex gap-3 text-[10px]">
              <div className="text-white/30 mt-0.5">
                {task.startedAt.toLocaleTimeString([], { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </div>
              <div className="flex-1 space-y-1 bg-white/5 p-2 rounded border border-white/5">
                <div className="flex items-center gap-2">
                  <span style={{ color: task.color }} className="font-bold tracking-widest">
                    [{task.agentName}]
                  </span>
                  <span className="text-white/80 line-clamp-1">{task.description}</span>
                </div>
                {task.status === "done" && (
                  <div className="text-green-400">→ Task completed successfully</div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
