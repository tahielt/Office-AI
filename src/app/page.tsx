"use client";
import { useAgents } from "@/hooks/useAgents";
import MetricsBar from "@/components/ui/MetricsBar";
import JRPGBoard from "@/components/ui/JRPGBoard";
import AgentSidebar from "@/components/ui/AgentSidebar";
import Terminal from "@/components/ui/Terminal";

export default function Home() {
  const { agents, handleCommand } = useAgents();

  return (
    <main className="h-screen w-screen flex flex-col overflow-hidden jrpg-bg text-white font-sans text-sm selection:bg-cyan-500/30">
      {/* Top metrics bar */}
      <MetricsBar metrics={{ totalTasks: NaN, activeTasks: NaN, tokensTotal: NaN, requestsPerMin: NaN, uptime: "System Online", status: "OK" }} />

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* Top Split: JRPG Map (Left) & Sidebar (Right) */}
        <div className="flex-1 flex min-h-0">
          <div className="flex-1 p-4 pb-0 flex items-stretch">
            <JRPGBoard agents={agents} />
          </div>
          <div className="p-4 pl-0 shrink-0">
            <AgentSidebar agents={agents} />
          </div>
        </div>

        {/* Bottom Panel: Terminal */}
        <div className="h-[30vh] shrink-0 p-4 pt-4">
          <Terminal agents={agents} onCommand={handleCommand} />
        </div>

      </div>
    </main>
  );
}
