"use client";
import React from "react";

interface VoxProps {
  animation?: "idle" | "thinking" | "talking" | "typing" | "walking";
  isActive?: boolean;
}

export function VoxSprite({ animation = "idle", isActive = false }: VoxProps) {
  return (
    <svg width="64" height="80" viewBox="0 0 64 80" xmlns="http://www.w3.org/2000/svg" style={{ overflow: "visible" }}>
      <defs>
        <style>{`
          @keyframes vox-bob    { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-2px)} }
          @keyframes vox-blink  { 0%,90%,100%{opacity:1} 95%{opacity:0} }
          @keyframes vox-scan   { 0%{transform:translateY(0);opacity:0.6} 100%{transform:translateY(28px);opacity:0} }
          @keyframes vox-pulse  { 0%,100%{opacity:0.4;r:3} 50%{opacity:1;r:5} }
          @keyframes vox-wave1  { 0%,100%{transform:scaleY(0.3)} 50%{transform:scaleY(1)} }
          @keyframes vox-wave2  { 0%,100%{transform:scaleY(0.7)} 30%{transform:scaleY(1)} 70%{transform:scaleY(0.2)} }
          @keyframes vox-wave3  { 0%,100%{transform:scaleY(1)} 50%{transform:scaleY(0.2)} }
          @keyframes vox-record { 0%,100%{opacity:1} 50%{opacity:0.2} }
          @keyframes vox-think1 { 0%,100%{opacity:0;transform:scale(0.5)} 20%,80%{opacity:0.9} 50%{transform:scale(1)} }
          @keyframes vox-think2 { 0%,25%,100%{opacity:0} 45%,80%{opacity:0.9;transform:scale(1)} }
          @keyframes vox-think3 { 0%,50%,100%{opacity:0} 70%,90%{opacity:0.9;transform:scale(1)} }
          @keyframes vox-type   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-3px)} }
          @keyframes vox-lens   { 0%,100%{opacity:0.6} 50%{opacity:1} }
          @keyframes vox-ticker { 0%{transform:translateX(0)} 100%{transform:translateX(-40px)} }
        `}</style>
        <radialGradient id="vox-body" cx="50%" cy="40%" r="55%">
          <stop offset="0%"   stopColor="#c084fc" stopOpacity="0.3"/>
          <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.1"/>
        </radialGradient>
        <radialGradient id="vox-screen" cx="50%" cy="30%" r="60%">
          <stop offset="0%"   stopColor="#e9d5ff" stopOpacity="0.9"/>
          <stop offset="100%" stopColor="#a855f7" stopOpacity="0.2"/>
        </radialGradient>
        <filter id="vox-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="2.5" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="vox-glow-soft" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="4" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <clipPath id="vox-chest-clip">
          <rect x="20" y="36" width="24" height="16" rx="2"/>
        </clipPath>
      </defs>

      {/* ── CUERPO ── */}
      <g style={{ animation: "vox-bob 2.8s ease-in-out infinite", transformOrigin: "32px 40px" }}>

        {/* Torso */}
        <rect x="18" y="22" width="28" height="34" rx="5"
          fill="url(#vox-body)" stroke="#a855f7" strokeWidth="1.2" opacity="0.9"/>

        {/* Hombros — más anchos, estilo broadcast */}
        <rect x="12" y="26" width="8"  height="14" rx="3" fill="#1e0a2e" stroke="#a855f7" strokeWidth="0.8" opacity="0.8"/>
        <rect x="44" y="26" width="8"  height="14" rx="3" fill="#1e0a2e" stroke="#a855f7" strokeWidth="0.8" opacity="0.8"/>

        {/* Cabeza */}
        <rect x="19" y="6" width="26" height="20" rx="6"
          fill="#1e0a2e" stroke="#a855f7" strokeWidth="1.2" opacity="0.95"/>

        {/* ── CÁMARA — ojo principal centrado ── */}
        <circle cx="32" cy="14" r="7" fill="#0d0118" stroke="#a855f7" strokeWidth="1" opacity="0.95"/>
        {/* Lente */}
        <circle cx="32" cy="14" r="5" fill="#1a0030" stroke="#c084fc" strokeWidth="0.6"
          style={{ animation: "vox-lens 2s ease-in-out infinite" }} filter="url(#vox-glow)"/>
        <circle cx="32" cy="14" r="3" fill="#a855f7" opacity="0.5"/>
        <circle cx="32" cy="14" r="1.5" fill="#e9d5ff" opacity="0.9" filter="url(#vox-glow)"/>
        {/* Reflejo lente */}
        <circle cx="30" cy="12" r="0.8" fill="#ffffff" opacity="0.7"/>

        {/* REC indicator — parpadea cuando activo */}
        <circle cx="42" cy="8" r="2.5" fill="#ff4466"
          style={{ animation: isActive ? "vox-record 1s ease-in-out infinite" : "none", opacity: isActive ? 1 : 0.3 }}
          filter="url(#vox-glow)"/>
        <rect x="38" y="7" width="3" height="1.5" rx="0.5" fill="#ff4466" opacity="0.7"/>

        {/* Micrófono lateral derecho */}
        <rect x="44" y="8" width="3" height="8" rx="1.5" fill="#c084fc" opacity="0.6"/>
        <rect x="43.5" y="7" width="4" height="1.5" rx="1" fill="#a855f7" opacity="0.5"/>

        {/* ── PANTALLA PECHO — ticker de contenido ── */}
        <rect x="20" y="36" width="24" height="16" rx="2"
          fill="#0d0118" stroke="#a855f7" strokeWidth="0.8" opacity="0.9"/>

        {/* Plataformas — íconos minimalistas */}
        {/* Instagram — círculo con punto */}
        <circle cx="26" cy="41" r="3" fill="none" stroke="#c084fc" strokeWidth="0.8" opacity="0.8"/>
        <circle cx="26" cy="41" r="1" fill="#c084fc" opacity="0.7"/>
        <circle cx="28.2" cy="38.8" r="0.6" fill="#c084fc" opacity="0.9"/>

        {/* LinkedIn — rectángulo in */}
        <rect x="30" y="38" width="5" height="5" rx="0.8" fill="none" stroke="#c084fc" strokeWidth="0.8" opacity="0.7"/>
        <rect x="31" y="39.5" width="1" height="3" rx="0.3" fill="#c084fc" opacity="0.8"/>
        <rect x="32.5" y="40" width="1.5" height="2.5" rx="0.3" fill="#c084fc" opacity="0.7"/>

        {/* Barra de progreso upload */}
        <rect x="22" y="46" width="20" height="2" rx="1" fill="#1e0a2e" opacity="0.8"/>
        <rect x="22" y="46" width={isActive ? "16" : "10"} height="2" rx="1"
          fill="#a855f7" opacity="0.9"
          style={{ transition: "width 0.5s ease" }} filter="url(#vox-glow)"/>

        {/* Ticker de texto con clip */}
        <g clipPath="url(#vox-chest-clip)">
          <text x="22" y="52" fontSize="3.5" fill="#c084fc" opacity="0.5"
            style={{ animation: "vox-ticker 4s linear infinite" }}>
            IG · LI · REEL · POST · VIDEO ·
          </text>
        </g>

        {/* ── BRAZO IZQUIERDO — sostiene cámara de mano ── */}
        <rect x="9" y="30" width="5" height="18" rx="2.5"
          fill="#1e0a2e" stroke="#a855f7" strokeWidth="0.7" opacity="0.85"
          style={{ animation: animation === "typing" ? "vox-type 0.25s ease-in-out infinite" : "none",
                   transformOrigin: "11.5px 30px" }}/>
        {/* Mini cámara en mano */}
        <rect x="6" y="44" width="8" height="5" rx="1.5"
          fill="#2d0a4e" stroke="#c084fc" strokeWidth="0.6" opacity="0.8"/>
        <circle cx="10" cy="46.5" r="1.5" fill="#a855f7" opacity="0.6"/>

        {/* ── BRAZO DERECHO ── */}
        <rect x="50" y="30" width="5" height="18" rx="2.5"
          fill="#1e0a2e" stroke="#a855f7" strokeWidth="0.7" opacity="0.85"
          style={{ animation: animation === "typing" ? "vox-type 0.25s ease-in-out infinite 0.125s" : "none",
                   transformOrigin: "52.5px 30px" }}/>

        {/* ── PIERNAS ── */}
        <rect x="23" y="55" width="8"  height="14" rx="3" fill="#1e0a2e" stroke="#a855f7" strokeWidth="0.7" opacity="0.8"/>
        <rect x="33" y="55" width="8"  height="14" rx="3" fill="#1e0a2e" stroke="#a855f7" strokeWidth="0.7" opacity="0.8"/>

        {/* Pies */}
        <rect x="21" y="66" width="12" height="5" rx="2" fill="#2d0a4e" stroke="#a855f7" strokeWidth="0.6" opacity="0.8"/>
        <rect x="31" y="66" width="12" height="5" rx="2" fill="#2d0a4e" stroke="#a855f7" strokeWidth="0.6" opacity="0.8"/>

        {/* ── BOCA / OUTPUT según animación ── */}
        {animation === "talking" ? (
          <g transform="translate(32,30)">
            {[-6,-3,0,3,6].map((x, i) => {
              const anims = ["vox-wave1","vox-wave2","vox-wave3","vox-wave2","vox-wave1"];
              const delays = ["0s","0.08s","0.16s","0.08s","0s"];
              return (
                <rect key={i} x={x-1.5} y="-3" width="3" height="6" rx="1.5"
                  fill="#c084fc" opacity="0.85"
                  style={{ transformOrigin:`${x}px 0`, animation:`${anims[i]} 0.4s ease-in-out infinite`, animationDelay:delays[i] }}/>
              );
            })}
          </g>
        ) : (
          <line x1="27" y1="30" x2="37" y2="30" stroke="#a855f7" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
        )}

        {/* ── BURBUJAS PENSAMIENTO ── */}
        {animation === "thinking" && (
          <g>
            <circle cx="46" cy="18" r="2.5" fill="#1e0a2e" stroke="#a855f7" strokeWidth="0.7"
              style={{ animation: "vox-think1 1.8s ease-in-out infinite" }}/>
            <circle cx="52" cy="12" r="4"   fill="#1e0a2e" stroke="#a855f7" strokeWidth="0.7"
              style={{ animation: "vox-think2 1.8s ease-in-out infinite" }}/>
            <circle cx="59" cy="6"  r="5.5" fill="#1e0a2e" stroke="#a855f7" strokeWidth="0.9"
              style={{ animation: "vox-think3 1.8s ease-in-out infinite" }}/>
            <text x="59" y="9" textAnchor="middle" fontSize="5.5" fill="#a855f7" opacity="0.9"
              style={{ animation: "vox-think3 1.8s ease-in-out infinite" }}>✦</text>
          </g>
        )}

        {/* ── LED antena ── */}
        <line x1="32" y1="6" x2="32" y2="1" stroke="#c084fc" strokeWidth="1" strokeLinecap="round" opacity="0.7"/>
        <circle cx="32" cy="0.5" r="1.5" fill="#a855f7"
          style={{ animation: "vox-record 1.5s ease-in-out infinite" }} filter="url(#vox-glow)"/>

      </g>

      {/* ── SOMBRA BASE ── */}
      <ellipse cx="32" cy="76" rx="14" ry="2.5" fill="#a855f7" opacity="0.1"
        style={{ animation: "vox-lens 2.8s ease-in-out infinite", transformOrigin:"32px 76px" }}
        filter="url(#vox-glow-soft)"/>
    </svg>
  );
}