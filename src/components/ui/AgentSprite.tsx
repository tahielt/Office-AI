import { AgentStatus, AgentAnimation } from "@/types/agent";

interface Props {
  id: string;
  color: string;
  isBlinking: boolean;
  status: AgentStatus;
  animation: AgentAnimation;
}

export default function AgentSprite({ id, color, isBlinking, status, animation }: Props) {
  const isWorking = status === "coding" || status === "running" || status === "analyzing" || status === "researching";

  // 1. LYRA (Researcher) - Floating spherical databank look
  if (id === "lyra") {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-end">
        {/* Lyra Body */}
        <div className={`relative z-10 w-10 h-10 rounded-full border-[3px] border-slate-900 flex flex-col items-center justify-center overflow-hidden animate-float transition-all ${isWorking ? "bg-cyan-900 opacity-90" : "bg-slate-800"}`}
             style={{ boxShadow: `0 0 15px ${color}60` }}>
          <div className="w-8 h-8 rounded-full opacity-50 absolute" style={{ backgroundColor: color }} />
          {/* Lyra Eye */}
          <div className={`w-6 h-2 bg-black rounded-sm flex items-center justify-center overflow-hidden ${isBlinking ? "animate-blink" : ""}`}>
             <div className="w-2 h-full bg-red-500 animate-[pulse_1s_infinite]" style={{ backgroundColor: color }} />
          </div>
        </div>

        {/* Animations */}
        {animation === "typing" && (
          <div className="absolute bottom-4 z-30 flex gap-4">
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDuration: '0.2s' }} />
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDuration: '0.3s' }} />
          </div>
        )}
        
        {animation === "thinking" && (
          <div className="absolute -right-2 top-0 z-30 text-lg animate-pulse" title="mano en barbilla">🤔</div>
        )}

        {/* Books on Lyra's desk */}
        <div className="absolute -bottom-8 left-2 w-6 h-4 bg-blue-800 border-2 border-slate-900 rounded-sm shadow-sm -rotate-12 z-20" />
        <div className="absolute -bottom-9 left-3 w-6 h-3 bg-indigo-600 border-2 border-slate-900 rounded-sm shadow-sm z-20" />
      </div>
    );
  }

  // 2. APEX (Engineer) - Blocky server-stack look
  if (id === "apex") {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-end">
        {/* Apex Body */}
        <div className="relative z-10 w-14 h-12 bg-slate-800 rounded-sm border-[3px] border-slate-900 flex flex-col items-center overflow-hidden animate-float"
             style={{ boxShadow: `0 0 10px ${color}40`, animationDelay: "0.2s" }}>
          <div className="w-full h-4 border-b-2 border-slate-900" style={{ backgroundColor: color }} />
          {/* Apex Eyes */}
          <div className={`flex gap-2 mt-1.5 ${isBlinking ? "animate-blink" : ""}`}>
            <div className="w-2 h-2 bg-yellow-400 rounded-sm" />
            <div className="w-2 h-2 bg-yellow-400 rounded-sm" />
          </div>
        </div>

        {/* Animations */}
        {animation === "typing" && (
          <div className="absolute bottom-2 z-30 flex gap-6">
            <div className="w-3 h-2 bg-green-500 rounded-sm animate-bounce" style={{ animationDuration: '0.15s' }} />
            <div className="w-3 h-2 bg-green-500 rounded-sm animate-bounce" style={{ animationDuration: '0.25s' }} />
          </div>
        )}

        {animation === "thinking" && (
          <div className="absolute top-2 -right-3 z-30 text-lg animate-bounce" style={{ animationDuration: '2s' }} title="pensando">💭</div>
        )}

        {/* Extra monitor + Coffee */}
        <div className="absolute -bottom-10 -left-6 w-8 h-10 bg-slate-900 border-2 border-slate-700 rounded-sm z-20 shadow-lg transform rotate-y-12 skew-y-6">
            <div className="absolute inset-0.5 bg-green-900/40 p-0.5 flex flex-col gap-px">
                <div className="w-full h-0.5 bg-green-500/50" />
                <div className="w-3/4 h-0.5 bg-green-500/50" />
                {animation === "typing" && <div className="w-1/2 h-0.5 bg-green-500/50 flex-1 mt-1 animate-pulse" />}
            </div>
        </div>
        
        {/* Drinking animation: move mug to face */}
        <div className={`absolute w-3 h-4 bg-white border border-slate-300 rounded-sm z-30 transition-all duration-500 ${
            animation === "drinking" ? "bottom-4 right-2 rotate-12" : "-bottom-7 right-1"
        }`}>
            <div className="absolute -right-1 top-0.5 w-1 h-2 border border-slate-300 rounded-r-md" />
            {isWorking && animation !== "drinking" && <div className="absolute -top-2 left-0.5 text-[8px] opacity-40 animate-float text-white">♨</div>}
        </div>
      </div>
    );
  }

  // 3. VERA (Analytics) - Sleek, tall, pyramid/chart inspired look
  if (id === "vera") {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-end">
        {/* Vera Body */}
        <div className="relative z-10 w-10 h-16 bg-slate-800 rounded-t-xl border-[3px] border-slate-900 flex flex-col items-center overflow-hidden animate-float"
             style={{ boxShadow: `0 0 10px ${color}40`, animationDelay: "0.4s" }}>
          <div className="w-full h-7 opacity-80" style={{ backgroundColor: color }} />
          {/* Vera Eyes (Graph-like) */}
          <div className={`flex gap-0.5 mt-2 ${isBlinking ? "animate-blink" : ""}`}>
            <div className="w-1 h-3 bg-white" />
            <div className="w-1 h-4 bg-white" />
            <div className="w-1 h-2 bg-white" />
          </div>
        </div>

        {/* Animations */}
        {animation === "typing" && (
          <div className="absolute bottom-4 z-30 flex gap-2">
            <div className="w-2 h-2 bg-slate-300 rounded-sm animate-ping" style={{ animationDuration: '0.5s' }} />
          </div>
        )}

        {animation === "thinking" && (
          <div className="absolute -right-3 top-2 z-30 text-lg animate-bounce" style={{ animationDuration: '1.5s' }}>📊</div>
        )}

        {/* Spreadsheets/Papers on Vera's desk */}
        <div className="absolute -bottom-8 right-2 w-7 h-5 bg-slate-100 border border-slate-300 shadow-sm rotate-6 z-20 flex flex-col items-center py-0.5 gap-0.5">
           <div className="w-5 h-0.5 bg-slate-400" />
           <div className="w-4 h-0.5 bg-slate-400" />
           {animation === "typing" && <div className="absolute -top-4 w-4 h-4 bg-white border border-slate-300 shadow-md animate-[bounce_2s_infinite] text-[6px] flex items-center justify-center">Doc</div>}
        </div>
        <div className="absolute -bottom-8 right-0 w-7 h-5 bg-slate-200 border border-slate-300 shadow-sm rotate-[-4deg] z-10" />
      </div>
    );
  }

  // 4. ZION (Strategy) - Dark, commanding, wide visor look
  if (id === "zion") {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-end">
        {/* Zion Body */}
        <div className="relative z-10 w-16 h-12 bg-slate-900 rounded-sm border-[3px] border-black flex flex-col items-center justify-center overflow-hidden animate-float"
             style={{ boxShadow: `0 0 12px ${color}60`, animationDelay: "0.6s" }}>
          {/* Glowing Visor */}
          <div className="w-12 h-4 bg-black border border-slate-800 rounded-full flex items-center justify-center overflow-hidden">
             <div className="w-full h-1 opacity-70 animate-[pulse_2s_infinite]" style={{ backgroundColor: color }} />
          </div>
        </div>

        {/* Animations */}
        {animation === "talking" && (
          <div className="absolute top-0 right-[-10px] z-30 flex flex-col gap-1 items-end animate-pulse">
            <div className="w-3 h-0.5 bg-white rounded-full bg-opacity-70" />
            <div className="w-4 h-0.5 bg-white rounded-full bg-opacity-70" />
            <div className="w-2 h-0.5 bg-white rounded-full bg-opacity-70" />
          </div>
        )}

        {animation === "thinking" && (
          <div className="absolute -top-4 z-30 text-lg animate-spin" style={{ animationDuration: '4s' }}>👁️</div>
        )}

        {animation === "typing" && (
          <div className="absolute bottom-2 z-30 flex gap-4">
            <div className="w-4 h-2 bg-slate-500 rounded-sm animate-bounce" style={{ animationDuration: '0.2s' }} />
            <div className="w-4 h-2 bg-slate-500 rounded-sm animate-bounce" style={{ animationDuration: '0.4s' }} />
          </div>
        )}

        {/* Chess piece / Strategy map on Zion's desk */}
        <div className="absolute -bottom-8 left-2 w-8 h-6 bg-slate-700 border-2 border-slate-900 rounded-sm shadow-sm z-20 flex flex-wrap gap-0.5 p-0.5">
           <div className={`w-2 h-2 rounded-full ${animation === 'thinking' ? 'bg-red-400 animate-ping' : 'bg-red-500/50'}`} />
           <div className="w-2 h-2 bg-blue-500/50 rounded-full" />
           <div className="w-2 h-2 bg-green-500/50 rounded-full" />
        </div>
        {/* Small black coffee */}
        <div className="absolute -bottom-7 right-4 w-2 h-3 bg-black border border-slate-700 rounded-b-sm rounded-t-lg z-20" />
      </div>
    );
  }

  // Default Fallback
  return (
    <div className={`absolute inset-0 flex flex-col items-center justify-end ${animation === "walking" ? "animate-bounce" : ""}`}>
      <div className="relative z-10 w-12 h-14 bg-slate-800 rounded border-[3px] border-slate-900 flex flex-col items-center overflow-hidden animate-float transition-all"
           style={{ boxShadow: `0 0 10px ${color}40` }}>
        <div className="w-10 h-6 mt-1 rounded-sm" style={{ backgroundColor: color }} />
        <div className={`flex gap-1 mt-1 ${isBlinking ? "animate-blink" : ""}`}>
          <div className="w-1.5 h-2 bg-white rounded-full"><div className="w-0.5 h-0.5 bg-black mt-0.5 mx-auto" /></div>
          <div className="w-1.5 h-2 bg-white rounded-full"><div className="w-0.5 h-0.5 bg-black mt-0.5 mx-auto" /></div>
        </div>
      </div>
      
      {/* Generic Animations applied to all or fallbacks */}
      {animation === "clapping" && (
        <div className="absolute -top-6 z-30 text-2xl animate-pulse" title="aplaudiendo">👏</div>
      )}
      {animation === "pointing" && (
        <div className="absolute -right-4 top-2 z-30 text-xl animate-bounce" style={{ animationDirection: 'alternate-reverse' }} title="señalando">👉</div>
      )}
    </div>
  );
}
