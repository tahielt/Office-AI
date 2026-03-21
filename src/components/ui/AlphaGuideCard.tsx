"use client";

interface AlphaGuideCardProps {
  onRunPrompt: (prompt: string) => void;
}

const QUICK_REQUESTS = [
  {
    label: "Crear landing",
    focus: "pedir una web competitiva desde este chat",
    prompt:
      "Hola ARIA, quiero que el agente me cree una landing competitiva para este producto usando n8n. Necesito propuesta visual, estructura, copy principal y output listo para bajar.",
  },
  {
    label: "Mejorar web",
    focus: "optimizar una web existente y bajar una mejor version",
    prompt:
      "Hola ARIA, quiero mejorar esta web y que el flujo en n8n me devuelva una version mas competitiva con mejor propuesta, secciones y copy.",
  },
  {
    label: "Portal ops",
    focus: "disenar una interfaz tipo cockpit para operar el agente",
    prompt:
      "Hola ARIA, quiero un portal operativo para este agente: disena la interfaz, tabs, estados y una experiencia clara para operar workflows y resultados.",
  },
];

const CAPABILITIES = [
  "Le escribis a ARIA aca abajo y ella decide si dispara n8n.",
  "FORGE puede bajar la parte operativa del flujo web.",
  "ECHO y VOX pueden empujar copy, estructura y direccion creativa.",
];

export default function AlphaGuideCard({ onRunPrompt }: AlphaGuideCardProps) {
  return (
    <div
      className="relative overflow-hidden px-3 py-3"
      style={{
        background:
          "linear-gradient(180deg, rgba(15,22,35,0.96) 0%, rgba(10,15,26,0.96) 52%, rgba(7,11,20,0.99) 100%)",
        border: "1px solid rgba(34,211,238,0.18)",
        borderRadius: "10px",
        boxShadow: "0 0 28px rgba(34,211,238,0.08)",
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at top right, rgba(34,211,238,0.14), transparent 36%), radial-gradient(circle at bottom left, rgba(249,115,22,0.12), transparent 30%)",
        }}
      />

      <div className="relative z-10 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <span className="text-[9px] font-mono tracking-[0.26em] text-cyan-300/70 uppercase">
              ARIA Concierge
            </span>
            <div className="mt-1 text-[14px] font-semibold text-white">Hola, soy ARIA. En que te podemos ayudar?</div>
          </div>
          <span
            className="shrink-0 rounded-sm px-1.5 py-0.5 text-[8px] font-mono tracking-[0.2em]"
            style={{
              color: "#f8fafc",
              background: "rgba(34,211,238,0.14)",
              border: "1px solid rgba(34,211,238,0.3)",
            }}
          >
            LIVE
          </span>
        </div>

        <p className="text-[11px] leading-relaxed text-white/72">
          Escribime en el centro de comandos. Si queres una web, una landing o un portal, coordino al equipo y uso
          `n8n` desde aca sin mandarte a otro formulario.
        </p>

        <div className="space-y-1.5">
          <div className="text-[9px] font-mono tracking-[0.2em] text-cyan-200/65 uppercase">Lo que podemos hacer</div>
          {CAPABILITIES.map((item) => (
            <div
              key={item}
              className="rounded-md px-2 py-1.5 text-[10px] leading-relaxed"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.06)",
                color: "rgba(255,255,255,0.7)",
              }}
            >
              {item}
            </div>
          ))}
        </div>

        <div className="space-y-1.5">
          <div className="text-[9px] font-mono tracking-[0.2em] text-emerald-200/65 uppercase">Pedidos rapidos</div>
          {QUICK_REQUESTS.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => onRunPrompt(item.prompt)}
              className="w-full rounded-md px-2 py-2 text-left transition-colors hover:bg-white/10"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-mono tracking-[0.18em] text-white">{item.label}</span>
                <span className="text-[8px] font-mono text-cyan-300/80">ARIA</span>
              </div>
              <div className="mt-1 text-[10px] leading-relaxed text-white/55">{item.focus}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
