import { AgentStatus, AgentAnimation } from "@/types/agent";

interface Props {
  id: string;
  color: string;
  isBlinking: boolean;
  status: AgentStatus;
  animation: AgentAnimation;
}

const SPRITE_STYLES = `
  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-4px); }
  }
  @keyframes floatSlow {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-3px); }
  }
  @keyframes blink {
    0%, 90%, 100% { transform: scaleY(1); }
    95% { transform: scaleY(0.1); }
  }
  @keyframes typingBounce {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-3px); }
  }
  @keyframes thinkPulse {
    0%, 100% { opacity: 0.5; r: 3; }
    50% { opacity: 1; r: 4.5; }
  }
  @keyframes thinkDot1 {
    0%, 60%, 100% { opacity: 0.2; }
    20% { opacity: 1; }
  }
  @keyframes thinkDot2 {
    0%, 60%, 100% { opacity: 0.2; }
    35% { opacity: 1; }
  }
  @keyframes thinkDot3 {
    0%, 60%, 100% { opacity: 0.2; }
    50% { opacity: 1; }
  }
  @keyframes walkBob {
    0%, 100% { transform: translateY(0px) rotate(0deg); }
    25% { transform: translateY(-3px) rotate(-2deg); }
    75% { transform: translateY(-3px) rotate(2deg); }
  }
  @keyframes walkLegL {
    0%, 100% { transform: rotate(-18deg); }
    50% { transform: rotate(18deg); }
  }
  @keyframes walkLegR {
    0%, 100% { transform: rotate(18deg); }
    50% { transform: rotate(-18deg); }
  }
  @keyframes walkArmL {
    0%, 100% { transform: rotate(18deg); }
    50% { transform: rotate(-18deg); }
  }
  @keyframes walkArmR {
    0%, 100% { transform: rotate(-18deg); }
    50% { transform: rotate(18deg); }
  }
  @keyframes scanLine {
    0% { transform: translateY(-14px); opacity: 0.9; }
    100% { transform: translateY(14px); opacity: 0.3; }
  }
  @keyframes orbitRing {
    0% { transform: rotateX(70deg) rotateZ(0deg); }
    100% { transform: rotateX(70deg) rotateZ(360deg); }
  }
  @keyframes radarSpin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  @keyframes dataPulse {
    0%, 100% { opacity: 0.4; }
    50% { opacity: 1; }
  }
  @keyframes glowPulse {
    0%, 100% { opacity: 0.3; }
    50% { opacity: 0.8; }
  }
  @keyframes visorScroll {
    0% { stroke-dashoffset: 40; }
    100% { stroke-dashoffset: 0; }
  }
  @keyframes clap {
    0%, 100% { transform: translateX(0px); }
    50% { transform: translateX(3px); }
  }
  @keyframes drinkArm {
    0%, 100% { transform: rotate(0deg); }
    50% { transform: rotate(-35deg) translateY(-2px); }
  }
  @keyframes screenFlicker {
    0%, 100% { opacity: 1; }
    92% { opacity: 1; }
    94% { opacity: 0.3; }
    96% { opacity: 1; }
  }
  @keyframes particleFloat {
    0% { transform: translateY(0px); opacity: 0.8; }
    100% { transform: translateY(-12px); opacity: 0; }
  }
  @keyframes talkWave {
    0%, 100% { transform: scaleY(1); }
    50% { transform: scaleY(1.8); }
  }
  @keyframes eyeShift {
    0%, 80%, 100% { transform: translateX(0px); }
    85% { transform: translateX(1.5px); }
    90% { transform: translateX(-1.5px); }
    95% { transform: translateX(0px); }
  }
  @keyframes bodyBreath {
    0%, 100% { transform: scaleY(1); }
    50% { transform: scaleY(1.02); }
  }
`;

// ─────────────────────────────────────────────
// LYRA — Research Agent
// Forma: orbe flotante ciclope con anillo orbital
// Color: cian #00f5ff
// ─────────────────────────────────────────────
function LyraSprite({ color, animation, status }: Omit<Props, "id" | "isBlinking">) {
  const isTyping = animation === "typing";
  const isThinking = animation === "thinking";
  const isWalking = animation === "walking";
  const isTalking = animation === "talking";
  const isActive = !["idle", "done"].includes(status);

  return (
    <svg viewBox="0 0 64 72" width="64" height="72" xmlns="http://www.w3.org/2000/svg">
      <style>{SPRITE_STYLES}</style>

      {/* Sombra en el suelo */}
      <ellipse cx="32" cy="68" rx="10" ry="3" fill="#000" opacity="0.25" />

      {/* Grupo principal con animación float/walk */}
      <g style={{
        animation: isWalking
          ? "walkBob 0.5s ease-in-out infinite"
          : "float 3s ease-in-out infinite",
        transformOrigin: "32px 38px",
      }}>

        {/* Anillo orbital exterior */}
        {isActive && (
          <ellipse
            cx="32" cy="38" rx="22" ry="7"
            fill="none"
            stroke={color}
            strokeWidth="1.2"
            strokeOpacity="0.5"
            strokeDasharray="4 3"
            style={{
              animation: "radarSpin 2s linear infinite",
              transformOrigin: "32px 38px",
            }}
          />
        )}

        {/* Cuerpo esférico */}
        <circle cx="32" cy="38" r="16" fill="#0a1a2a" stroke={color} strokeWidth="1.5" strokeOpacity="0.8" />

        {/* Brillo interior */}
        <circle cx="32" cy="38" r="14" fill={color} fillOpacity="0.08" />
        <circle cx="27" cy="33" r="5" fill={color} fillOpacity="0.15" />

        {/* Scan line (cuando está activo) */}
        {isActive && (
          <rect
            x="18" y="36" width="28" height="1.5"
            fill={color}
            opacity="0.6"
            clipPath="circle(14px at 32px 38px)"
            style={{
              animation: "scanLine 1.8s linear infinite",
              transformOrigin: "32px 38px",
            }}
          />
        )}

        {/* Ojo central — monocular */}
        <g style={{ animation: "blink 4s ease-in-out infinite", transformOrigin: "32px 37px" }}>
          <ellipse cx="32" cy="37" rx="8" ry="6" fill="#000" stroke={color} strokeWidth="1" strokeOpacity="0.6" />
          <circle cx="32" cy="37" r="4" fill={color} fillOpacity="0.9" />
          <circle cx="32" cy="37" r="2.5" fill="#fff" fillOpacity="0.2" />
          <circle cx="30" cy="35.5" r="1" fill="#fff" fillOpacity="0.5" />
          {/* Iris scanner */}
          <circle cx="32" cy="37" r="6" fill="none" stroke={color} strokeWidth="0.5" strokeOpacity="0.4" strokeDasharray="2 2" />
        </g>

        {/* Antenas laterales */}
        <line x1="16" y1="33" x2="10" y2="27" stroke={color} strokeWidth="1.2" strokeOpacity="0.6" />
        <circle cx="10" cy="27" r="2" fill={color} fillOpacity="0.8" style={{ animation: isActive ? "dataPulse 1.2s ease-in-out infinite" : "none" }} />

        <line x1="48" y1="33" x2="54" y2="27" stroke={color} strokeWidth="1.2" strokeOpacity="0.6" />
        <circle cx="54" cy="27" r="2" fill={color} fillOpacity="0.8" style={{ animation: isActive ? "dataPulse 1.2s ease-in-out infinite 0.4s" : "none" }} />

        {/* Patas/tren inferior */}
        <g style={{
          animation: isWalking ? "walkLegL 0.5s ease-in-out infinite" : "none",
          transformOrigin: "26px 52px",
        }}>
          <rect x="24" y="52" width="5" height="9" rx="2" fill="#0d2030" stroke={color} strokeWidth="0.8" strokeOpacity="0.5" />
          <rect x="22" y="59" width="8" height="3" rx="1.5" fill={color} fillOpacity="0.7" />
        </g>
        <g style={{
          animation: isWalking ? "walkLegR 0.5s ease-in-out infinite" : "none",
          transformOrigin: "38px 52px",
        }}>
          <rect x="35" y="52" width="5" height="9" rx="2" fill="#0d2030" stroke={color} strokeWidth="0.8" strokeOpacity="0.5" />
          <rect x="34" y="59" width="8" height="3" rx="1.5" fill={color} fillOpacity="0.7" />
        </g>

        {/* ── Animación TYPING: manos tecleando ── */}
        {isTyping && (
          <>
            <g style={{ animation: "typingBounce 0.18s ease-in-out infinite", transformOrigin: "20px 48px" }}>
              <rect x="16" y="45" width="8" height="5" rx="2" fill={color} fillOpacity="0.9" />
              <rect x="17" y="47" width="2" height="2" rx="0.5" fill="#000" opacity="0.5" />
              <rect x="20" y="47" width="2" height="2" rx="0.5" fill="#000" opacity="0.5" />
            </g>
            <g style={{ animation: "typingBounce 0.22s ease-in-out infinite 0.09s", transformOrigin: "44px 48px" }}>
              <rect x="40" y="45" width="8" height="5" rx="2" fill={color} fillOpacity="0.9" />
              <rect x="41" y="47" width="2" height="2" rx="0.5" fill="#000" opacity="0.5" />
              <rect x="44" y="47" width="2" height="2" rx="0.5" fill="#000" opacity="0.5" />
            </g>
            {/* Partículas de datos */}
            <circle cx="32" cy="22" r="1.5" fill={color} style={{ animation: "particleFloat 1s ease-out infinite" }} />
            <circle cx="28" cy="24" r="1" fill={color} style={{ animation: "particleFloat 1s ease-out infinite 0.3s" }} />
            <circle cx="36" cy="23" r="1" fill={color} style={{ animation: "particleFloat 1s ease-out infinite 0.6s" }} />
          </>
        )}

        {/* ── Animación THINKING: burbujas de pensamiento ── */}
        {isThinking && (
          <>
            <circle cx="42" cy="24" r="3" fill={color} fillOpacity="0.2" stroke={color} strokeWidth="0.8" style={{ animation: "thinkDot1 1.2s ease-in-out infinite" }} />
            <circle cx="48" cy="18" r="4" fill={color} fillOpacity="0.2" stroke={color} strokeWidth="0.8" style={{ animation: "thinkDot2 1.2s ease-in-out infinite" }} />
            <circle cx="55" cy="13" r="5.5" fill={color} fillOpacity="0.15" stroke={color} strokeWidth="1" style={{ animation: "thinkDot3 1.2s ease-in-out infinite" }} />
            {/* Signo de interrogación dentro */}
            <text x="55" y="16.5" textAnchor="middle" fontSize="6" fill={color} fillOpacity="0.9" fontFamily="monospace">?</text>
          </>
        )}

        {/* ── Animación TALKING: ondas de sonido ── */}
        {isTalking && (
          <>
            {[0, 4, 8].map((offset, i) => (
              <rect
                key={i}
                x={51 + offset} y="34" width="2" height="8"
                rx="1" fill={color} fillOpacity="0.7"
                style={{
                  animation: `talkWave 0.5s ease-in-out infinite ${i * 0.12}s`,
                  transformOrigin: `${52 + offset}px 38px`,
                }}
              />
            ))}
          </>
        )}

        {/* ── Animación CLAPPING ── */}
        {animation === "clapping" && (
          <>
            <g style={{ animation: "clap 0.25s ease-in-out infinite", transformOrigin: "20px 48px" }}>
              <rect x="14" y="45" width="9" height="6" rx="2.5" fill={color} fillOpacity="0.9" />
            </g>
            <g style={{ animation: "clap 0.25s ease-in-out infinite reverse", transformOrigin: "44px 48px" }}>
              <rect x="41" y="45" width="9" height="6" rx="2.5" fill={color} fillOpacity="0.9" />
            </g>
          </>
        )}
      </g>
    </svg>
  );
}

// ─────────────────────────────────────────────
// APEX — Engineer Agent
// Forma: robot cuadrado estilo terminal/servidor
// Color: verde #00ff88
// ─────────────────────────────────────────────
function ApexSprite({ color, animation, status }: Omit<Props, "id" | "isBlinking">) {
  const isTyping = animation === "typing";
  const isThinking = animation === "thinking";
  const isWalking = animation === "walking";
  const isDrinking = animation === "drinking";
  const isTalking = animation === "talking";
  const isActive = !["idle", "done"].includes(status);

  return (
    <svg viewBox="0 0 64 72" width="64" height="72" xmlns="http://www.w3.org/2000/svg">
      <style>{SPRITE_STYLES}</style>

      <ellipse cx="32" cy="68" rx="11" ry="3.5" fill="#000" opacity="0.25" />

      <g style={{
        animation: isWalking ? "walkBob 0.5s ease-in-out infinite" : "floatSlow 3.5s ease-in-out infinite",
        transformOrigin: "32px 36px",
      }}>

        {/* ── CABEZA ── */}
        <rect x="16" y="8" width="32" height="26" rx="4" fill="#0d1f10" stroke={color} strokeWidth="1.2" strokeOpacity="0.7" />

        {/* Pantalla/cara interna */}
        <rect x="19" y="11" width="26" height="20" rx="2" fill="#061208"
          style={{ animation: isActive ? "screenFlicker 8s ease-in-out infinite" : "none" }} />

        {/* Ojos — dos displays cuadrados */}
        <g style={{ animation: "blink 5s ease-in-out infinite", transformOrigin: "32px 22px" }}>
          <rect x="21" y="17" width="8" height="7" rx="1.5" fill={color} fillOpacity="0.15" stroke={color} strokeWidth="0.8" />
          <rect x="35" y="17" width="8" height="7" rx="1.5" fill={color} fillOpacity="0.15" stroke={color} strokeWidth="0.8" />
          {/* Pupilas */}
          <rect x={isTyping ? "23" : "22"} y="18" width="4" height="5" rx="1" fill={color} fillOpacity="0.9" />
          <rect x={isTyping ? "37" : "36"} y="18" width="4" height="5" rx="1" fill={color} fillOpacity="0.9" />
          {/* Brillo */}
          <rect x="23" y="18" width="1.5" height="1.5" rx="0.5" fill="#fff" fillOpacity="0.5" />
          <rect x="37" y="18" width="1.5" height="1.5" rx="0.5" fill="#fff" fillOpacity="0.5" />
        </g>

        {/* Boca — lineas de código */}
        {isActive ? (
          <g>
            <rect x="21" y="27" width={isTyping ? "14" : "10"} height="1.5" rx="0.8" fill={color} fillOpacity="0.8" />
            <rect x="21" y="27" width="18" height="1.5" rx="0.8" fill="none" stroke={color} strokeWidth="0.3" strokeOpacity="0.3" />
          </g>
        ) : (
          <rect x="21" y="27" width="22" height="1.5" rx="0.8" fill="#333" />
        )}

        {/* Indicadores LED en la frente */}
        <circle cx="42" cy="12" r="1.5" fill={isActive ? color : "#333"} fillOpacity="0.9"
          style={{ animation: isActive ? "dataPulse 0.8s ease-in-out infinite" : "none" }} />
        <circle cx="46" cy="12" r="1.5" fill={isActive ? "#ffaa00" : "#333"} fillOpacity="0.8"
          style={{ animation: isActive ? "dataPulse 0.8s ease-in-out infinite 0.3s" : "none" }} />

        {/* ── CUERPO/TORSO ── */}
        <rect x="18" y="34" width="28" height="18" rx="3" fill="#0d1f10" stroke={color} strokeWidth="1" strokeOpacity="0.5" />

        {/* Panel de control en el pecho */}
        <rect x="22" y="37" width="20" height="10" rx="1.5" fill="#061208" stroke={color} strokeWidth="0.5" strokeOpacity="0.3" />
        {/* Barras de estado */}
        {[0, 1, 2].map((i) => (
          <rect
            key={i}
            x={24 + i * 6} y="39" width="4" height={isActive ? 3 + i : 1}
            rx="0.5"
            fill={i === 0 ? color : i === 1 ? "#ffaa00" : "#ff4466"}
            fillOpacity="0.8"
            style={{ animation: isActive ? `dataPulse ${0.6 + i * 0.2}s ease-in-out infinite ${i * 0.15}s` : "none" }}
          />
        ))}

        {/* ── BRAZOS ── */}
        {/* Brazo izquierdo */}
        <g style={{
          animation: isWalking ? "walkArmL 0.5s ease-in-out infinite" : isDrinking ? "drinkArm 1.5s ease-in-out infinite" : "none",
          transformOrigin: "18px 38px",
        }}>
          <rect x="10" y="35" width="8" height="14" rx="3" fill="#0d1f10" stroke={color} strokeWidth="0.8" strokeOpacity="0.5" />
          {/* Mano izquierda */}
          {isTyping ? (
            <g style={{ animation: "typingBounce 0.15s ease-in-out infinite", transformOrigin: "14px 50px" }}>
              <rect x="10" y="49" width="8" height="5" rx="2" fill={color} fillOpacity="0.9" />
              <rect x="11" y="51" width="2" height="1.5" rx="0.5" fill="#000" opacity="0.6" />
              <rect x="14" y="51" width="2" height="1.5" rx="0.5" fill="#000" opacity="0.6" />
            </g>
          ) : (
            <rect x="11" y="49" width="7" height="5" rx="2" fill="#0d2815" stroke={color} strokeWidth="0.8" strokeOpacity="0.5" />
          )}
        </g>

        {/* Brazo derecho */}
        <g style={{
          animation: isWalking ? "walkArmR 0.5s ease-in-out infinite" : "none",
          transformOrigin: "46px 38px",
        }}>
          <rect x="46" y="35" width="8" height="14" rx="3" fill="#0d1f10" stroke={color} strokeWidth="0.8" strokeOpacity="0.5" />
          {/* Mano derecha — con taza de café */}
          {isDrinking ? (
            <g style={{ animation: "drinkArm 1.5s ease-in-out infinite", transformOrigin: "50px 50px" }}>
              {/* Taza */}
              <rect x="46" y="46" width="8" height="9" rx="2" fill="#fff" stroke="#ccc" strokeWidth="0.8" />
              <rect x="48" y="43" width="4" height="5" rx="1" fill="#c8906a" opacity="0.8" />
              {/* Asa */}
              <path d="M54 48 Q58 48 58 52 Q58 56 54 56" fill="none" stroke="#ccc" strokeWidth="1" />
              {/* Vapor */}
              <path d="M49 43 Q49 40 50 38 Q51 36 50 34" fill="none" stroke="#888" strokeWidth="0.8" strokeOpacity="0.5"
                style={{ animation: "particleFloat 1.5s ease-out infinite" }} />
              <path d="M52 43 Q52 40 53 38 Q54 36 53 34" fill="none" stroke="#888" strokeWidth="0.8" strokeOpacity="0.5"
                style={{ animation: "particleFloat 1.5s ease-out infinite 0.5s" }} />
            </g>
          ) : isTyping ? (
            <g style={{ animation: "typingBounce 0.2s ease-in-out infinite 0.07s", transformOrigin: "50px 50px" }}>
              <rect x="46" y="49" width="8" height="5" rx="2" fill={color} fillOpacity="0.9" />
              <rect x="47" y="51" width="2" height="1.5" rx="0.5" fill="#000" opacity="0.6" />
              <rect x="50" y="51" width="2" height="1.5" rx="0.5" fill="#000" opacity="0.6" />
            </g>
          ) : (
            <rect x="46" y="49" width="7" height="5" rx="2" fill="#0d2815" stroke={color} strokeWidth="0.8" strokeOpacity="0.5" />
          )}
        </g>

        {/* ── PIERNAS ── */}
        <g style={{
          animation: isWalking ? "walkLegL 0.5s ease-in-out infinite" : "none",
          transformOrigin: "25px 52px",
        }}>
          <rect x="20" y="52" width="10" height="12" rx="3" fill="#0d1f10" stroke={color} strokeWidth="0.8" strokeOpacity="0.5" />
          <rect x="19" y="62" width="12" height="4" rx="2" fill={color} fillOpacity="0.6" />
        </g>
        <g style={{
          animation: isWalking ? "walkLegR 0.5s ease-in-out infinite" : "none",
          transformOrigin: "39px 52px",
        }}>
          <rect x="34" y="52" width="10" height="12" rx="3" fill="#0d1f10" stroke={color} strokeWidth="0.8" strokeOpacity="0.5" />
          <rect x="33" y="62" width="12" height="4" rx="2" fill={color} fillOpacity="0.6" />
        </g>

        {/* ── Animación THINKING ── */}
        {isThinking && (
          <>
            <circle cx="44" cy="8" r="3" fill={color} fillOpacity="0.2" stroke={color} strokeWidth="0.8" style={{ animation: "thinkDot1 1.2s ease-in-out infinite" }} />
            <circle cx="50" cy="3" r="4" fill={color} fillOpacity="0.15" stroke={color} strokeWidth="0.8" style={{ animation: "thinkDot2 1.2s ease-in-out infinite" }} />
            <circle cx="57" cy="-1" r="5" fill={color} fillOpacity="0.15" stroke={color} strokeWidth="1" style={{ animation: "thinkDot3 1.2s ease-in-out infinite" }} />
            <text x="57" y="2" textAnchor="middle" fontSize="6" fill={color} fillOpacity="0.9" fontFamily="monospace">?</text>
          </>
        )}

        {/* ── Animación TALKING ── */}
        {isTalking && (
          <g>
            {[0, 5, 10].map((offset, i) => (
              <rect key={i} x={52 + offset} y="32" width="2.5" height="8" rx="1.2"
                fill={color} fillOpacity="0.7"
                style={{ animation: `talkWave 0.45s ease-in-out infinite ${i * 0.1}s`, transformOrigin: `${53.5 + offset}px 36px` }} />
            ))}
          </g>
        )}
      </g>
    </svg>
  );
}

// ─────────────────────────────────────────────
// VERA — Analytics Agent
// Forma: androide femenino esbelto con visor holográfico
// Color: naranja/ambar #ffaa00
// ─────────────────────────────────────────────
function VeraSprite({ color, animation, status }: Omit<Props, "id" | "isBlinking">) {
  const isTyping = animation === "typing";
  const isThinking = animation === "thinking";
  const isWalking = animation === "walking";
  const isTalking = animation === "talking";
  const isActive = !["idle", "done"].includes(status);

  return (
    <svg viewBox="0 0 64 72" width="64" height="72" xmlns="http://www.w3.org/2000/svg">
      <style>{SPRITE_STYLES}</style>

      <ellipse cx="32" cy="69" rx="9" ry="2.8" fill="#000" opacity="0.22" />

      <g style={{
        animation: isWalking ? "walkBob 0.5s ease-in-out infinite" : "float 3.2s ease-in-out infinite",
        transformOrigin: "32px 36px",
      }}>

        {/* ── CABEZA (más alta y delgada) ── */}
        <rect x="20" y="5" width="24" height="26" rx="6" fill="#1a1005" stroke={color} strokeWidth="1.2" strokeOpacity="0.7" />

        {/* Visor horizontal (tipo HUD) */}
        <rect x="19" y="13" width="26" height="7" rx="1" fill={color} fillOpacity="0.12" stroke={color} strokeWidth="0.8" strokeOpacity="0.6" />

        {/* Ojos — barras de datos / equalizer */}
        <g style={{ animation: "blink 4.5s ease-in-out infinite", transformOrigin: "32px 16.5px" }}>
          {/* Ojo izquierdo — 3 barras */}
          <rect x="22" y="14" width="2" height={isActive ? 5 : 3} rx="0.5" fill={color} fillOpacity="0.9"
            style={{ animation: isActive ? "dataPulse 0.6s ease-in-out infinite" : "none" }} />
          <rect x="25" y="15" width="2" height={isActive ? 4 : 2} rx="0.5" fill={color} fillOpacity="0.7"
            style={{ animation: isActive ? "dataPulse 0.6s ease-in-out infinite 0.1s" : "none" }} />
          <rect x="28" y="14" width="2" height={isActive ? 5 : 3} rx="0.5" fill={color} fillOpacity="0.9"
            style={{ animation: isActive ? "dataPulse 0.6s ease-in-out infinite 0.2s" : "none" }} />

          {/* Ojo derecho — 3 barras */}
          <rect x="34" y="15" width="2" height={isActive ? 4 : 2} rx="0.5" fill={color} fillOpacity="0.7"
            style={{ animation: isActive ? "dataPulse 0.7s ease-in-out infinite" : "none" }} />
          <rect x="37" y="14" width="2" height={isActive ? 5 : 3} rx="0.5" fill={color} fillOpacity="0.9"
            style={{ animation: isActive ? "dataPulse 0.7s ease-in-out infinite 0.15s" : "none" }} />
          <rect x="40" y="15" width="2" height={isActive ? 3 : 1} rx="0.5" fill={color} fillOpacity="0.6"
            style={{ animation: isActive ? "dataPulse 0.7s ease-in-out infinite 0.3s" : "none" }} />
        </g>

        {/* Nariz/sensor */}
        <circle cx="32" cy="23" r="1.2" fill={color} fillOpacity="0.5" />

        {/* Boca — mini chart */}
        <g>
          <rect x="24" y="26" width="16" height="2.5" rx="0.8" fill="#111" />
          {isActive && (
            <>
              <rect x="25" y="26.5" width="3" height="1.5" rx="0.5" fill={color} fillOpacity="0.7" />
              <rect x="29" y="26" width="2" height="2" rx="0.5" fill={color} fillOpacity="0.9" />
              <rect x="32" y="26.5" width="4" height="1.5" rx="0.5" fill={color} fillOpacity="0.6" />
            </>
          )}
        </g>

        {/* Antenas finas en la cabeza */}
        <line x1="28" y1="5" x2="26" y2="0" stroke={color} strokeWidth="0.8" strokeOpacity="0.6" />
        <circle cx="26" cy="0" r="1.5" fill={color} fillOpacity="0.7"
          style={{ animation: isActive ? "dataPulse 1s ease-in-out infinite" : "none" }} />
        <line x1="36" y1="5" x2="38" y2="0" stroke={color} strokeWidth="0.8" strokeOpacity="0.6" />
        <circle cx="38" cy="0" r="1.5" fill={color} fillOpacity="0.7"
          style={{ animation: isActive ? "dataPulse 1s ease-in-out infinite 0.5s" : "none" }} />

        {/* ── CUELLO ── */}
        <rect x="28" y="31" width="8" height="4" rx="2" fill="#120c00" stroke={color} strokeWidth="0.6" strokeOpacity="0.4" />

        {/* ── TORSO (más esbelto) ── */}
        <rect x="18" y="35" width="28" height="20" rx="4" fill="#1a1005" stroke={color} strokeWidth="1" strokeOpacity="0.5" />

        {/* Holograma en el pecho */}
        {isActive && (
          <g>
            <rect x="23" y="38" width="18" height="12" rx="2" fill={color} fillOpacity="0.05" stroke={color} strokeWidth="0.5" strokeOpacity="0.4" />
            {/* Mini gráfico de barras */}
            <rect x="25" y="44" width="2.5" height="4" rx="0.5" fill={color} fillOpacity="0.5" style={{ animation: "dataPulse 0.9s ease-in-out infinite" }} />
            <rect x="29" y="42" width="2.5" height="6" rx="0.5" fill={color} fillOpacity="0.7" style={{ animation: "dataPulse 0.9s ease-in-out infinite 0.2s" }} />
            <rect x="33" y="43" width="2.5" height="5" rx="0.5" fill={color} fillOpacity="0.6" style={{ animation: "dataPulse 0.9s ease-in-out infinite 0.4s" }} />
            <rect x="37" y="41" width="2.5" height="7" rx="0.5" fill={color} fillOpacity="0.9" style={{ animation: "dataPulse 0.9s ease-in-out infinite 0.6s" }} />
          </g>
        )}

        {/* ── BRAZOS delgados ── */}
        <g style={{
          animation: isWalking ? "walkArmL 0.5s ease-in-out infinite" : "none",
          transformOrigin: "17px 40px",
        }}>
          <rect x="11" y="36" width="7" height="15" rx="3" fill="#1a1005" stroke={color} strokeWidth="0.8" strokeOpacity="0.4" />
          {isTyping ? (
            <g style={{ animation: "typingBounce 0.17s ease-in-out infinite", transformOrigin: "14px 52px" }}>
              <rect x="10" y="50" width="8" height="5" rx="2" fill={color} fillOpacity="0.9" />
              <rect x="11.5" y="52" width="1.5" height="1.5" rx="0.4" fill="#000" opacity="0.5" />
              <rect x="14" y="52" width="1.5" height="1.5" rx="0.4" fill="#000" opacity="0.5" />
            </g>
          ) : (
            <rect x="11" y="51" width="7" height="4" rx="2" fill="#120c00" stroke={color} strokeWidth="0.6" strokeOpacity="0.4" />
          )}
        </g>

        <g style={{
          animation: isWalking ? "walkArmR 0.5s ease-in-out infinite" : "none",
          transformOrigin: "47px 40px",
        }}>
          <rect x="46" y="36" width="7" height="15" rx="3" fill="#1a1005" stroke={color} strokeWidth="0.8" strokeOpacity="0.4" />
          {isTyping ? (
            <g style={{ animation: "typingBounce 0.2s ease-in-out infinite 0.085s", transformOrigin: "50px 52px" }}>
              <rect x="46" y="50" width="8" height="5" rx="2" fill={color} fillOpacity="0.9" />
              <rect x="47.5" y="52" width="1.5" height="1.5" rx="0.4" fill="#000" opacity="0.5" />
              <rect x="50" y="52" width="1.5" height="1.5" rx="0.4" fill="#000" opacity="0.5" />
            </g>
          ) : (
            <rect x="46" y="51" width="7" height="4" rx="2" fill="#120c00" stroke={color} strokeWidth="0.6" strokeOpacity="0.4" />
          )}
        </g>

        {/* ── PIERNAS ── */}
        <g style={{
          animation: isWalking ? "walkLegL 0.5s ease-in-out infinite" : "none",
          transformOrigin: "26px 55px",
        }}>
          <rect x="21" y="55" width="9" height="13" rx="3" fill="#1a1005" stroke={color} strokeWidth="0.8" strokeOpacity="0.4" />
          <rect x="20" y="66" width="11" height="3.5" rx="2" fill={color} fillOpacity="0.5" />
        </g>
        <g style={{
          animation: isWalking ? "walkLegR 0.5s ease-in-out infinite" : "none",
          transformOrigin: "38px 55px",
        }}>
          <rect x="34" y="55" width="9" height="13" rx="3" fill="#1a1005" stroke={color} strokeWidth="0.8" strokeOpacity="0.4" />
          <rect x="33" y="66" width="11" height="3.5" rx="2" fill={color} fillOpacity="0.5" />
        </g>

        {/* ── Animación THINKING ── */}
        {isThinking && (
          <>
            <circle cx="43" cy="9" r="2.5" fill={color} fillOpacity="0.2" stroke={color} strokeWidth="0.8" style={{ animation: "thinkDot1 1.2s ease-in-out infinite" }} />
            <circle cx="49" cy="4" r="3.5" fill={color} fillOpacity="0.15" stroke={color} strokeWidth="0.8" style={{ animation: "thinkDot2 1.2s ease-in-out infinite" }} />
            <circle cx="56" cy="0" r="5" fill={color} fillOpacity="0.15" stroke={color} strokeWidth="1" style={{ animation: "thinkDot3 1.2s ease-in-out infinite" }} />
            <text x="56" y="3" textAnchor="middle" fontSize="6" fill={color} fillOpacity="0.9" fontFamily="monospace">%</text>
          </>
        )}

        {/* ── Animación TALKING ── */}
        {isTalking && (
          <g>
            {[0, 5, 10].map((offset, i) => (
              <rect key={i} x={52 + offset} y="33" width="2.5" height="7" rx="1.2"
                fill={color} fillOpacity="0.7"
                style={{ animation: `talkWave 0.5s ease-in-out infinite ${i * 0.12}s`, transformOrigin: `${53.5 + offset}px 36.5px` }} />
            ))}
          </g>
        )}
      </g>
    </svg>
  );
}

// ─────────────────────────────────────────────
// ZION — Strategy Agent
// Forma: comandante pesado, visor largo, hombros anchos
// Color: rojo/crimson #ff4466
// ─────────────────────────────────────────────
function ZionSprite({ color, animation, status }: Omit<Props, "id" | "isBlinking">) {
  const isTyping = animation === "typing";
  const isThinking = animation === "thinking";
  const isWalking = animation === "walking";
  const isTalking = animation === "talking";
  const isActive = !["idle", "done"].includes(status);

  return (
    <svg viewBox="0 0 64 72" width="64" height="72" xmlns="http://www.w3.org/2000/svg">
      <style>{SPRITE_STYLES}</style>

      <ellipse cx="32" cy="69" rx="13" ry="4" fill="#000" opacity="0.3" />

      <g style={{
        animation: isWalking ? "walkBob 0.6s ease-in-out infinite" : "float 4s ease-in-out infinite",
        transformOrigin: "32px 38px",
      }}>

        {/* ── CABEZA (ancha, angular) ── */}
        <rect x="13" y="6" width="38" height="24" rx="3" fill="#1a0508" stroke={color} strokeWidth="1.5" strokeOpacity="0.7" />

        {/* Visor largo — la firma de Zion */}
        <rect x="12" y="14" width="40" height="9" rx="1.5" fill="#000" stroke={color} strokeWidth="1" strokeOpacity="0.8" />
        {/* Brillo del visor */}
        <rect x="13" y="15" width="38" height="4" rx="1" fill={color} fillOpacity="0.15" />
        {/* Scan line dentro del visor */}
        {isActive && (
          <rect
            x="13" y="15" width="38" height="2"
            fill={color}
            fillOpacity="0.5"
            rx="1"
            style={{
              animation: "scanLine 1.2s linear infinite",
              transformOrigin: "32px 18.5px",
              clipPath: "inset(0 0 0 0 round 1px)",
            }}
          />
        )}

        {/* Pupila/cursor del visor */}
        <rect x="28" y="15.5" width="8" height="5" rx="1" fill={color} fillOpacity="0.6"
          style={{ animation: isActive ? "eyeShift 3s ease-in-out infinite" : "none", transformOrigin: "32px 18px" }} />
        <rect x="30" y="16.5" width="4" height="3" rx="0.8" fill={color} fillOpacity="0.9" />

        {/* Oreja/altavoces laterales */}
        <rect x="8" y="13" width="5" height="12" rx="2" fill="#1a0508" stroke={color} strokeWidth="0.8" strokeOpacity="0.5" />
        <rect x="9" y="15" width="3" height="2" rx="0.5" fill={color} fillOpacity="0.4" />
        <rect x="9" y="18" width="3" height="2" rx="0.5" fill={color} fillOpacity="0.3" />
        <rect x="51" y="13" width="5" height="12" rx="2" fill="#1a0508" stroke={color} strokeWidth="0.8" strokeOpacity="0.5" />
        <rect x="52" y="15" width="3" height="2" rx="0.5" fill={color} fillOpacity="0.4" />
        <rect x="52" y="18" width="3" height="2" rx="0.5" fill={color} fillOpacity="0.3" />

        {/* Indicadores de estado en la frente */}
        <circle cx="17" cy="9" r="1.8" fill={isActive ? color : "#333"} fillOpacity="0.9"
          style={{ animation: isActive ? "dataPulse 0.7s ease-in-out infinite" : "none" }} />
        <circle cx="47" cy="9" r="1.8" fill={isActive ? color : "#333"} fillOpacity="0.9"
          style={{ animation: isActive ? "dataPulse 0.7s ease-in-out infinite 0.35s" : "none" }} />

        {/* Boca — rejilla */}
        <g>
          {[0, 3, 6].map((offset) => (
            <rect key={offset} x={22 + offset * 3} y="25" width="2" height="3.5" rx="0.5" fill={isTalking ? color : "#333"} fillOpacity={isTalking ? "0.8" : "0.5"}
              style={{ animation: isTalking ? `talkWave 0.4s ease-in-out infinite ${offset * 0.08}s` : "none", transformOrigin: `${23 + offset * 3}px 26.75px` }} />
          ))}
        </g>

        {/* ── HOMBROS ANCHOS ── */}
        <rect x="7" y="30" width="16" height="8" rx="3" fill="#1a0508" stroke={color} strokeWidth="1" strokeOpacity="0.6" />
        <rect x="41" y="30" width="16" height="8" rx="3" fill="#1a0508" stroke={color} strokeWidth="1" strokeOpacity="0.6" />

        {/* ── TORSO (ancho) ── */}
        <rect x="13" y="30" width="38" height="22" rx="4" fill="#1a0508" stroke={color} strokeWidth="1.2" strokeOpacity="0.6" />

        {/* Panel táctico en el pecho */}
        <rect x="19" y="34" width="26" height="14" rx="2" fill="#0d0205" stroke={color} strokeWidth="0.8" strokeOpacity="0.4" />
        {isActive ? (
          <g>
            {/* Mini mapa/radar */}
            <circle cx="32" cy="41" r="5" fill="none" stroke={color} strokeWidth="0.5" strokeOpacity="0.4" />
            <circle cx="32" cy="41" r="3" fill="none" stroke={color} strokeWidth="0.4" strokeOpacity="0.3" />
            {/* Línea de radar girando */}
            <line x1="32" y1="41" x2="32" y2="36.5" stroke={color} strokeWidth="1" strokeOpacity="0.7"
              style={{ animation: "radarSpin 2s linear infinite", transformOrigin: "32px 41px" }} />
            {/* Puntos en el radar */}
            <circle cx="34" cy="39" r="1" fill={color} fillOpacity="0.8"
              style={{ animation: "dataPulse 1s ease-in-out infinite" }} />
            <circle cx="29" cy="42" r="0.8" fill={color} fillOpacity="0.6"
              style={{ animation: "dataPulse 1s ease-in-out infinite 0.4s" }} />
          </g>
        ) : (
          <rect x="21" y="36" width="22" height="10" rx="1" fill="#111" />
        )}

        {/* ── BRAZOS PESADOS ── */}
        <g style={{
          animation: isWalking ? "walkArmL 0.6s ease-in-out infinite" : "none",
          transformOrigin: "10px 40px",
        }}>
          <rect x="7" y="38" width="9" height="16" rx="3" fill="#1a0508" stroke={color} strokeWidth="0.8" strokeOpacity="0.5" />
          {isTyping ? (
            <g style={{ animation: "typingBounce 0.16s ease-in-out infinite", transformOrigin: "11px 56px" }}>
              <rect x="6" y="53" width="10" height="6" rx="2.5" fill={color} fillOpacity="0.9" />
              <rect x="7.5" y="55.5" width="2" height="1.5" rx="0.4" fill="#000" opacity="0.5" />
              <rect x="11" y="55.5" width="2" height="1.5" rx="0.4" fill="#000" opacity="0.5" />
            </g>
          ) : (
            <rect x="7" y="54" width="9" height="5" rx="2.5" fill="#110204" stroke={color} strokeWidth="0.8" strokeOpacity="0.5" />
          )}
        </g>

        <g style={{
          animation: isWalking ? "walkArmR 0.6s ease-in-out infinite" : "none",
          transformOrigin: "54px 40px",
        }}>
          <rect x="48" y="38" width="9" height="16" rx="3" fill="#1a0508" stroke={color} strokeWidth="0.8" strokeOpacity="0.5" />
          {isTyping ? (
            <g style={{ animation: "typingBounce 0.2s ease-in-out infinite 0.08s", transformOrigin: "52px 56px" }}>
              <rect x="48" y="53" width="10" height="6" rx="2.5" fill={color} fillOpacity="0.9" />
              <rect x="49.5" y="55.5" width="2" height="1.5" rx="0.4" fill="#000" opacity="0.5" />
              <rect x="53" y="55.5" width="2" height="1.5" rx="0.4" fill="#000" opacity="0.5" />
            </g>
          ) : (
            <rect x="48" y="54" width="9" height="5" rx="2.5" fill="#110204" stroke={color} strokeWidth="0.8" strokeOpacity="0.5" />
          )}
        </g>

        {/* ── PIERNAS ── */}
        <g style={{
          animation: isWalking ? "walkLegL 0.6s ease-in-out infinite" : "none",
          transformOrigin: "24px 52px",
        }}>
          <rect x="17" y="52" width="12" height="14" rx="3" fill="#1a0508" stroke={color} strokeWidth="0.8" strokeOpacity="0.5" />
          <rect x="16" y="64" width="14" height="4.5" rx="2" fill={color} fillOpacity="0.5" />
        </g>
        <g style={{
          animation: isWalking ? "walkLegR 0.6s ease-in-out infinite" : "none",
          transformOrigin: "40px 52px",
        }}>
          <rect x="35" y="52" width="12" height="14" rx="3" fill="#1a0508" stroke={color} strokeWidth="0.8" strokeOpacity="0.5" />
          <rect x="34" y="64" width="14" height="4.5" rx="2" fill={color} fillOpacity="0.5" />
        </g>

        {/* ── Animación THINKING: radar en la cabeza ── */}
        {isThinking && (
          <>
            <circle cx="46" cy="6" r="3" fill={color} fillOpacity="0.2" stroke={color} strokeWidth="0.8" style={{ animation: "thinkDot1 1.2s ease-in-out infinite" }} />
            <circle cx="52" cy="1" r="4" fill={color} fillOpacity="0.15" stroke={color} strokeWidth="0.8" style={{ animation: "thinkDot2 1.2s ease-in-out infinite" }} />
            <circle cx="59" cy="-3" r="5.5" fill={color} fillOpacity="0.12" stroke={color} strokeWidth="1" style={{ animation: "thinkDot3 1.2s ease-in-out infinite" }} />
            <text x="59" y="0" textAnchor="middle" fontSize="6" fill={color} fillOpacity="0.9" fontFamily="monospace">!</text>
          </>
        )}
      </g>
    </svg>
  );
}

// ─────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────
export default function AgentSprite({ id, color, isBlinking, status, animation }: Props) {
  if (id === "lyra") return <LyraSprite color={color} status={status} animation={animation} />;
  if (id === "apex") return <ApexSprite color={color} status={status} animation={animation} />;
  if (id === "vera") return <VeraSprite color={color} status={status} animation={animation} />;
  if (id === "zion") return <ZionSprite color={color} status={status} animation={animation} />;

  // Fallback para agentes futuros — genérico pero animado
  return (
    <svg viewBox="0 0 64 72" width="64" height="72" xmlns="http://www.w3.org/2000/svg">
      <style>{SPRITE_STYLES}</style>
      <ellipse cx="32" cy="68" rx="10" ry="3" fill="#000" opacity="0.2" />
      <g style={{ animation: "float 3s ease-in-out infinite", transformOrigin: "32px 36px" }}>
        <rect x="16" y="10" width="32" height="28" rx="6" fill="#111" stroke={color} strokeWidth="1.2" strokeOpacity="0.7" />
        <g style={{ animation: "blink 4s ease-in-out infinite", transformOrigin: "32px 24px" }}>
          <circle cx="24" cy="24" r="4" fill={color} fillOpacity="0.9" />
          <circle cx="40" cy="24" r="4" fill={color} fillOpacity="0.9" />
          <circle cx="25" cy="23" r="1.5" fill="#fff" fillOpacity="0.4" />
          <circle cx="41" cy="23" r="1.5" fill="#fff" fillOpacity="0.4" />
        </g>
        <rect x="18" y="38" width="28" height="18" rx="3" fill="#111" stroke={color} strokeWidth="1" strokeOpacity="0.5" />
        <rect x="20" y="56" width="10" height="12" rx="3" fill="#111" stroke={color} strokeWidth="0.8" strokeOpacity="0.4" />
        <rect x="34" y="56" width="10" height="12" rx="3" fill="#111" stroke={color} strokeWidth="0.8" strokeOpacity="0.4" />
        {animation === "typing" && (
          <>
            <g style={{ animation: "typingBounce 0.18s ease-in-out infinite", transformOrigin: "12px 48px" }}>
              <rect x="8" y="45" width="8" height="5" rx="2" fill={color} fillOpacity="0.9" />
            </g>
            <g style={{ animation: "typingBounce 0.22s ease-in-out infinite 0.09s", transformOrigin: "52px 48px" }}>
              <rect x="48" y="45" width="8" height="5" rx="2" fill={color} fillOpacity="0.9" />
            </g>
          </>
        )}
      </g>
    </svg>
  );
}