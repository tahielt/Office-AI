"use client";
import { useAgents } from "@/hooks/useAgents";
import MetricsBar from "@/components/ui/MetricsBar";
import JRPGBoard from "@/components/ui/JRPGBoard";
import AgentSidebar from "@/components/ui/AgentSidebar";
import Terminal from "@/components/ui/Terminal";

export default function Home() {
  const { agents, metrics, handleCommand } = useAgents();

  return (
    <main className="h-screen w-screen flex flex-col overflow-hidden text-white font-sans text-sm"
      style={{ background: "#080810" }}>

      {/* Barra de métricas superior */}
      <MetricsBar metrics={metrics} />

      {/* Área principal — flex column para que la terminal empuje desde abajo */}
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">

        {/* Split horizontal: Board + Sidebar */}
        <div className="flex-1 flex min-h-0 gap-0">

          {/* Board — ocupa todo el espacio restante */}
          <div className="flex-1 p-3 pb-0 min-w-0 flex flex-col">
            <JRPGBoard agents={agents} />
          </div>

          {/* Sidebar — ancho fijo */}
          <div className="p-3 pl-2 pb-0 shrink-0">
            <AgentSidebar agents={agents} />
          </div>
        </div>

        {/* Terminal — altura dinámica por resize interno */}
        <div className="shrink-0 px-3 pt-2 pb-3">
          <Terminal agents={agents} onCommand={handleCommand} />
        </div>
      </div>
    </main>
  );
}