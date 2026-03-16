"use client";

interface AlphaGuideCardProps {
  onRunPrompt: (prompt: string) => void;
  onRunN8nDemo: () => void;
  n8nDemoStatus: "idle" | "running" | "success" | "error";
  n8nDemoMessage: string | null;
}

const DEMO_PROMPTS = [
  {
    label: "Oferta alpha",
    focus: "definir promesa, alcance y mensaje comercial",
    prompt:
      "Definí la oferta alpha de este orquestador, su promesa comercial y un mensaje breve para venderlo sin sobreprometer.",
  },
  {
    label: "Demo con n8n",
    focus: "mostrar un caso real de operacion automatizada",
    prompt:
      "Convertí este alpha en una demo funcional con n8n, dejando alcance, flujo y límites claros para un cliente piloto.",
  },
  {
    label: "Prospeccion",
    focus: "investigar una cuenta y salir con siguiente accion",
    prompt:
      "Investigá un prospecto, detectá la oportunidad y redactá un primer mensaje comercial listo para enviar.",
  },
];

const SELLABLE_TODAY = [
  "Triage multiagente en una sola conversacion.",
  "Investigacion, estrategia y respuesta comercial coordinadas.",
  "Bajada de workflows alpha en n8n para procesos repetitivos.",
];

const LIMITS = [
  "No vender autonomia total sin supervision.",
  "No prometer backoffice critico ni ejecucion ciega.",
  "Mejor venderlo como piloto guiado de alto valor.",
];

export default function AlphaGuideCard({
  onRunPrompt,
  onRunN8nDemo,
  n8nDemoStatus,
  n8nDemoMessage,
}: AlphaGuideCardProps) {
  return (
    <div
      className="relative overflow-hidden px-3 py-3"
      style={{
        background:
          "linear-gradient(180deg, rgba(17,24,39,0.94) 0%, rgba(15,23,42,0.94) 52%, rgba(10,10,20,0.98) 100%)",
        border: "1px solid rgba(56,189,248,0.18)",
        borderRadius: "6px",
        boxShadow: "0 0 24px rgba(14,165,233,0.08)",
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at top right, rgba(34,211,238,0.14), transparent 38%), radial-gradient(circle at bottom left, rgba(249,115,22,0.12), transparent 32%)",
        }}
      />

      <div className="relative z-10 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <span className="text-[9px] font-mono tracking-[0.26em] text-cyan-300/70 uppercase">
              Alpha Playbook
            </span>
            <div className="mt-1 text-[13px] font-semibold text-white">Como vender este alpha hoy</div>
          </div>
          <span
            className="shrink-0 rounded-sm px-1.5 py-0.5 text-[8px] font-mono tracking-[0.2em]"
            style={{
              color: "#f8fafc",
              background: "rgba(56,189,248,0.14)",
              border: "1px solid rgba(56,189,248,0.3)",
            }}
          >
            B2B ALPHA
          </span>
        </div>

        <p className="text-[11px] leading-relaxed text-white/70">
          Vende coordinacion operativa entre research, decision, automatizacion y respuesta al cliente. No vendas
          una IA general: vende un puesto operativo guiado.
        </p>

        <div className="space-y-1.5">
          <div className="text-[9px] font-mono tracking-[0.2em] text-cyan-200/65 uppercase">Lo vendible hoy</div>
          {SELLABLE_TODAY.map((item) => (
            <div
              key={item}
              className="rounded-sm px-2 py-1 text-[10px] leading-relaxed"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.06)",
                color: "rgba(255,255,255,0.68)",
              }}
            >
              {item}
            </div>
          ))}
        </div>

        <div className="rounded-sm px-2 py-2" style={{ background: "rgba(15,23,42,0.55)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="text-[9px] font-mono tracking-[0.2em] text-amber-200/65 uppercase">ICP alpha</div>
          <div className="mt-1 text-[11px] leading-relaxed text-white/72">
            Agencias, estudios, equipos ops y founders que hoy coordinan ventas, analisis y automatizacion a mano.
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="text-[9px] font-mono tracking-[0.2em] text-emerald-200/65 uppercase">Demos listas</div>
          <button
            type="button"
            onClick={onRunN8nDemo}
            disabled={n8nDemoStatus === "running"}
            className="w-full rounded-sm px-2 py-2 text-left transition-colors disabled:cursor-wait disabled:opacity-70 hover:bg-white/10"
            style={{
              background:
                n8nDemoStatus === "success"
                  ? "rgba(16,185,129,0.08)"
                  : n8nDemoStatus === "error"
                    ? "rgba(248,113,113,0.08)"
                    : "rgba(14,165,233,0.08)",
              border: `1px solid ${
                n8nDemoStatus === "success"
                  ? "rgba(16,185,129,0.24)"
                  : n8nDemoStatus === "error"
                    ? "rgba(248,113,113,0.24)"
                    : "rgba(14,165,233,0.24)"
              }`,
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-mono tracking-[0.18em] text-white">
                {n8nDemoStatus === "running" ? "Conectando n8n" : "n8n en vivo"}
              </span>
              <span className="text-[8px] font-mono text-cyan-300/80">
                {n8nDemoStatus === "running" ? "LIVE..." : "WEBHOOK"}
              </span>
            </div>
            <div className="mt-1 text-[10px] leading-relaxed text-white/55">
              Dispara el piloto real de lead intake hacia `office-ai/intake` sin salir de Office AI.
            </div>
          </button>
          {n8nDemoMessage && (
            <div
              className="rounded-sm px-2 py-1.5 text-[10px] leading-relaxed"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.06)",
                color: n8nDemoStatus === "error" ? "rgba(254,202,202,0.92)" : "rgba(255,255,255,0.7)",
              }}
            >
              {n8nDemoMessage}
            </div>
          )}
          {DEMO_PROMPTS.map((demo) => (
            <button
              key={demo.label}
              type="button"
              onClick={() => onRunPrompt(demo.prompt)}
              className="w-full rounded-sm px-2 py-2 text-left transition-colors hover:bg-white/10"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-mono tracking-[0.18em] text-white">{demo.label}</span>
                <span className="text-[8px] font-mono text-cyan-300/80">RUN</span>
              </div>
              <div className="mt-1 text-[10px] leading-relaxed text-white/55">{demo.focus}</div>
            </button>
          ))}
        </div>

        <div className="space-y-1.5">
          <div className="text-[9px] font-mono tracking-[0.2em] text-rose-200/65 uppercase">No prometer aun</div>
          {LIMITS.map((item) => (
            <div key={item} className="text-[10px] leading-relaxed text-white/45">
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
