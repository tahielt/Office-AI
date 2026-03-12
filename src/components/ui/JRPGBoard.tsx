"use client";
import { Agent } from "@/types/agent";
import { STATUS_CONFIG } from "@/lib/agents";
import AgentSprite from "./AgentSprite";

interface Props {
  agents: Agent[];
}

// Map the agent's logical position to pixel percentages on the board
// You can adjust these values to place desks perfectly on the JRPG background
const DESK_POSITIONS: Record<string, { top: string; left: string }> = {
  lyra: { top: "30%", left: "20%" }, // Top Left Desk
  apex: { top: "30%", left: "65%" }, // Top Right Desk
  vera: { top: "70%", left: "20%" }, // Bottom Left Desk
  zion: { top: "70%", left: "65%" }, // Bottom Right Desk
};

export default function JRPGBoard({ agents }: Props) {
  return (
    <div className="flex-1 w-full relative bg-[#1e1e24] border-4 border-[#3b3b4f] rounded-lg overflow-hidden flex items-center justify-center">
      
      {/* 
        This div is the actual "Canvas Map" which contains the layout elements.
        Using a fixed aspect ratio or max-size map so it feels like a fixed room.
      */}
      <div 
        className="w-[800px] max-w-full aspect-4/3 bg-[#2d2d36] relative shadow-[0_0_50px_rgba(0,0,0,0.5)_inset] rounded border border-slate-700/50"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0, 0, 0, 0.2) 2px, transparent 2px),
            linear-gradient(90deg, rgba(0, 0, 0, 0.2) 2px, transparent 2px)`,
          backgroundSize: "64px 64px",
        }}
      >
        {/* Fake decorative elements (Water cooler, bookshelf) */}
        <div className="absolute top-4 right-4 text-4xl opacity-50 select-none">🪴</div>
        <div className="absolute top-4 left-4 text-4xl opacity-50 select-none">📚</div>
        
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-8 bg-slate-900 border-b-4 border-slate-800 flex items-center justify-center text-[10px] tracking-widest text-slate-500 font-mono">
          SERVER ROOM DOOR
        </div>

        {/* Render Static Desks First (so agents can walk over them) */}
        {agents.map((agent) => {
          const pos = DESK_POSITIONS[agent.id] || { top: "50%", left: "50%" };
          return (
            <div 
              key={`desk-${agent.id}`} 
              className="absolute flex flex-col items-center justify-center pointer-events-none"
              style={{ 
                top: pos.top, 
                left: pos.left, 
                transform: "translate(-50%, -50%)" 
              }}
            >
              {/* 3. The Desk */}
              <div className="relative z-10 w-32 h-16 bg-[#8b5a2b] border-[3px] border-[#5c3a21] rounded-sm shadow-xl flex items-center justify-center">
                {/* Fake PC Monitor */}
                <div className="w-10 h-8 bg-slate-900 border-2 border-slate-700 rounded-sm relative shadow-lg">
                  <div className="absolute inset-0.5 bg-cyan-900/50 flex flex-col p-0.5 gap-px">
                     <div className="w-3/4 h-0.5 bg-cyan-400/50" />
                     <div className="w-1/2 h-0.5 bg-cyan-400/50" />
                     <div className="w-full h-0.5 bg-cyan-400/50" />
                  </div>
                </div>
                {/* Fake Keyboard */}
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-10 h-2 bg-slate-800 rounded-sm border border-slate-900" />
                {/* Coffee mug */}
                <div className="absolute top-2 right-4 w-2 h-3 bg-white rounded-sm border border-slate-300" />
              </div>

              {/* Agent Name Tag Below Desk */}
              <div className="mt-2 text-[10px] font-mono tracking-widest px-2 py-0.5 rounded bg-black/80 text-white border border-slate-700">
                {agent.name} DESK
              </div>
            </div>
          );
        })}

        {/* Render Moving Agents */}
        {agents.map((agent) => {
          // If summoned, move to the Server Room Door (top center)
          // Adjust their X slightly so they don't overlap on top of each other
          const deskPos = DESK_POSITIONS[agent.id] || { top: "50%", left: "50%" };
          
          let currentTop = deskPos.top;
          let currentLeft = deskPos.left;

          if (agent.isSummoned) {
             currentTop = "15%"; 
             // Lyra (idx 0), Apex (1), Vera (2), Zion (3)
             const offsets = { lyra: "35%", apex: "45%", vera: "55%", zion: "65%" };
             currentLeft = (offsets as any)[agent.id] || "50%";
          }

          const statusInfo = STATUS_CONFIG[agent.status] || STATUS_CONFIG.idle;
          const isActive = agent.status !== "idle" && agent.status !== "done";

          return (
            <div 
              key={`agent-${agent.id}`} 
              className="absolute flex flex-col items-center justify-center transition-all duration-1000 ease-in-out z-30"
              style={{ 
                top: currentTop, 
                left: currentLeft, 
                transform: "translate(-50%, -50%)" 
              }}
            >
              {/* 1. Speech / Thought Bubble (appears if active) */}
              <div 
                className={`
                  absolute -top-16 bg-white text-black font-mono text-[10px] 
                  px-2 py-1 rounded shadow-lg min-w-[120px] text-center
                  transition-opacity duration-300 pointer-events-none z-40
                  ${isActive ? "opacity-100" : "opacity-0"}
                `}
                style={{
                  border: `2px solid ${statusInfo.color}`,
                }}
              >
                {statusInfo.label}
                {/* Bubble tail */}
                <div 
                  className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white rotate-45 border-b-2 border-r-2" 
                  style={{ borderColor: statusInfo.color }} 
                />
              </div>

              {/* 2. The Agent Model */}
              <div className="relative z-20 mb-[-12px] w-16 h-16 pointer-events-none">
                {/* Simulated shadow */}
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-3 bg-black/40 rounded-full blur-[2px] z-0" />
                
                {/* Custom Agent Sprites */}
                <AgentSprite
                  id={agent.id}
                  color={agent.color}
                  isBlinking={true} 
                  status={agent.status}
                  animation={agent.animation} // Pass the animation state down!
                />
              </div>
              
              {/* Name Tag floats with Agent when summoned */}
              {agent.isSummoned && (
                <div className="absolute -bottom-6 text-[10px] font-mono tracking-widest px-2 py-0.5 rounded bg-black/80 text-white border border-slate-700 z-40">
                  {agent.name}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
