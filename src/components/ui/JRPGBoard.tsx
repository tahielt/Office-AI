"use client";
import React from "react";
import { Agent } from "@/types/agent";
import { STATUS_CONFIG } from "@/lib/agents";
import AgentSprite from "./AgentSprite";

interface Props { agents: Agent[]; }

const DESK_POSITIONS: Record<string, { top: string; left: string }> = {
  scout: { top: "30%", left: "12%" },
  apex:  { top: "30%", left: "36%" },
  forge: { top: "30%", left: "63%" },
  vox:   { top: "30%", left: "87%" },
  vera:  { top: "70%", left: "12%" },
  echo:  { top: "70%", left: "36%" },
  zion:  { top: "70%", left: "63%" },
  pulse: { top: "70%", left: "87%" },
};

const SUMMON_LEFT: Record<string, string> = {
  scout:"7%", apex:"20%", forge:"33%", vox:"46%",
  vera:"59%", echo:"72%", zion:"85%", pulse:"93%"
};

function ScoutDesk() {
  return (
    <svg width="140" height="80" viewBox="0 0 160 90" xmlns="http://www.w3.org/2000/svg">
      <rect x="8" y="28" width="144" height="54" rx="3" fill="#0d1f2d" stroke="#00f5ff" strokeWidth="0.8" strokeOpacity="0.4"/>
      <rect x="8" y="72" width="144" height="10" rx="2" fill="#071520" stroke="#00f5ff" strokeWidth="0.5" strokeOpacity="0.3"/>
      <rect x="44" y="8" width="72" height="44" rx="4" fill="#020d14" stroke="#00f5ff" strokeWidth="1.2" strokeOpacity="0.7"/>
      <rect x="45" y="9" width="70" height="42" rx="3" fill="#00f5ff" fillOpacity="0.04"/>
      <rect x="49" y="13" width="40" height="1.5" rx="0.8" fill="#00f5ff" fillOpacity="0.7"/>
      <rect x="49" y="17" width="30" height="1.5" rx="0.8" fill="#00f5ff" fillOpacity="0.5"/>
      <rect x="49" y="21" width="50" height="1.5" rx="0.8" fill="#00f5ff" fillOpacity="0.4"/>
      <rect x="49" y="25" width="35" height="1.5" rx="0.8" fill="#00f5ff" fillOpacity="0.6"/>
      <rect x="49" y="29" width="45" height="1.5" rx="0.8" fill="#00f5ff" fillOpacity="0.3"/>
      <circle cx="100" cy="20" r="3" fill="none" stroke="#00f5ff" strokeWidth="0.8" strokeOpacity="0.6"/>
      <line x1="103" y1="20" x2="106" y2="26" stroke="#00f5ff" strokeWidth="0.5" strokeOpacity="0.4"/>
      <rect x="49" y="33" width="1.5" height="8" rx="0.5" fill="#00f5ff" fillOpacity="0.9">
        <animate attributeName="opacity" values="0.9;0;0.9" dur="1.2s" repeatCount="indefinite"/>
      </rect>
      <rect x="14" y="32" width="26" height="18" rx="2" fill="#020d14" stroke="#00f5ff" strokeWidth="0.8" strokeOpacity="0.5"/>
      <rect x="122" y="40" width="20" height="3" rx="0.5" fill="#1a3a5c" stroke="#00f5ff" strokeWidth="0.4" strokeOpacity="0.4"/>
      <rect x="123" y="37" width="18" height="3" rx="0.5" fill="#0d2840" stroke="#00f5ff" strokeWidth="0.4" strokeOpacity="0.3"/>
      <rect x="10" y="27" width="140" height="2" rx="1" fill="#00f5ff" fillOpacity="0.15">
        <animate attributeName="fillOpacity" values="0.15;0.35;0.15" dur="2s" repeatCount="indefinite"/>
      </rect>
      <circle cx="26" cy="22" r="5" fill="none" stroke="#00f5ff" strokeWidth="0.8" strokeOpacity="0.5">
        <animateTransform attributeName="transform" type="translate" values="0,0;0,-3;0,0" dur="3s" repeatCount="indefinite"/>
      </circle>
    </svg>
  );
}

function ApexDesk() {
  return (
    <svg width="140" height="80" viewBox="0 0 160 90" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="30" width="148" height="52" rx="3" fill="#0a1a0d" stroke="#00ff88" strokeWidth="0.8" strokeOpacity="0.4"/>
      <rect x="10" y="8" width="64" height="44" rx="3" fill="#020a04" stroke="#00ff88" strokeWidth="1" strokeOpacity="0.7"/>
      <rect x="15" y="13" width="8" height="1.5" rx="0.5" fill="#ff4466" fillOpacity="0.8"/>
      <rect x="25" y="13" width="20" height="1.5" rx="0.5" fill="#00ff88" fillOpacity="0.7"/>
      <rect x="15" y="17" width="4" height="1.5" rx="0.5" fill="#ffaa00" fillOpacity="0.8"/>
      <rect x="21" y="17" width="30" height="1.5" rx="0.5" fill="#00f5ff" fillOpacity="0.6"/>
      <rect x="18" y="21" width="25" height="1.5" rx="0.5" fill="#00ff88" fillOpacity="0.5"/>
      <rect x="15" y="25" width="45" height="1.5" rx="0.5" fill="#00ff88" fillOpacity="0.4"/>
      <rect x="15" y="33" width="35" height="1.5" rx="0.5" fill="#00ff88" fillOpacity="0.6"/>
      <rect x="15" y="41" width="1.5" height="8" rx="0.5" fill="#00ff88" fillOpacity="0.9">
        <animate attributeName="opacity" values="0.9;0;0.9" dur="0.8s" repeatCount="indefinite"/>
      </rect>
      <rect x="86" y="10" width="66" height="40" rx="3" fill="#020a04" stroke="#00ff88" strokeWidth="1" strokeOpacity="0.6"/>
      <rect x="91" y="15" width="12" height="1.5" rx="0.5" fill="#00ff88" fillOpacity="0.9"/>
      <rect x="91" y="19" width="50" height="1.5" rx="0.5" fill="#00ff88" fillOpacity="0.5"/>
      <rect x="91" y="23" width="38" height="1.5" rx="0.5" fill="#ffaa00" fillOpacity="0.7"/>
      <rect x="91" y="31" width="30" height="1.5" rx="0.5" fill="#00f5ff" fillOpacity="0.5"/>
      <rect x="28" y="58" width="72" height="10" rx="2" fill="#0a1a0d" stroke="#00ff88" strokeWidth="0.8" strokeOpacity="0.4"/>
      {[0,1,2,3,4,5,6,7,8,9,10,11].map(i=>(
        <rect key={i} x={30+i*5.8} y="60" width="4.5" height="3" rx="0.8" fill="#00ff88" fillOpacity="0.12" stroke="#00ff88" strokeWidth="0.3" strokeOpacity="0.4"/>
      ))}
      <rect x="136" y="46" width="14" height="16" rx="2" fill="#fff" stroke="#ccc" strokeWidth="0.6"/>
      <rect x="138" y="48" width="10" height="4" rx="1" fill="#6b3a2a" fillOpacity="0.8"/>
      <rect x="8" y="29" width="144" height="2" rx="1" fill="#00ff88" fillOpacity="0.12">
        <animate attributeName="fillOpacity" values="0.12;0.28;0.12" dur="1.8s" repeatCount="indefinite"/>
      </rect>
    </svg>
  );
}

function ForgeDesk() {
  return (
    <svg width="140" height="80" viewBox="0 0 160 90" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="30" width="148" height="52" rx="3" fill="#1a0e05" stroke="#f97316" strokeWidth="0.8" strokeOpacity="0.4"/>
      <rect x="20" y="8" width="120" height="44" rx="4" fill="#0d0600" stroke="#f97316" strokeWidth="1.2" strokeOpacity="0.7"/>
      <rect x="24" y="12" width="50" height="8" rx="2" fill="#f97316" fillOpacity="0.08" stroke="#f97316" strokeWidth="0.4" strokeOpacity="0.3"/>
      <rect x="26" y="14" width="20" height="1.5" rx="0.5" fill="#f97316" fillOpacity="0.7"/>
      <rect x="48" y="14" width="12" height="1.5" rx="0.5" fill="#00ff88" fillOpacity="0.6"/>
      {[0,1,2,3].map(i=>(
        <g key={i}>
          <rect x="24" y={23+i*6} width="112" height="4" rx="1" fill="#f97316" fillOpacity="0.05" stroke="#f97316" strokeWidth="0.3" strokeOpacity="0.2"/>
          <rect x="26" y={24.5+i*6} width={30+i*8} height="1.5" rx="0.5" fill="#f97316" fillOpacity={0.4+i*0.1}/>
          <circle cx="130" cy={25.5+i*6} r="2" fill={i%2===0?"#00ff88":"#f97316"} fillOpacity="0.7"/>
        </g>
      ))}
      <rect x="24" y="44" width="112" height="5" rx="1.5" fill="#0d0600" stroke="#f97316" strokeWidth="0.5" strokeOpacity="0.4"/>
      <rect x="25" y="45.5" width="80" height="2" rx="1" fill="#f97316" fillOpacity="0.6">
        <animate attributeName="width" values="40;90;40" dur="3s" repeatCount="indefinite"/>
      </rect>
      <rect x="6" y="29" width="148" height="2" rx="1" fill="#f97316" fillOpacity="0.15">
        <animate attributeName="fillOpacity" values="0.15;0.35;0.15" dur="2.2s" repeatCount="indefinite"/>
      </rect>
    </svg>
  );
}

function VoxDesk() {
  return (
    <svg width="140" height="80" viewBox="0 0 160 90" xmlns="http://www.w3.org/2000/svg">
      <rect x="8" y="28" width="144" height="54" rx="3" fill="#120820" stroke="#a855f7" strokeWidth="0.8" strokeOpacity="0.4"/>
      <rect x="30" y="6" width="100" height="46" rx="4" fill="#0a0314" stroke="#a855f7" strokeWidth="1.2" strokeOpacity="0.7"/>
      <rect x="34" y="10" width="60" height="34" rx="2" fill="#0d0118" stroke="#a855f7" strokeWidth="0.5" strokeOpacity="0.4"/>
      <rect x="36" y="38" width="56" height="4" rx="1" fill="#1e0a2e" stroke="#a855f7" strokeWidth="0.3" strokeOpacity="0.3"/>
      {[0,1,2,3,4].map(i=>(
        <rect key={i} x={37+i*11} y="38.5" width="8" height="3" rx="0.5" fill="#a855f7" fillOpacity={0.3+i*0.08}/>
      ))}
      <rect x="36" y="12" width="56" height="24" rx="1" fill="#1a0828"/>
      <polygon points="62,21 62,27 68,24" fill="#c084fc" fillOpacity="0.7"/>
      <rect x="98" y="10" width="28" height="36" rx="2" fill="#0a0314" stroke="#a855f7" strokeWidth="0.5" strokeOpacity="0.3"/>
      {[{c:"#e1306c"},{c:"#0077b5"},{c:"#ff0000"},{c:"#69c9d0"}].map((p,i)=>(
        <g key={i}>
          <rect x="101" y={13+i*8} width="22" height="6" rx="1" fill={p.c} fillOpacity="0.12" stroke={p.c} strokeWidth="0.4" strokeOpacity="0.4"/>
          <rect x="103" y={15+i*8} width="8" height="1.5" rx="0.5" fill={p.c} fillOpacity="0.7"/>
        </g>
      ))}
      <rect x="8" y="27" width="140" height="2" rx="1" fill="#a855f7" fillOpacity="0.15">
        <animate attributeName="fillOpacity" values="0.15;0.35;0.15" dur="2.4s" repeatCount="indefinite"/>
      </rect>
    </svg>
  );
}

function VeraDesk() {
  return (
    <svg width="140" height="80" viewBox="0 0 160 90" xmlns="http://www.w3.org/2000/svg">
      <rect x="8" y="28" width="144" height="54" rx="3" fill="#1a1005" stroke="#ffaa00" strokeWidth="0.8" strokeOpacity="0.4"/>
      <rect x="34" y="6" width="92" height="46" rx="4" fill="#0d0800" stroke="#ffaa00" strokeWidth="1.2" strokeOpacity="0.7"/>
      <rect x="40" y="12" width="30" height="2" rx="1" fill="#ffaa00" fillOpacity="0.6"/>
      <rect x="38" y="20" width="40" height="26" rx="1" fill="#ffaa00" fillOpacity="0.04"/>
      {[0,1,2,3,4,5].map(i=>{const h=[10,16,8,20,14,18][i];return <rect key={i} x={40+i*6} y={44-h} width="4" height={h} rx="0.8" fill="#ffaa00" fillOpacity={0.4+i*0.08}/>})}
      <polyline points="42,34 48,28 54,36 60,24 66,30 72,26" fill="none" stroke="#00f5ff" strokeWidth="0.8" strokeOpacity="0.7"/>
      <rect x="84" y="20" width="38" height="8" rx="1" fill="#ffaa00" fillOpacity="0.08"/>
      <rect x="87" y="22" width="14" height="1.5" rx="0.5" fill="#ffaa00" fillOpacity="0.5"/>
      <rect x="104" y="22" width="14" height="1.5" rx="0.5" fill="#00ff88" fillOpacity="0.7"/>
      <rect x="84" y="31" width="38" height="8" rx="1" fill="#ffaa00" fillOpacity="0.06"/>
      <rect x="87" y="33" width="10" height="1.5" rx="0.5" fill="#ffaa00" fillOpacity="0.4"/>
      <rect x="104" y="33" width="18" height="1.5" rx="0.5" fill="#ff4466" fillOpacity="0.7"/>
      <rect x="10" y="27" width="140" height="2" rx="1" fill="#ffaa00" fillOpacity="0.13">
        <animate attributeName="fillOpacity" values="0.13;0.3;0.13" dur="2.5s" repeatCount="indefinite"/>
      </rect>
    </svg>
  );
}

function EchoDesk() {
  return (
    <svg width="140" height="80" viewBox="0 0 160 90" xmlns="http://www.w3.org/2000/svg">
      <rect x="8" y="28" width="144" height="54" rx="3" fill="#05181a" stroke="#22d3ee" strokeWidth="0.8" strokeOpacity="0.4"/>
      <rect x="28" y="8" width="104" height="44" rx="4" fill="#020e10" stroke="#22d3ee" strokeWidth="1.2" strokeOpacity="0.7"/>
      <rect x="32" y="12" width="96" height="6" rx="1" fill="#22d3ee" fillOpacity="0.08"/>
      <rect x="34" y="14" width="20" height="1.5" rx="0.5" fill="#22d3ee" fillOpacity="0.4"/>
      <rect x="56" y="14" width="50" height="1.5" rx="0.5" fill="#22d3ee" fillOpacity="0.7"/>
      {[0,1,2,3,4,5].map(i=>(
        <rect key={i} x="32" y={21+i*5} width={[90,70,85,60,80,40][i]} height="1.5" rx="0.5" fill="#22d3ee" fillOpacity={[0.5,0.35,0.45,0.3,0.4,0.25][i]}/>
      ))}
      <rect x="32" y="46" width="1.5" height="6" rx="0.5" fill="#22d3ee" fillOpacity="0.9">
        <animate attributeName="opacity" values="0.9;0;0.9" dur="1s" repeatCount="indefinite"/>
      </rect>
      <rect x="96" y="46" width="28" height="7" rx="2" fill="#22d3ee" fillOpacity="0.2" stroke="#22d3ee" strokeWidth="0.6" strokeOpacity="0.6"/>
      <rect x="8" y="27" width="140" height="2" rx="1" fill="#22d3ee" fillOpacity="0.12">
        <animate attributeName="fillOpacity" values="0.12;0.28;0.12" dur="2s" repeatCount="indefinite"/>
      </rect>
    </svg>
  );
}

function ZionDesk() {
  return (
    <svg width="140" height="80" viewBox="0 0 160 90" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="26" width="152" height="56" rx="3" fill="#110208" stroke="#ff4466" strokeWidth="1" strokeOpacity="0.5"/>
      <rect x="14" y="4" width="132" height="44" rx="5" fill="#060003" stroke="#ff4466" strokeWidth="1.5" strokeOpacity="0.8"/>
      <rect x="18" y="8" width="80" height="34" rx="2" fill="#0d0108"/>
      {[0,1,2,3,4,5,6,7].map(i=>(<line key={`v${i}`} x1={18+i*10} y1="8" x2={18+i*10} y2="42" stroke="#ff4466" strokeWidth="0.2" strokeOpacity="0.2"/>))}
      {[0,1,2,3].map(i=>(<line key={`h${i}`} x1="18" y1={8+i*8} x2="98" y2={8+i*8} stroke="#ff4466" strokeWidth="0.2" strokeOpacity="0.2"/>))}
      <circle cx="30" cy="18" r="2.5" fill="#ff4466" fillOpacity="0.9">
        <animate attributeName="r" values="2.5;3.5;2.5" dur="2s" repeatCount="indefinite"/>
      </circle>
      <circle cx="62" cy="22" r="2" fill="#00f5ff" fillOpacity="0.8"/>
      <circle cx="82" cy="15" r="1.5" fill="#ffaa00" fillOpacity="0.8"/>
      <line x1="30" y1="18" x2="62" y2="22" stroke="#ff4466" strokeWidth="0.6" strokeOpacity="0.4" strokeDasharray="2 2"/>
      <rect x="103" y="8" width="38" height="34" rx="2" fill="#0d0108" stroke="#ff4466" strokeWidth="0.5" strokeOpacity="0.3"/>
      {[{c:"#00ff88"},{c:"#ff4466"},{c:"#ffaa00"},{c:"#00f5ff"}].map((k,i)=>(
        <g key={i}>
          <rect x="106" y={10+i*8} width="32" height="6" rx="1" fill={k.c} fillOpacity="0.06" stroke={k.c} strokeWidth="0.3" strokeOpacity="0.3"/>
          <rect x="108" y={12+i*8} width="8" height="1.5" rx="0.5" fill={k.c} fillOpacity="0.5"/>
          <rect x="122" y={12+i*8} width="12" height="1.5" rx="0.5" fill={k.c} fillOpacity="0.9"/>
        </g>
      ))}
      <rect x="6" y="25" width="148" height="2" rx="1" fill="#ff4466" fillOpacity="0.15">
        <animate attributeName="fillOpacity" values="0.15;0.4;0.15" dur="3s" repeatCount="indefinite"/>
      </rect>
    </svg>
  );
}

function PulseDesk() {
  return (
    <svg width="140" height="80" viewBox="0 0 160 90" xmlns="http://www.w3.org/2000/svg">
      <rect x="8" y="28" width="144" height="54" rx="3" fill="#180412" stroke="#ec4899" strokeWidth="0.8" strokeOpacity="0.4"/>
      <rect x="30" y="8" width="100" height="44" rx="4" fill="#0d0107" stroke="#ec4899" strokeWidth="1.2" strokeOpacity="0.7"/>
      <circle cx="80" cy="30" r="14" fill="none" stroke="#ec4899" strokeWidth="2" strokeOpacity="0.5"/>
      <circle cx="80" cy="30" r="8" fill="#ec4899" fillOpacity="0.4">
         <animate attributeName="r" values="8;12;8" dur="1.5s" repeatCount="indefinite"/>
      </circle>
      <path d="M 60 40 Q 80 10 100 40" fill="none" stroke="#ec4899" strokeWidth="1" strokeOpacity="0.6"/>
      <circle cx="60" cy="40" r="2" fill="#00f5ff" fillOpacity="0.8"/>
      <circle cx="100" cy="40" r="2" fill="#00ff88" fillOpacity="0.8"/>
      <rect x="8" y="27" width="140" height="2" rx="1" fill="#ec4899" fillOpacity="0.15">
        <animate attributeName="fillOpacity" values="0.15;0.35;0.15" dur="2s" repeatCount="indefinite"/>
      </rect>
    </svg>
  );
}

const DESK_MAP: Record<string, React.ReactNode> = {
  scout:<ScoutDesk/>, apex:<ApexDesk/>, forge:<ForgeDesk/>, vox:<VoxDesk/>,
  vera:<VeraDesk/>,   echo:<EchoDesk/>, zion:<ZionDesk/>, pulse:<PulseDesk/>
};

export default function JRPGBoard({ agents }: Props) {
  const ariaAgent   = agents.find(a => a.id === "aria");
  const boardAgents = agents.filter(a => a.id !== "aria");
  const ariaActive  = ariaAgent?.status !== "idle";

  return (
    <div className="flex-1 w-full h-full relative overflow-hidden flex items-center justify-center"
      style={{ background:"linear-gradient(180deg,#0a0a0f 0%,#0d0d14 100%)" }}>

      <div className="absolute inset-0 pointer-events-none" style={{ boxShadow:"inset 0 0 80px rgba(0,0,0,0.7)" }}/>

      <div className="relative rounded-lg overflow-hidden w-full h-full"
        style={{ background:"#0d0d14", border:"1px solid rgba(255,255,255,0.06)" }}>

        {/* ── FONDO ── */}
        <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 900 560" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="floorTile" x="0" y="0" width="64" height="64" patternUnits="userSpaceOnUse">
              <rect width="64" height="64" fill="#0f0f18" stroke="#1a1a28" strokeWidth="0.5"/>
            </pattern>
            <radialGradient id="ambientLight" cx="50%" cy="30%" r="60%">
              <stop offset="0%" stopColor="#1a1a2e" stopOpacity="1"/>
              <stop offset="100%" stopColor="#0d0d14" stopOpacity="1"/>
            </radialGradient>
          </defs>
          <rect width="900" height="560" fill="url(#ambientLight)"/>
          <rect width="900" height="560" fill="url(#floorTile)"/>
          <line x1="0" y1="200" x2="900" y2="200" stroke="#fff" strokeWidth="0.3" strokeOpacity="0.04"/>
          <line x1="0" y1="380" x2="900" y2="380" stroke="#fff" strokeWidth="0.3" strokeOpacity="0.04"/>
          <rect x="0" y="0" width="900" height="40" fill="#08080f"/>
          <rect x="0" y="0" width="900" height="2" fill="#fff" fillOpacity="0.04"/>
          {[0,1,2,3,4,5,6,7,8,9,10,11,12,13].map(i=>(
            <rect key={i} x={i*64} y="0" width="60" height="38" rx="1" fill="#0a0a12" stroke="#1e1e2e" strokeWidth="0.5"/>
          ))}
          <rect x="376" y="0" width="148" height="38" rx="2" fill="#0f0f1e" stroke="#4444aa" strokeWidth="1" strokeOpacity="0.6"/>
          <line x1="450" y1="2" x2="450" y2="36" stroke="#4444aa" strokeWidth="0.5" strokeOpacity="0.4"/>
          <circle cx="392" cy="20" r="2" fill="#4444aa" fillOpacity="0.8">
            <animate attributeName="fillOpacity" values="0.8;0.3;0.8" dur="3s" repeatCount="indefinite"/>
          </circle>
          <circle cx="508" cy="20" r="2" fill="#4444aa" fillOpacity="0.8">
            <animate attributeName="fillOpacity" values="0.8;0.3;0.8" dur="3s" begin="1.5s" repeatCount="indefinite"/>
          </circle>
          <rect x="18" y="5" width="40" height="32" rx="1" fill="#0f0f1e" stroke="#2a2a3a" strokeWidth="0.5"/>
          {["#c0392b","#2980b9","#27ae60","#f39c12","#8e44ad","#16a085"].map((c,i)=>(
            <rect key={i} x={20+i*6} y="10" width="4" height={14+(i%3)*4} rx="0.5" fill={c} fillOpacity="0.7"/>
          ))}
          <rect x="842" y="5" width="48" height="32" rx="1" fill="#0f0f1e" stroke="#2a2a3a" strokeWidth="0.5"/>
          <ellipse cx="866" cy="22" rx="12" ry="10" fill="#1a4a1a" fillOpacity="0.8"/>
          <rect x="860" y="26" width="12" height="10" rx="1" fill="#4a2800"/>
        </svg>

        {/* Label server room */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10" style={{top:"6px"}}>
          <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"/>
          <span className="text-[9px] font-mono tracking-[0.3em] text-indigo-400/60">SERVER ROOM</span>
          <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" style={{animationDelay:"0.5s"}}/>
        </div>

        {/* ── ARIA — centro del board ── */}
        {ariaAgent && (
          <div
            className="absolute z-40 flex flex-col items-center pointer-events-none transition-all duration-500"
            style={{
              top:"50%", left:"50%",
              transform:"translate(-50%,-50%)",
              opacity: ariaActive ? 1 : 0.15,
              filter: ariaActive ? "drop-shadow(0 0 14px #e2e8f070)" : "none",
            }}
          >
            {ariaActive && (
              <div className="absolute font-mono text-[9px] px-2 py-1 rounded whitespace-nowrap"
                style={{
                  top:"-32px", left:"50%", transform:"translateX(-50%)",
                  background:"#0a0a0f", border:"1px solid #e2e8f0",
                  color:"#e2e8f0", boxShadow:"0 0 8px #e2e8f040", letterSpacing:"0.15em",
                }}>
                {STATUS_CONFIG[ariaAgent.status]?.label || "PROCESANDO"}
              </div>
            )}
            <AgentSprite id="aria" color="#e2e8f0" isBlinking={ariaActive} status={ariaAgent.status} animation={ariaAgent.animation}/>
          </div>
        )}

        {/* ── AGENTES ── */}
        {boardAgents.map((agent) => {
          const pos = DESK_POSITIONS[agent.id];
          if (!pos) return null;
          const isSummoned = agent.isSummoned;
          const agentLeft  = isSummoned ? (SUMMON_LEFT[agent.id] || "50%") : pos.left;
          const agentTop   = isSummoned ? "14%" : pos.top;
          const statusInfo = STATUS_CONFIG[agent.status] || STATUS_CONFIG.idle;
          const isActive   = agent.status !== "idle" && agent.status !== "done";

          return (
            <React.Fragment key={agent.id}>
              {/* Desk */}
              <div className="absolute pointer-events-none"
                style={{ top:pos.top, left:pos.left, transform:"translate(-50%,-50%)", zIndex:10 }}>
                {DESK_MAP[agent.id]}
                <div className="text-center mt-0.5 text-[8px] font-mono tracking-[0.2em] px-1.5 py-0.5 rounded-sm"
                  style={{ color:"rgba(255,255,255,0.18)", background:"rgba(0,0,0,0.5)", border:"1px solid rgba(255,255,255,0.05)" }}>
                  {agent.name} DESK
                </div>
              </div>

              {/* Sprite */}
              <div className="absolute flex flex-col items-center transition-all duration-[1200ms] ease-in-out"
                style={{
                  top:agentTop, left:agentLeft,
                  transform: isSummoned ? "translate(-50%,-100%)" : "translate(-50%,-170%)",
                  zIndex:30,
                }}>
                {isActive && (
                  <div className="absolute font-mono text-[9px] px-2 py-1 rounded whitespace-nowrap"
                    style={{
                      top:"-36px", left:"50%", transform:"translateX(-50%)",
                      background:"#0a0a0f", border:`1px solid ${statusInfo.color}`,
                      color:statusInfo.color, boxShadow:`0 0 8px ${statusInfo.color}40`,
                      letterSpacing:"0.15em", zIndex:40,
                    }}>
                    {statusInfo.label}
                    <div className="absolute w-2 h-2" style={{
                      bottom:"-5px", left:"50%", transform:"translateX(-50%) rotate(45deg)",
                      background:"#0a0a0f", borderRight:`1px solid ${statusInfo.color}`, borderBottom:`1px solid ${statusInfo.color}`,
                    }}/>
                  </div>
                )}
                <div className="w-16 h-16 relative" style={{ filter:`drop-shadow(0 0 6px ${agent.color}50)` }}>
                  <AgentSprite id={agent.id} color={agent.color} isBlinking={true} status={agent.status} animation={agent.animation}/>
                </div>
                {agent.isSummoned && (
                  <div className="mt-1 text-[9px] font-mono tracking-widest px-2 py-0.5 rounded-sm"
                    style={{ background:"rgba(0,0,0,0.85)", border:`1px solid ${agent.color}60`, color:agent.color, zIndex:40 }}>
                    {agent.name}
                  </div>
                )}
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}