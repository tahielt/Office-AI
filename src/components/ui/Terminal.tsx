"use client";
import { Agent } from "@/types/agent";
import { Terminal as TerminalIcon, Send, ChevronUp, ChevronDown, Maximize2, Minimize2 } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";

interface Props {
  agents: Agent[];
  teamModeEnabled: boolean;
  onCommand: (cmd: string) => void;
}

const MIN_HEIGHT = 48;   // colapsado — solo header
const DEFAULT_HEIGHT = 220;
const MAX_HEIGHT = 520;

function shouldDisplayLog(text: string, type: "system" | "communication" | "command") {
  if (type === "command") return true;
  if (type === "system") {
    return !/^Squad activo:/i.test(text) && !/fuentes verificadas/i.test(text);
  }
  return true;
}

function compactLogText(text: string, type: "system" | "communication" | "command") {
  if (type === "command") return text;

  const normalized = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^(Resumen ejecutivo|Hallazgos clave|Oportunidades|Riesgos|Fuentes|Pasos|Chequeos|Prioridades|Borrador base|Salida sugerida)$/i.test(line));

  const joined = normalized
    .slice(0, type === "system" ? 1 : 2)
    .join(" · ")
    .replace(/^-+\s*/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const max = type === "system" ? 90 : 180;
  return joined.length <= max ? joined : `${joined.slice(0, max - 1).trim()}…`;
}

export default function Terminal({ agents, teamModeEnabled, onCommand }: Props) {
  const [input, setInput] = useState("");
  const [height, setHeight] = useState(DEFAULT_HEIGHT);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(0);
  const dragStartHeight = useRef(0);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const engagedAgents = agents.filter((agent) => agent.status !== "idle" && agent.status !== "done");
  const allLogs = agents
    .flatMap((agent) =>
      agent.log.map((log) => ({
        ...log,
        agentName: agent.name,
        agentColor: agent.color,
      }))
    )
    .filter((log): log is typeof log & { type: "system" | "communication" | "command" } => log.type !== "thought")
    .filter((log) => shouldDisplayLog(log.text, log.type))
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
    .slice(-12);

  useEffect(() => {
    if (endRef.current && !isCollapsed) {
      endRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [allLogs, isCollapsed]);

  // ── Drag to resize ──
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragStartY.current = e.clientY;
    dragStartHeight.current = height;
    setIsDragging(true);
  }, [height]);

  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e: MouseEvent) => {
      const delta = dragStartY.current - e.clientY;
      const newHeight = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, dragStartHeight.current + delta));
      setHeight(newHeight);
      if (newHeight <= MIN_HEIGHT + 10) setIsCollapsed(true);
      else setIsCollapsed(false);
    };
    const onUp = () => setIsDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [isDragging]);

  const toggleCollapse = () => {
    if (isMaximized) {
      setIsMaximized(false);
      setHeight(DEFAULT_HEIGHT);
      setIsCollapsed(false);
    } else if (isCollapsed) {
      setIsCollapsed(false);
      setHeight(DEFAULT_HEIGHT);
    } else {
      setIsCollapsed(true);
      setHeight(MIN_HEIGHT);
    }
  };

  const toggleMaximize = () => {
    if (isMaximized) {
      setIsMaximized(false);
      setHeight(DEFAULT_HEIGHT);
      setIsCollapsed(false);
    } else {
      setIsMaximized(true);
      setHeight(MAX_HEIGHT);
      setIsCollapsed(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    onCommand(input);
    setInput("");
    inputRef.current?.focus();
  };

  const currentHeight = isMaximized ? MAX_HEIGHT : isCollapsed ? MIN_HEIGHT : height;

  return (
    <div
      className="w-full flex flex-col relative"
      style={{
        height: `${currentHeight}px`,
        transition: isDragging ? "none" : "height 0.2s ease",
        background: "#080810",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: "6px",
        overflow: "hidden",
      }}
    >
      {/* ── Drag Handle ── */}
      <div
        onMouseDown={onMouseDown}
        className="absolute top-0 left-0 right-0 h-1 z-50 group"
        style={{ cursor: "ns-resize" }}
      >
        <div
          className="w-full h-full group-hover:opacity-100 transition-opacity"
          style={{
            opacity: isDragging ? 1 : 0,
            background: "linear-gradient(90deg, transparent, #00f5ff60, transparent)",
          }}
        />
      </div>

      {/* ── Header ── */}
      <div
        className="flex items-center justify-between px-4 shrink-0"
        style={{
          height: "36px",
          background: "#0d0d18",
          borderBottom: isCollapsed ? "none" : "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className="flex items-center gap-2">
          <TerminalIcon className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-[10px] tracking-[0.2em] font-mono text-cyan-400/80 uppercase">
            Centro de Comandos
          </span>
          <span
            className="text-[8px] font-mono tracking-[0.18em] px-1.5 py-0.5 rounded-sm"
            style={{
              color: teamModeEnabled ? "#00f5ff" : "rgba(255,255,255,0.4)",
              background: teamModeEnabled ? "rgba(0,245,255,0.12)" : "rgba(255,255,255,0.05)",
              border: `1px solid ${teamModeEnabled ? "rgba(0,245,255,0.28)" : "rgba(255,255,255,0.08)"}`,
            }}
          >
            {teamModeEnabled ? "AGENTS TEAM ONLINE" : "AGENTS TEAM OFF"}
          </span>
          <div className="flex items-center gap-1.5 ml-2 flex-wrap">
            {engagedAgents.length === 0 && (
              <span className="text-[9px] font-mono text-white/25 tracking-[0.18em] uppercase">
                En espera
              </span>
            )}
            {engagedAgents.map((agent) => (
              <span
                key={agent.id}
                className="text-[8px] font-mono tracking-[0.18em] px-1.5 py-0.5 rounded-sm"
                style={{
                  color: agent.color,
                  background: `${agent.color}14`,
                  border: `1px solid ${agent.color}30`,
                  boxShadow: `0 0 8px ${agent.color}18`,
                }}
              >
                {agent.name}
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={toggleMaximize}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 transition-colors"
            title={isMaximized ? "Restaurar" : "Maximizar"}
          >
            {isMaximized
              ? <Minimize2 className="w-3 h-3 text-white/40" />
              : <Maximize2 className="w-3 h-3 text-white/40" />
            }
          </button>
          <button
            onClick={toggleCollapse}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 transition-colors"
            title={isCollapsed ? "Expandir" : "Colapsar"}
          >
            {isCollapsed
              ? <ChevronUp className="w-3 h-3 text-white/40" />
              : <ChevronDown className="w-3 h-3 text-white/40" />
            }
          </button>
        </div>
      </div>

      {/* ── Log Feed ── */}
      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1 font-mono text-[11px] leading-relaxed">
          <div className="flex items-center gap-2 pb-2 border-b border-white/5">
            <span className="text-[9px] uppercase tracking-[0.18em] text-white/25">En foco</span>
            {engagedAgents.length === 0 ? (
              <span className="text-[10px] text-white/35">Ningún principal activo</span>
            ) : (
              engagedAgents.map((agent) => (
                <span
                  key={`focus-${agent.id}`}
                  className="text-[9px] font-mono px-2 py-0.5 rounded-sm"
                  style={{
                    color: agent.color,
                    background: `${agent.color}14`,
                    border: `1px solid ${agent.color}25`,
                    boxShadow: `0 0 10px ${agent.color}20`,
                  }}
                >
                  {agent.name}
                </span>
              ))
            )}
          </div>
          {allLogs.length === 0 && (
            <div className="text-white/20 italic pt-2">
              Esperando un pedido real para ARIA y sus especialistas...
            </div>
          )}
          {allLogs.map((log) => (
            <div key={log.id} className="flex gap-2 group">
              <span className="text-white/20 shrink-0 select-none tabular-nums" suppressHydrationWarning>
                {log.timestamp.toLocaleTimeString("es-AR", {
                  hour12: false,
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </span>

              {log.type === "system" && (
                <span className="text-emerald-400/80">
                  <span className="text-white/30">[SYS:{log.agentName}]</span>{" "}
                  {compactLogText(log.text, log.type)}
                </span>
              )}
              {log.type === "command" && (
                <span className="text-white/80">
                  <span className="text-cyan-400/80">[TU]</span>{" "}
                  {log.text}
                </span>
              )}
              {log.type === "communication" && (
                <span style={{ color: log.agentColor }} className="font-medium">
                  <span style={{ color: log.agentColor, opacity: 0.7 }}>[{log.agentName}]</span>{" "}
                  {compactLogText(log.text, log.type)}
                </span>
              )}
            </div>
          ))}
          <div ref={endRef} />
        </div>
      )}

      {/* ── Input Area ── */}
      {!isCollapsed && (
        <div
          className="shrink-0 px-3 py-2"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)", background: "#0a0a14" }}
        >
          {/* Quick commands */}
          <div className="flex gap-1.5 mb-2 flex-wrap">
            {[
              { cmd: "/team_mode", label: "Agents Team" },
              { cmd: "/dismiss", label: "Reset visual" },
              { cmd: "@aria decile a @scout que investigue competencia", label: "Scout" },
              { cmd: "@aria pedile a @apex que revise el backend", label: "Apex" },
              { cmd: "@aria activa a @scout y @zion para investigar y definir estrategia", label: "2 Agentes" },
              { cmd: "@aria activa a @scout, @zion y @forge para investigar, definir estrategia y bajar un workflow", label: "3 Agentes" },
              { cmd: "@aria pedile a @forge fragmentar el flujo de n8n para responder mas rapido", label: "n8n Fast Lane" },
            ].map(({ cmd, label }) => (
              <button
                key={cmd}
                onClick={() => { setInput(cmd); inputRef.current?.focus(); }}
                className="px-2 py-0.5 text-[9px] font-mono rounded-sm transition-colors"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "rgba(255,255,255,0.4)",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.1)")}
                onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <span className="text-cyan-400/60 font-mono text-sm select-none">›</span>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Hablá con @aria. Puede activar 2 o 3 agentes principales y mantener la respuesta corta..."
              className="flex-1 bg-transparent font-mono text-[12px] focus:outline-none placeholder:text-white/20"
              style={{ color: "#e2e8f0" }}
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="p-1.5 rounded transition-all"
              style={{
                background: input.trim() ? "rgba(0,245,255,0.15)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${input.trim() ? "rgba(0,245,255,0.3)" : "rgba(255,255,255,0.06)"}`,
              }}
            >
              <Send className="w-3.5 h-3.5" style={{ color: input.trim() ? "#00f5ff" : "rgba(255,255,255,0.2)" }} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
