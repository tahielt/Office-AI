"use client";
import { Agent } from "@/types/agent";
import { Terminal as TerminalIcon, Send, ChevronUp, ChevronDown, Maximize2, Minimize2 } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";

interface Props {
  agents: Agent[];
  onCommand: (cmd: string) => void;
}

const MIN_HEIGHT = 48;   // colapsado — solo header
const DEFAULT_HEIGHT = 220;
const MAX_HEIGHT = 520;

export default function Terminal({ agents, onCommand }: Props) {
  const [input, setInput] = useState("");
  const [mounted, setMounted] = useState(false);
  const [height, setHeight] = useState(DEFAULT_HEIGHT);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(0);
  const dragStartHeight = useRef(0);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setMounted(true); }, []);

  // Combinar logs de todos los agentes en feed global
  const allLogs = agents
    .flatMap((agent) =>
      agent.log.map((log) => ({
        ...log,
        agentName: agent.name,
        agentColor: agent.color,
      }))
    )
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

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
          {/* Indicador de logs activos */}
          <div className="flex gap-1 ml-2">
            {agents.filter(a => a.status !== "idle").map(a => (
              <div
                key={a.id}
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: a.color, boxShadow: `0 0 4px ${a.color}` }}
              />
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
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-0.5 font-mono text-[11px] leading-relaxed">
          {allLogs.length === 0 && (
            <div className="text-white/20 italic pt-2">
              Esperando actividad de agentes...
            </div>
          )}
          {allLogs.map((log) => (
            <div key={log.id} className="flex gap-2 group">
              {/* Timestamp */}
              <span className="text-white/20 shrink-0 select-none tabular-nums">
                {mounted
                  ? log.timestamp.toLocaleTimeString("es-AR", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" })
                  : "··:··:··"
                }
              </span>

              {/* Contenido según tipo */}
              {log.type === "system" && (
                <span className="text-emerald-400/80">
                  <span className="text-white/30">[SYS:{log.agentName}]</span>{" "}
                  {log.text}
                </span>
              )}
              {log.type === "thought" && (
                <span className="text-white/35 italic">
                  <span className="text-white/20">[PENSAMIENTO:{log.agentName}]</span>{" "}
                  {log.text}
                </span>
              )}
              {log.type === "communication" && (
                <span style={{ color: log.agentColor }} className="font-medium">
                  <span style={{ color: log.agentColor, opacity: 0.7 }}>[{log.agentName}]</span>{" "}
                  {log.text}
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
              { cmd: "/summon_all", label: "Convocar todos" },
              { cmd: "/dismiss", label: "Dispersar" },
              { cmd: "/report_status", label: "Estado del sistema" },
              { cmd: "@scout analizar competencia", label: "@ Scout" },
              { cmd: "@apex revisar código", label: "@ Apex" },
              { cmd: "@forge automatizar", label: "@ Forge" },
              { cmd: "@echo redactar email", label: "@ Echo" },
              { cmd: "@pulse revisar reseñas", label: "@ Pulse" },
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
              placeholder="Hablá con @aria o asigná tareas a tus agentes..."
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