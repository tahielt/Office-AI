"use client";
import React from "react";

import { Agent } from "@/types/agent";
import { STATUS_CONFIG } from "@/lib/agents";
import AgentSprite from "./AgentSprite";

interface Props {
  agents: Agent[];
}

const DESK_POSITIONS: Record<string, { top: string; left: string }> = {
  lyra: { top: "32%", left: "22%" },
  apex: { top: "32%", left: "68%" },
  vera: { top: "72%", left: "22%" },
  zion: { top: "72%", left: "68%" },
};

// ── Escritorio de LYRA — Research Station
// Orbe holográfico, papeles flotantes, estilo laboratorio
function LyraDesk() {
  return (
    <svg width="160" height="90" viewBox="0 0 160 90" xmlns="http://www.w3.org/2000/svg">
      {/* Superficie del escritorio — perspectiva leve */}
      <rect x="8" y="28" width="144" height="54" rx="3" fill="#0d1f2d" stroke="#00f5ff" strokeWidth="0.8" strokeOpacity="0.4"/>
      {/* Frente del escritorio */}
      <rect x="8" y="72" width="144" height="10" rx="2" fill="#071520" stroke="#00f5ff" strokeWidth="0.5" strokeOpacity="0.3"/>
      {/* Patas */}
      <rect x="12" y="80" width="6" height="8" rx="1" fill="#071520" stroke="#00f5ff" strokeWidth="0.4" strokeOpacity="0.3"/>
      <rect x="142" y="80" width="6" height="8" rx="1" fill="#071520" stroke="#00f5ff" strokeWidth="0.4" strokeOpacity="0.3"/>

      {/* Monitor holográfico principal — más ancho, flotando */}
      <rect x="44" y="8" width="72" height="44" rx="4" fill="#020d14" stroke="#00f5ff" strokeWidth="1.2" strokeOpacity="0.7"/>
      {/* Glow del monitor */}
      <rect x="45" y="9" width="70" height="42" rx="3" fill="#00f5ff" fillOpacity="0.04"/>
      {/* Contenido del monitor — líneas de datos */}
      <rect x="49" y="13" width="40" height="1.5" rx="0.8" fill="#00f5ff" fillOpacity="0.7"/>
      <rect x="49" y="17" width="30" height="1.5" rx="0.8" fill="#00f5ff" fillOpacity="0.5"/>
      <rect x="49" y="21" width="50" height="1.5" rx="0.8" fill="#00f5ff" fillOpacity="0.4"/>
      <rect x="49" y="25" width="35" height="1.5" rx="0.8" fill="#00f5ff" fillOpacity="0.6"/>
      <rect x="49" y="29" width="45" height="1.5" rx="0.8" fill="#00f5ff" fillOpacity="0.3"/>
      {/* Gráfico de red de nodos */}
      <circle cx="100" cy="20" r="3" fill="none" stroke="#00f5ff" strokeWidth="0.8" strokeOpacity="0.6"/>
      <circle cx="108" cy="28" r="2" fill="none" stroke="#00f5ff" strokeWidth="0.6" strokeOpacity="0.5"/>
      <line x1="103" y1="20" x2="106" y2="26" stroke="#00f5ff" strokeWidth="0.5" strokeOpacity="0.4"/>
      {/* Cursor parpadeando */}
      <rect x="49" y="33" width="1.5" height="8" rx="0.5" fill="#00f5ff" fillOpacity="0.9">
        <animate attributeName="opacity" values="0.9;0;0.9" dur="1.2s" repeatCount="indefinite"/>
      </rect>
      {/* Base del monitor */}
      <rect x="74" y="50" width="12" height="3" rx="1" fill="#00f5ff" fillOpacity="0.3"/>
      <rect x="77" y="52" width="6" height="4" rx="1" fill="#071520" stroke="#00f5ff" strokeWidth="0.4" strokeOpacity="0.3"/>

      {/* Tablet/panel lateral izquierdo */}
      <rect x="14" y="32" width="26" height="18" rx="2" fill="#020d14" stroke="#00f5ff" strokeWidth="0.8" strokeOpacity="0.5"/>
      <rect x="16" y="34" width="22" height="5" rx="1" fill="#00f5ff" fillOpacity="0.15"/>
      <rect x="16" y="40" width="10" height="1" rx="0.5" fill="#00f5ff" fillOpacity="0.4"/>
      <rect x="16" y="43" width="16" height="1" rx="0.5" fill="#00f5ff" fillOpacity="0.3"/>

      {/* Stack de libros/papers — esquina derecha */}
      <rect x="122" y="40" width="20" height="3" rx="0.5" fill="#1a3a5c" stroke="#00f5ff" strokeWidth="0.4" strokeOpacity="0.4"/>
      <rect x="123" y="37" width="18" height="3" rx="0.5" fill="#0d2840" stroke="#00f5ff" strokeWidth="0.4" strokeOpacity="0.3"/>
      <rect x="121" y="34" width="22" height="3" rx="0.5" fill="#112030" stroke="#00f5ff" strokeWidth="0.4" strokeOpacity="0.3"/>

      {/* LED strip en el borde del escritorio */}
      <rect x="10" y="27" width="140" height="2" rx="1" fill="#00f5ff" fillOpacity="0.15">
        <animate attributeName="fillOpacity" values="0.15;0.35;0.15" dur="2s" repeatCount="indefinite"/>
      </rect>

      {/* Pequeño orbe holográfico flotando */}
      <circle cx="26" cy="22" r="5" fill="none" stroke="#00f5ff" strokeWidth="0.8" strokeOpacity="0.5">
        <animateTransform attributeName="transform" type="translate" values="0,0;0,-3;0,0" dur="3s" repeatCount="indefinite"/>
      </circle>
      <circle cx="26" cy="22" r="2" fill="#00f5ff" fillOpacity="0.3">
        <animateTransform attributeName="transform" type="translate" values="0,0;0,-3;0,0" dur="3s" repeatCount="indefinite"/>
      </circle>
    </svg>
  );
}

// ── Escritorio de APEX — Engineering Workstation
// Doble monitor, teclado mecánico, cables, taza de café
function ApexDesk() {
  return (
    <svg width="160" height="90" viewBox="0 0 160 90" xmlns="http://www.w3.org/2000/svg">
      {/* Superficie */}
      <rect x="6" y="30" width="148" height="52" rx="3" fill="#0a1a0d" stroke="#00ff88" strokeWidth="0.8" strokeOpacity="0.4"/>
      <rect x="6" y="74" width="148" height="9" rx="2" fill="#061009" stroke="#00ff88" strokeWidth="0.5" strokeOpacity="0.3"/>
      <rect x="10" y="81" width="6" height="7" rx="1" fill="#061009" stroke="#00ff88" strokeWidth="0.4" strokeOpacity="0.3"/>
      <rect x="144" y="81" width="6" height="7" rx="1" fill="#061009" stroke="#00ff88" strokeWidth="0.4" strokeOpacity="0.3"/>

      {/* Monitor izquierdo — código */}
      <rect x="10" y="8" width="64" height="44" rx="3" fill="#020a04" stroke="#00ff88" strokeWidth="1" strokeOpacity="0.7"/>
      <rect x="11" y="9" width="62" height="42" rx="2" fill="#00ff88" fillOpacity="0.03"/>
      {/* Líneas de código */}
      <rect x="15" y="13" width="8" height="1.5" rx="0.5" fill="#ff4466" fillOpacity="0.8"/>
      <rect x="25" y="13" width="20" height="1.5" rx="0.5" fill="#00ff88" fillOpacity="0.7"/>
      <rect x="15" y="17" width="4" height="1.5" rx="0.5" fill="#ffaa00" fillOpacity="0.8"/>
      <rect x="21" y="17" width="30" height="1.5" rx="0.5" fill="#00f5ff" fillOpacity="0.6"/>
      <rect x="18" y="21" width="25" height="1.5" rx="0.5" fill="#00ff88" fillOpacity="0.5"/>
      <rect x="15" y="25" width="45" height="1.5" rx="0.5" fill="#00ff88" fillOpacity="0.4"/>
      <rect x="18" y="29" width="20" height="1.5" rx="0.5" fill="#ffaa00" fillOpacity="0.7"/>
      <rect x="15" y="33" width="35" height="1.5" rx="0.5" fill="#00ff88" fillOpacity="0.6"/>
      <rect x="15" y="37" width="8" height="1.5" rx="0.5" fill="#ff4466" fillOpacity="0.8"/>
      <rect x="25" y="37" width="15" height="1.5" rx="0.5" fill="#00ff88" fillOpacity="0.5"/>
      {/* Cursor */}
      <rect x="15" y="41" width="1.5" height="8" rx="0.5" fill="#00ff88" fillOpacity="0.9">
        <animate attributeName="opacity" values="0.9;0;0.9" dur="0.8s" repeatCount="indefinite"/>
      </rect>
      {/* Base monitor izq */}
      <rect x="36" y="51" width="12" height="2" rx="1" fill="#00ff88" fillOpacity="0.2"/>
      <rect x="39" y="52" width="6" height="4" rx="1" fill="#061009" stroke="#00ff88" strokeWidth="0.4" strokeOpacity="0.3"/>

      {/* Monitor derecho — terminal/logs */}
      <rect x="86" y="10" width="66" height="40" rx="3" fill="#020a04" stroke="#00ff88" strokeWidth="1" strokeOpacity="0.6"/>
      <rect x="87" y="11" width="64" height="38" rx="2" fill="#00ff88" fillOpacity="0.02"/>
      {/* Texto de terminal */}
      <rect x="91" y="15" width="12" height="1.5" rx="0.5" fill="#00ff88" fillOpacity="0.9"/>
      <rect x="91" y="19" width="50" height="1.5" rx="0.5" fill="#00ff88" fillOpacity="0.5"/>
      <rect x="91" y="23" width="38" height="1.5" rx="0.5" fill="#ffaa00" fillOpacity="0.7"/>
      <rect x="91" y="27" width="44" height="1.5" rx="0.5" fill="#00ff88" fillOpacity="0.4"/>
      <rect x="91" y="31" width="30" height="1.5" rx="0.5" fill="#00f5ff" fillOpacity="0.5"/>
      <rect x="91" y="35" width="55" height="1.5" rx="0.5" fill="#00ff88" fillOpacity="0.3"/>
      <rect x="91" y="39" width="20" height="1.5" rx="0.5" fill="#00ff88" fillOpacity="0.6"/>
      {/* Base monitor der */}
      <rect x="112" y="49" width="12" height="2" rx="1" fill="#00ff88" fillOpacity="0.2"/>
      <rect x="115" y="50" width="6" height="5" rx="1" fill="#061009" stroke="#00ff88" strokeWidth="0.4" strokeOpacity="0.3"/>

      {/* Teclado mecánico */}
      <rect x="28" y="58" width="72" height="10" rx="2" fill="#0a1a0d" stroke="#00ff88" strokeWidth="0.8" strokeOpacity="0.4"/>
      {[0,1,2,3,4,5,6,7,8,9,10,11].map(i => (
        <rect key={i} x={30 + i * 5.8} y="60" width="4.5" height="3" rx="0.8" fill="#00ff88" fillOpacity="0.12" stroke="#00ff88" strokeWidth="0.3" strokeOpacity="0.4"/>
      ))}
      {[0,1,2,3,4,5,6,7,8,9].map(i => (
        <rect key={i} x={32 + i * 5.8} y="65" width="4.5" height="2.5" rx="0.8" fill="#00ff88" fillOpacity="0.1" stroke="#00ff88" strokeWidth="0.3" strokeOpacity="0.3"/>
      ))}

      {/* Taza de café */}
      <rect x="136" y="46" width="14" height="16" rx="2" fill="#fff" stroke="#ccc" strokeWidth="0.6"/>
      <path d="M150 50 Q155 50 155 54 Q155 58 150 58" fill="none" stroke="#ccc" strokeWidth="1"/>
      <rect x="138" y="48" width="10" height="4" rx="1" fill="#6b3a2a" fillOpacity="0.8"/>
      {/* Vapor */}
      <path d="M141 44 Q141 41 142 39 Q143 37 142 35" fill="none" stroke="#888" strokeWidth="0.7" strokeOpacity="0.4">
        <animate attributeName="strokeOpacity" values="0.4;0.1;0.4" dur="2s" repeatCount="indefinite"/>
      </path>
      <path d="M145 44 Q145 41 146 39" fill="none" stroke="#888" strokeWidth="0.7" strokeOpacity="0.3">
        <animate attributeName="strokeOpacity" values="0.3;0.1;0.3" dur="2s" begin="0.5s" repeatCount="indefinite"/>
      </path>

      {/* LED strip */}
      <rect x="8" y="29" width="144" height="2" rx="1" fill="#00ff88" fillOpacity="0.12">
        <animate attributeName="fillOpacity" values="0.12;0.28;0.12" dur="1.8s" repeatCount="indefinite"/>
      </rect>

      {/* Cable USB colgando */}
      <path d="M78 68 Q80 75 76 80" fill="none" stroke="#333" strokeWidth="1.5" strokeOpacity="0.6"/>
    </svg>
  );
}

// ── Escritorio de VERA — Analytics Station
// Dashboard grande, gráficos, tableta, papeles con datos
function VeraDesk() {
  return (
    <svg width="160" height="90" viewBox="0 0 160 90" xmlns="http://www.w3.org/2000/svg">
      {/* Superficie — tono cálido oscuro */}
      <rect x="8" y="28" width="144" height="54" rx="3" fill="#1a1005" stroke="#ffaa00" strokeWidth="0.8" strokeOpacity="0.4"/>
      <rect x="8" y="73" width="144" height="9" rx="2" fill="#120c00" stroke="#ffaa00" strokeWidth="0.5" strokeOpacity="0.3"/>
      <rect x="12" y="80" width="6" height="8" rx="1" fill="#120c00" stroke="#ffaa00" strokeWidth="0.4" strokeOpacity="0.3"/>
      <rect x="142" y="80" width="6" height="8" rx="1" fill="#120c00" stroke="#ffaa00" strokeWidth="0.4" strokeOpacity="0.3"/>

      {/* Monitor principal — dashboard ancho */}
      <rect x="34" y="6" width="92" height="46" rx="4" fill="#0d0800" stroke="#ffaa00" strokeWidth="1.2" strokeOpacity="0.7"/>
      <rect x="35" y="7" width="90" height="44" rx="3" fill="#ffaa00" fillOpacity="0.03"/>

      {/* Header del dashboard */}
      <rect x="38" y="10" width="84" height="6" rx="1" fill="#ffaa00" fillOpacity="0.1" stroke="#ffaa00" strokeWidth="0.3" strokeOpacity="0.3"/>
      <rect x="40" y="12" width="30" height="2" rx="1" fill="#ffaa00" fillOpacity="0.6"/>
      <circle cx="112" cy="13" r="2" fill="#00ff88" fillOpacity="0.8">
        <animate attributeName="fillOpacity" values="0.8;0.3;0.8" dur="1.5s" repeatCount="indefinite"/>
      </circle>

      {/* Gráfico de barras */}
      <rect x="38" y="20" width="40" height="26" rx="1" fill="#ffaa00" fillOpacity="0.04" stroke="#ffaa00" strokeWidth="0.3" strokeOpacity="0.2"/>
      {[0,1,2,3,4,5].map((i) => {
        const heights = [10, 16, 8, 20, 14, 18];
        const h = heights[i];
        return <rect key={i} x={40 + i * 6} y={44 - h} width="4" height={h} rx="0.8" fill="#ffaa00" fillOpacity={0.4 + i * 0.08}/>;
      })}
      {/* Línea de tendencia */}
      <polyline points="42,34 48,28 54,36 60,24 66,30 72,26" fill="none" stroke="#00f5ff" strokeWidth="0.8" strokeOpacity="0.7"/>
      <circle cx="72" cy="26" r="1.5" fill="#00f5ff" fillOpacity="0.9"/>

      {/* Métricas — lado derecho del monitor */}
      <rect x="84" y="20" width="38" height="8" rx="1" fill="#ffaa00" fillOpacity="0.08" stroke="#ffaa00" strokeWidth="0.3" strokeOpacity="0.2"/>
      <rect x="87" y="22" width="14" height="1.5" rx="0.5" fill="#ffaa00" fillOpacity="0.5"/>
      <rect x="104" y="22" width="14" height="1.5" rx="0.5" fill="#00ff88" fillOpacity="0.7"/>

      <rect x="84" y="31" width="38" height="8" rx="1" fill="#ffaa00" fillOpacity="0.06" stroke="#ffaa00" strokeWidth="0.3" strokeOpacity="0.2"/>
      <rect x="87" y="33" width="10" height="1.5" rx="0.5" fill="#ffaa00" fillOpacity="0.4"/>
      <rect x="104" y="33" width="18" height="1.5" rx="0.5" fill="#ff4466" fillOpacity="0.7"/>

      <rect x="84" y="40" width="38" height="6" rx="1" fill="#ffaa00" fillOpacity="0.05" stroke="#ffaa00" strokeWidth="0.3" strokeOpacity="0.2"/>
      <rect x="87" y="42" width="20" height="1.5" rx="0.5" fill="#ffaa00" fillOpacity="0.3"/>

      {/* Pie chart pequeño */}
      <circle cx="118" cy="43" r="6" fill="none" stroke="#ffaa00" strokeWidth="5" strokeDasharray="19 19" strokeDashoffset="0" strokeOpacity="0.5"/>
      <circle cx="118" cy="43" r="6" fill="none" stroke="#00ff88" strokeWidth="5" strokeDasharray="10 28" strokeDashoffset="-19" strokeOpacity="0.7"/>

      {/* Base monitor */}
      <rect x="74" y="51" width="12" height="3" rx="1" fill="#ffaa00" fillOpacity="0.2"/>
      <rect x="77" y="53" width="6" height="4" rx="1" fill="#120c00" stroke="#ffaa00" strokeWidth="0.4" strokeOpacity="0.3"/>

      {/* Tableta con datos — izquierda */}
      <rect x="12" y="34" width="18" height="26" rx="2" fill="#0d0800" stroke="#ffaa00" strokeWidth="0.8" strokeOpacity="0.5"/>
      <rect x="14" y="36" width="14" height="10" rx="1" fill="#ffaa00" fillOpacity="0.1"/>
      {[0,1,2,3].map(i => (
        <rect key={i} x="14" y={48 + i * 3} width={8 + i * 2} height="1.5" rx="0.5" fill="#ffaa00" fillOpacity={0.3 + i * 0.1}/>
      ))}

      {/* Papers con datos — derecha */}
      <rect x="132" y="36" width="18" height="22" rx="1" fill="#f5f0e8" stroke="#ccc" strokeWidth="0.5"/>
      <rect x="134" y="38" width="14" height="1" rx="0.5" fill="#333" fillOpacity="0.4"/>
      <rect x="134" y="41" width="10" height="1" rx="0.5" fill="#333" fillOpacity="0.3"/>
      {[0,1,2,3].map(i => (
        <rect key={i} x="134" y={44 + i * 3} width={6 + i} height="2" rx="0.3" fill="#ffaa00" fillOpacity={0.3 + i * 0.1}/>
      ))}
      {/* Paper debajo */}
      <rect x="130" y="38" width="18" height="22" rx="1" fill="#ede8e0" stroke="#bbb" strokeWidth="0.4"/>

      {/* LED strip */}
      <rect x="10" y="27" width="140" height="2" rx="1" fill="#ffaa00" fillOpacity="0.13">
        <animate attributeName="fillOpacity" values="0.13;0.3;0.13" dur="2.5s" repeatCount="indefinite"/>
      </rect>
    </svg>
  );
}

// ── Escritorio de ZION — Strategy Command Post
// Monitor curvo panorámico, mapa táctico, chess board
function ZionDesk() {
  return (
    <svg width="160" height="90" viewBox="0 0 160 90" xmlns="http://www.w3.org/2000/svg">
      {/* Superficie — muy oscura, presencia */}
      <rect x="4" y="26" width="152" height="56" rx="3" fill="#110208" stroke="#ff4466" strokeWidth="1" strokeOpacity="0.5"/>
      <rect x="4" y="73" width="152" height="9" rx="2" fill="#0a0105" stroke="#ff4466" strokeWidth="0.5" strokeOpacity="0.3"/>
      <rect x="8" y="80" width="7" height="8" rx="1" fill="#0a0105" stroke="#ff4466" strokeWidth="0.4" strokeOpacity="0.3"/>
      <rect x="145" y="80" width="7" height="8" rx="1" fill="#0a0105" stroke="#ff4466" strokeWidth="0.4" strokeOpacity="0.3"/>

      {/* Monitor ultra-wide panorámico */}
      <rect x="14" y="4" width="132" height="44" rx="5" fill="#060003" stroke="#ff4466" strokeWidth="1.5" strokeOpacity="0.8"/>
      {/* Curvatura sutil del borde */}
      <rect x="15" y="5" width="130" height="42" rx="4" fill="#ff4466" fillOpacity="0.02"/>

      {/* Mapa táctico — fondo */}
      <rect x="18" y="8" width="80" height="34" rx="2" fill="#0d0108" stroke="#ff4466" strokeWidth="0.4" strokeOpacity="0.3"/>
      {/* Grid del mapa */}
      {[0,1,2,3,4,5,6,7].map(i => (
        <line key={`v${i}`} x1={18 + i * 10} y1="8" x2={18 + i * 10} y2="42" stroke="#ff4466" strokeWidth="0.2" strokeOpacity="0.2"/>
      ))}
      {[0,1,2,3].map(i => (
        <line key={`h${i}`} x1="18" y1={8 + i * 8} x2="98" y2={8 + i * 8} stroke="#ff4466" strokeWidth="0.2" strokeOpacity="0.2"/>
      ))}
      {/* Zonas del mapa */}
      <rect x="22" y="12" width="20" height="12" rx="1" fill="#ff4466" fillOpacity="0.12" stroke="#ff4466" strokeWidth="0.5" strokeOpacity="0.4"/>
      <rect x="55" y="18" width="16" height="10" rx="1" fill="#00f5ff" fillOpacity="0.1" stroke="#00f5ff" strokeWidth="0.5" strokeOpacity="0.4"/>
      <rect x="75" y="10" width="14" height="10" rx="1" fill="#ffaa00" fillOpacity="0.1" stroke="#ffaa00" strokeWidth="0.5" strokeOpacity="0.4"/>
      {/* Puntos en el mapa */}
      <circle cx="30" cy="18" r="2.5" fill="#ff4466" fillOpacity="0.9">
        <animate attributeName="r" values="2.5;3.5;2.5" dur="2s" repeatCount="indefinite"/>
        <animate attributeName="fillOpacity" values="0.9;0.5;0.9" dur="2s" repeatCount="indefinite"/>
      </circle>
      <circle cx="62" cy="22" r="2" fill="#00f5ff" fillOpacity="0.8"/>
      <circle cx="82" cy="15" r="1.5" fill="#ffaa00" fillOpacity="0.8"/>
      {/* Líneas de conexión en el mapa */}
      <line x1="30" y1="18" x2="62" y2="22" stroke="#ff4466" strokeWidth="0.6" strokeOpacity="0.4" strokeDasharray="2 2"/>
      <line x1="62" y1="22" x2="82" y2="15" stroke="#ff4466" strokeWidth="0.6" strokeOpacity="0.3" strokeDasharray="2 2"/>
      {/* Label LATAM */}
      <rect x="20" y="28" width="14" height="5" rx="1" fill="#ff4466" fillOpacity="0.2"/>
      <rect x="22" y="29" width="10" height="1.5" rx="0.5" fill="#ff4466" fillOpacity="0.8"/>
      {/* Label APAC */}
      <rect x="74" y="22" width="14" height="5" rx="1" fill="#ffaa00" fillOpacity="0.15"/>
      <rect x="76" y="23" width="10" height="1.5" rx="0.5" fill="#ffaa00" fillOpacity="0.7"/>

      {/* Panel de métricas — derecha del monitor */}
      <rect x="103" y="8" width="38" height="34" rx="2" fill="#0d0108" stroke="#ff4466" strokeWidth="0.5" strokeOpacity="0.3"/>
      {/* KPIs */}
      {[
        { label: "ROI", value: "+42%", color: "#00ff88" },
        { label: "TAM", value: "$4.2B", color: "#ff4466" },
        { label: "NPV", value: "$2.8M", color: "#ffaa00" },
        { label: "IRR", value: "18.4%", color: "#00f5ff" },
      ].map((kpi, i) => (
        <g key={i}>
          <rect x="106" y={10 + i * 8} width="32" height="6" rx="1" fill={kpi.color} fillOpacity="0.06" stroke={kpi.color} strokeWidth="0.3" strokeOpacity="0.3"/>
          <rect x="108" y={12 + i * 8} width="8" height="1.5" rx="0.5" fill={kpi.color} fillOpacity="0.5"/>
          <rect x="122" y={12 + i * 8} width="12" height="1.5" rx="0.5" fill={kpi.color} fillOpacity="0.9"/>
        </g>
      ))}

      {/* Base monitor */}
      <rect x="74" y="47" width="12" height="3" rx="1" fill="#ff4466" fillOpacity="0.2"/>
      <rect x="77" y="49" width="6" height="5" rx="1" fill="#0a0105" stroke="#ff4466" strokeWidth="0.4" strokeOpacity="0.3"/>

      {/* Tablero de ajedrez táctico — izq escritorio */}
      <rect x="10" y="37" width="26" height="26" rx="1" fill="#0d0108" stroke="#ff4466" strokeWidth="0.6" strokeOpacity="0.4"/>
      {[0,1,2,3].map(row => [0,1,2,3].map(col => (
        (row + col) % 2 === 0 &&
        <rect key={`${row}-${col}`} x={11 + col * 6} y={38 + row * 6} width="6" height="6" fill="#ff4466" fillOpacity="0.12"/>
      )))}
      {/* Piezas */}
      <circle cx="20" cy="44" r="2.5" fill="#ff4466" fillOpacity="0.8"/>
      <rect x="27" y="42" width="3" height="5" rx="0.5" fill="#ff4466" fillOpacity="0.6"/>
      <circle cx="14" cy="56" r="2" fill="#888" fillOpacity="0.6"/>
      <rect x="21" y="54" width="3" height="5" rx="0.5" fill="#888" fillOpacity="0.5"/>

      {/* Café negro */}
      <rect x="138" y="42" width="14" height="17" rx="2" fill="#111" stroke="#333" strokeWidth="0.6"/>
      <rect x="140" y="44" width="10" height="5" rx="1" fill="#1a0a00" fillOpacity="0.9"/>
      <path d="M152 46 Q157 46 157 50 Q157 54 152 54" fill="none" stroke="#333" strokeWidth="1"/>

      {/* LED strip */}
      <rect x="6" y="25" width="148" height="2" rx="1" fill="#ff4466" fillOpacity="0.15">
        <animate attributeName="fillOpacity" values="0.15;0.4;0.15" dur="3s" repeatCount="indefinite"/>
      </rect>

      {/* Scan line sutil en el monitor */}
      <rect x="14" y="4" width="132" height="2" rx="1" fill="#ff4466" fillOpacity="0.3">
        <animateTransform attributeName="transform" type="translate" values="0,0;0,40;0,0" dur="4s" repeatCount="indefinite"/>
        <animate attributeName="fillOpacity" values="0.3;0.1;0.3" dur="4s" repeatCount="indefinite"/>
      </rect>
    </svg>
  );
}

// ── Componente del board principal
export default function JRPGBoard({ agents }: Props) {
  const deskComponents: Record<string, React.ReactNode> = {
    lyra: <LyraDesk />,
    apex: <ApexDesk />,
    vera: <VeraDesk />,
    zion: <ZionDesk />,
  };

  return (
    <div className="flex-1 w-full relative overflow-hidden flex items-center justify-center"
      style={{ background: "linear-gradient(180deg, #0a0a0f 0%, #0d0d14 100%)" }}>

      {/* Vignette exterior */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ boxShadow: "inset 0 0 80px rgba(0,0,0,0.7)" }} />

      <div
        className="relative rounded-lg overflow-hidden"
        style={{
          width: "min(900px, 100%)",
          aspectRatio: "16/10",
          background: "#0d0d14",
          border: "1px solid rgba(255,255,255,0.06)",
          boxShadow: "0 0 0 1px rgba(255,255,255,0.03), 0 40px 80px rgba(0,0,0,0.8)",
        }}
      >
        {/* ── PISO con perspectiva — grid isométrico fake ── */}
        <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 900 560" xmlns="http://www.w3.org/2000/svg">
          {/* Piso base */}
          <rect width="900" height="560" fill="#0d0d14"/>

          {/* Tiles del piso — grid perspectivado */}
          <defs>
            <pattern id="floorTile" x="0" y="0" width="64" height="64" patternUnits="userSpaceOnUse">
              <rect width="64" height="64" fill="#0f0f18" stroke="#1a1a28" strokeWidth="0.5"/>
              <rect x="1" y="1" width="62" height="62" fill="none" stroke="#ffffff" strokeWidth="0.1" strokeOpacity="0.03"/>
            </pattern>
            {/* Glow para zonas de escritorio */}
            <radialGradient id="deskGlowCyan" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#00f5ff" stopOpacity="0.06"/>
              <stop offset="100%" stopColor="#00f5ff" stopOpacity="0"/>
            </radialGradient>
            <radialGradient id="deskGlowGreen" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#00ff88" stopOpacity="0.05"/>
              <stop offset="100%" stopColor="#00ff88" stopOpacity="0"/>
            </radialGradient>
            <radialGradient id="deskGlowAmber" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffaa00" stopOpacity="0.05"/>
              <stop offset="100%" stopColor="#ffaa00" stopOpacity="0"/>
            </radialGradient>
            <radialGradient id="deskGlowRed" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ff4466" stopOpacity="0.06"/>
              <stop offset="100%" stopColor="#ff4466" stopOpacity="0"/>
            </radialGradient>
            <radialGradient id="ambientLight" cx="50%" cy="30%" r="60%">
              <stop offset="0%" stopColor="#1a1a2e" stopOpacity="1"/>
              <stop offset="100%" stopColor="#0d0d14" stopOpacity="1"/>
            </radialGradient>
          </defs>

          <rect width="900" height="560" fill="url(#ambientLight)"/>
          <rect width="900" height="560" fill="url(#floorTile)"/>

          {/* Glows de ambiente por zona de escritorio */}
          <ellipse cx="198" cy="290" rx="140" ry="100" fill="url(#deskGlowCyan)"/>
          <ellipse cx="612" cy="290" rx="140" ry="100" fill="url(#deskGlowGreen)"/>
          <ellipse cx="198" cy="470" rx="140" ry="100" fill="url(#deskGlowAmber)"/>
          <ellipse cx="612" cy="470" rx="140" ry="100" fill="url(#deskGlowRed)"/>

          {/* Líneas de luz en el suelo — estilo tron */}
          <line x1="0" y1="200" x2="900" y2="200" stroke="#ffffff" strokeWidth="0.3" strokeOpacity="0.04"/>
          <line x1="0" y1="380" x2="900" y2="380" stroke="#ffffff" strokeWidth="0.3" strokeOpacity="0.04"/>
          <line x1="405" y1="0" x2="405" y2="560" stroke="#ffffff" strokeWidth="0.3" strokeOpacity="0.04"/>

          {/* Paredes laterales — sensación de habitación */}
          <rect x="0" y="0" width="900" height="40" fill="#08080f" stroke="none"/>
          <rect x="0" y="0" width="900" height="2" fill="#ffffff" fillOpacity="0.04"/>

          {/* Paneles de pared con detalle */}
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map(i => (
            <rect key={i} x={i * 64} y="0" width="60" height="38" rx="1"
              fill="#0a0a12" stroke="#1e1e2e" strokeWidth="0.5"/>
          ))}

          {/* Server Room Door — más elaborada */}
          <rect x="376" y="0" width="148" height="38" rx="2" fill="#0f0f1e" stroke="#4444aa" strokeWidth="1" strokeOpacity="0.6"/>
          <rect x="378" y="2" width="144" height="34" rx="1" fill="#4444aa" fillOpacity="0.06"/>
          <line x1="450" y1="2" x2="450" y2="36" stroke="#4444aa" strokeWidth="0.5" strokeOpacity="0.4"/>
          {/* Luces de la puerta */}
          <circle cx="392" cy="20" r="2" fill="#4444aa" fillOpacity="0.8">
            <animate attributeName="fillOpacity" values="0.8;0.3;0.8" dur="3s" repeatCount="indefinite"/>
          </circle>
          <circle cx="508" cy="20" r="2" fill="#4444aa" fillOpacity="0.8">
            <animate attributeName="fillOpacity" values="0.8;0.3;0.8" dur="3s" begin="1.5s" repeatCount="indefinite"/>
          </circle>

          {/* Decoración pared izquierda — bookshelf pixel art */}
          <rect x="18" y="5" width="40" height="32" rx="1" fill="#0f0f1e" stroke="#2a2a3a" strokeWidth="0.5"/>
          {["#c0392b","#2980b9","#27ae60","#f39c12","#8e44ad","#16a085"].map((c, i) => (
            <rect key={i} x={20 + i * 6} y="10" width="4" height={14 + (i % 3) * 4} rx="0.5" fill={c} fillOpacity="0.7"/>
          ))}

          {/* Decoración pared derecha — planta */}
          <rect x="842" y="5" width="48" height="32" rx="1" fill="#0f0f1e" stroke="#2a2a3a" strokeWidth="0.5"/>
          <rect x="860" y="26" width="12" height="10" rx="1" fill="#4a2800" stroke="#3a2000" strokeWidth="0.5"/>
          <ellipse cx="866" cy="22" rx="12" ry="10" fill="#1a4a1a" fillOpacity="0.8"/>
          <ellipse cx="860" cy="20" rx="8" ry="7" fill="#1e5a1e" fillOpacity="0.7"/>
          <ellipse cx="872" cy="19" rx="7" ry="6" fill="#166016" fillOpacity="0.7"/>

          {/* Cables en el techo */}
          <path d="M0 40 Q200 50 450 40 Q650 30 900 40" fill="none" stroke="#1a1a2e" strokeWidth="1"/>

          {/* Ventiladores en el techo — esquinas */}
          <circle cx="80" cy="20" r="12" fill="none" stroke="#1a1a28" strokeWidth="0.5"/>
          <circle cx="80" cy="20" r="3" fill="#1a1a28"/>
          <line x1="80" y1="8" x2="80" y2="32" stroke="#1a1a28" strokeWidth="0.5"/>
          <line x1="68" y1="20" x2="92" y2="20" stroke="#1a1a28" strokeWidth="0.5"/>

          <circle cx="820" cy="20" r="12" fill="none" stroke="#1a1a28" strokeWidth="0.5"/>
          <circle cx="820" cy="20" r="3" fill="#1a1a28"/>
          <line x1="820" y1="8" x2="820" y2="32" stroke="#1a1a28" strokeWidth="0.5"/>
          <line x1="808" y1="20" x2="832" y2="20" stroke="#1a1a28" strokeWidth="0.5"/>
        </svg>

        {/* ── SERVER ROOM DOOR label ── */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10"
          style={{ top: "6px" }}>
          <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"/>
          <span className="text-[9px] font-mono tracking-[0.3em] text-indigo-400/60">SERVER ROOM</span>
          <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" style={{ animationDelay: "0.5s" }}/>
        </div>

        {/* ── ESCRITORIOS + AGENTES juntos en mismo anchor point ── */}
        {agents.map((agent) => {
          const pos = DESK_POSITIONS[agent.id] || { top: "50%", left: "50%" };

          // Cuando está convocado, el agente se separa del escritorio
          const isSummoned = agent.isSummoned;
          const summonedOffsets: Record<string, string> = { lyra: "34%", apex: "44%", vera: "54%", zion: "64%" };

          const agentLeft = isSummoned ? summonedOffsets[agent.id] || "50%" : pos.left;
          const agentTop  = isSummoned ? "14%" : pos.top;

          const statusInfo = STATUS_CONFIG[agent.status] || STATUS_CONFIG.idle;
          const isActive = agent.status !== "idle" && agent.status !== "done";

          return (
            <React.Fragment key={agent.id}>
              {/* Escritorio — anclado fijo */}
              <div
                className="absolute pointer-events-none"
                style={{
                  top: pos.top,
                  left: pos.left,
                  transform: "translate(-50%, -50%)",
                  zIndex: 10,
                }}
              >
                {/* El agente se posiciona encima del borde superior del escritorio */}
                {/* Escritorio SVG */}
                <div className="relative">
                  {deskComponents[agent.id]}
                </div>
                {/* Label */}
                <div
                  className="text-center mt-1 text-[9px] font-mono tracking-[0.2em] px-2 py-0.5 rounded-sm"
                  style={{
                    color: "rgba(255,255,255,0.2)",
                    background: "rgba(0,0,0,0.5)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  {agent.name} DESK
                </div>
              </div>

              {/* Agente — se mueve cuando es convocado */}
              <div
                className="absolute flex flex-col items-center transition-all duration-[1200ms] ease-in-out"
                style={{
                  top: agentTop,
                  left: agentLeft,
                  // -50% horizontal + sube exactamente lo suficiente para quedar
                  // parado detrás del borde superior del escritorio (que tiene ~90px de alto)
                  // El escritorio está centrado en pos.top, su borde superior = pos.top - 45px
                  // El sprite es 64px alto, queremos que sus pies toquen ese borde superior
                  // Escritorio: 90px alto, centrado en pos.top = borde superior a -45px del anchor
                  // Sprite: 64px, queremos pies en ese borde superior => subir 64+45=109px = ~-170%
                  transform: isSummoned ? "translate(-50%, -100%)" : "translate(-50%, -170%)",
                  zIndex: 30,
                }}
              >
              {/* Speech bubble */}
              {isActive && (
                <div
                  className="absolute font-mono text-[9px] px-2 py-1 rounded whitespace-nowrap"
                  style={{
                    top: "-38px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: "#0a0a0f",
                    border: `1px solid ${statusInfo.color}`,
                    color: statusInfo.color,
                    boxShadow: `0 0 8px ${statusInfo.color}40`,
                    letterSpacing: "0.15em",
                    zIndex: 40,
                  }}
                >
                  {statusInfo.label}
                  {/* Tail */}
                  <div
                    className="absolute w-2 h-2 rotate-45"
                    style={{
                      bottom: "-5px",
                      left: "50%",
                      transform: "translateX(-50%) rotate(45deg)",
                      background: "#0a0a0f",
                      borderRight: `1px solid ${statusInfo.color}`,
                      borderBottom: `1px solid ${statusInfo.color}`,
                    }}
                  />
                </div>
              )}

              {/* Sprite del agente */}
              <div className="w-16 h-16 relative" style={{ filter: `drop-shadow(0 0 6px ${agent.color}50)` }}>
                <AgentSprite
                  id={agent.id}
                  color={agent.color}
                  isBlinking={true}
                  status={agent.status}
                  animation={agent.animation}
                />
              </div>

              {/* Name tag cuando está convocado */}
              {agent.isSummoned && (
                <div
                  className="mt-1 text-[9px] font-mono tracking-widest px-2 py-0.5 rounded-sm"
                  style={{
                    background: "rgba(0,0,0,0.85)",
                    border: `1px solid ${agent.color}60`,
                    color: agent.color,
                    zIndex: 40,
                  }}
                >
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