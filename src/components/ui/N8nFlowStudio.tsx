"use client";

import { type FormEvent, useDeferredValue, useEffect, useEffectEvent, useRef, useState, startTransition } from "react";
import { Activity, ArrowUpRight, Boxes, Copy, ExternalLink, Globe, Play, Sparkles, Workflow } from "lucide-react";
import { useSearchParams } from "next/navigation";

import { N8nStudioRequestPayload, N8nWorkflowCatalogItem } from "@/types/n8nStudio";

type RunStatus = "idle" | "running" | "success" | "error";

type RunResponse = {
  ok?: boolean;
  summary?: string;
  result?: unknown;
  error?: string;
  webhookUrl?: string;
};

type StudioPreset = {
  label: string;
  deliverable: string;
  companyName: string;
  website: string;
  channel: string;
  painPoint: string;
  goal: string;
  prompt: string;
};

const STUDIO_PRESETS: Record<string, StudioPreset> = {
  landing: {
    label: "Landing de oferta",
    deliverable: "landing-page-v0",
    companyName: "Office AI Studio",
    website: "https://office-ai.local",
    channel: "web",
    painPoint: "la propuesta no comunica el valor operativo del flujo y no convierte visitas en reuniones",
    goal: "disenar una landing clara, vendible y lista para bajar en v0 con secciones, copy y estructura",
    prompt:
      "Quiero una landing de alto impacto para vender este servicio. Defini hero, propuesta de valor, bloques de prueba, casos de uso, CTA y direccion visual. Dejame el prompt listo para v0 y el copy principal.",
  },
  cockpit: {
    label: "Portal operativo",
    deliverable: "ops-cockpit",
    companyName: "Office AI Control Room",
    website: "https://office-ai.local",
    channel: "web-app",
    painPoint: "los usuarios no ven el estado de los flujos ni entienden que automatizacion corre en cada etapa",
    goal: "disenar un cockpit operativo con tabs, estado de workflows, salidas y observabilidad clara",
    prompt:
      "Necesito un portal operativo tipo control room para Office AI. Disena tabs, paneles, estados, trazabilidad del flujo y una experiencia que haga evidente que n8n esta ejecutando resultados reales.",
  },
  workflow: {
    label: "Workflow listo para bajar",
    deliverable: "n8n-workflow-spec",
    companyName: "Nuevo flujo Office AI",
    website: "",
    channel: "ops",
    painPoint: "el proceso todavia vive en mensajes sueltos y no esta bajado a un flujo repetible",
    goal: "definir la logica, nodos, handoffs y output final de un workflow real en n8n",
    prompt:
      "Bajame un workflow real de n8n para este caso de uso. Necesito trigger, normalizacion, pasos, nodos, guardrails y el output final esperado sin vender humo.",
  },
};

const DEFAULT_FORM: N8nStudioRequestPayload = {
  companyName: "",
  website: "",
  painPoint: "",
  goal: "",
  channel: "web",
  requestedDeliverable: "deliverable",
  prompt: "",
};

function buildV0Prompt(form: N8nStudioRequestPayload, workflow: N8nWorkflowCatalogItem | null) {
  const subject = form.companyName || "Office AI";
  const website = form.website || "https://example.com";
  const goal = form.goal || "convertir el servicio en una oferta clara";
  const painPoint = form.painPoint || "la propuesta actual no hace visible el valor operativo";
  const deliverable = form.requestedDeliverable || "landing-page-v0";
  const workflowLabel = workflow?.name || "Office AI - Intake Router";

  return [
    `Design a bold, conversion-focused web experience for ${subject}.`,
    `Primary goal: ${goal}.`,
    `User pain point: ${painPoint}.`,
    `Requested deliverable: ${deliverable}.`,
    `Reference workflow inside the product: ${workflowLabel}.`,
    "Visual direction: editorial industrial, amber + sand + midnight blue, premium but operational, not generic SaaS.",
    "Include: hero, trust strip, workflow explainer, deliverables section, observability/control room section, case-study block, CTA footer.",
    "Add a second tab or section showing the live workflow status and generated output.",
    `Website reference: ${website}.`,
  ].join("\n");
}

function stringifyResult(result: unknown) {
  try {
    return JSON.stringify(result, null, 2) ?? "null";
  } catch {
    return String(result);
  }
}

async function copyText(value: string) {
  if (!navigator?.clipboard?.writeText) {
    throw new Error("El portapapeles no esta disponible en este navegador.");
  }

  await navigator.clipboard.writeText(value);
}

interface N8nFlowStudioProps {
  workflows: N8nWorkflowCatalogItem[];
  webhookUrl: string;
}

export default function N8nFlowStudio({ workflows, webhookUrl }: N8nFlowStudioProps) {
  const searchParams = useSearchParams();
  const lastTemplateRef = useRef<string | null>(null);
  const officeIntakeWorkflow = workflows.find((workflow) => workflow.slug === "office-ai-intake-router") ?? workflows[0] ?? null;

  const [form, setForm] = useState<N8nStudioRequestPayload>(DEFAULT_FORM);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>(officeIntakeWorkflow?.id ?? "");
  const [status, setStatus] = useState<RunStatus>("idle");
  const [summary, setSummary] = useState<string>("Todavia no corrio ningun pedido. Esta pestana ejecuta el webhook real cuando le mandes una solicitud.");
  const [result, setResult] = useState<unknown>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null);
  const deferredPrompt = useDeferredValue(form.prompt);

  const selectedWorkflow = workflows.find((workflow) => workflow.id === selectedWorkflowId) ?? officeIntakeWorkflow;
  const v0Prompt = buildV0Prompt(form, selectedWorkflow);

  function applyPresetState(presetKey: string) {
    const preset = STUDIO_PRESETS[presetKey];
    if (!preset) return;

    setForm({
      companyName: preset.companyName,
      website: preset.website,
      painPoint: preset.painPoint,
      goal: preset.goal,
      channel: preset.channel,
      requestedDeliverable: preset.deliverable,
      prompt: preset.prompt,
    });

    if (officeIntakeWorkflow) {
      setSelectedWorkflowId(officeIntakeWorkflow.id);
    }
  }

  const applyPresetFromEffect = useEffectEvent((presetKey: string) => {
    applyPresetState(presetKey);
  });

  useEffect(() => {
    const template = searchParams.get("template");
    if (!template || lastTemplateRef.current === template) return;
    lastTemplateRef.current = template;
    applyPresetFromEffect(template);
  }, [searchParams]);

  function updateField(field: keyof N8nStudioRequestPayload, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleWorkflowSelection(workflowId: string) {
    startTransition(() => {
      setSelectedWorkflowId(workflowId);
    });
  }

  async function handleCopy(value: string, label: string) {
    try {
      await copyText(value);
      setCopiedLabel(label);
      window.setTimeout(() => setCopiedLabel((current) => (current === label ? null : current)), 1600);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No pude copiar el contenido.");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("running");
    setErrorMessage(null);

    try {
      const response = await fetch("/api/n8n/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const payload = (await response.json().catch(() => null)) as RunResponse | null;

      if (!response.ok) {
        throw new Error(payload?.error || "No pude ejecutar el flujo real en n8n.");
      }

      setStatus("success");
      setSummary(payload?.summary || "n8n respondio correctamente.");
      setResult(payload?.result ?? null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No pude ejecutar el flujo real en n8n.";
      setStatus("error");
      setErrorMessage(message);
      setSummary(message);
      setResult(null);
    }
  }

  return (
    <div
      className="min-h-screen text-[#f8f0e3]"
      style={{
        background:
          "radial-gradient(circle at top left, rgba(230,148,54,0.34), transparent 28%), radial-gradient(circle at 88% 10%, rgba(53,108,125,0.26), transparent 24%), linear-gradient(135deg, #23160d 0%, #101c29 46%, #07111c 100%)",
      }}
    >
      <div
        className="min-h-screen"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "42px 42px",
        }}
      >
        <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-5 py-6 lg:px-8">
          <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <div
              className="rounded-[28px] border px-6 py-6 shadow-2xl"
              style={{
                background: "linear-gradient(180deg, rgba(13,23,36,0.92) 0%, rgba(10,16,28,0.96) 100%)",
                borderColor: "rgba(255,255,255,0.1)",
                boxShadow: "0 30px 80px rgba(0,0,0,0.38)",
              }}
            >
              <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-[#f4bb78]">
                <span className="rounded-full border px-3 py-1" style={{ borderColor: "rgba(244,187,120,0.32)" }}>
                  n8n real
                </span>
                <span className="rounded-full border px-3 py-1" style={{ borderColor: "rgba(131,219,201,0.28)", color: "#83dbc9" }}>
                  tab dedicada
                </span>
              </div>

              <div className="mt-5 max-w-3xl">
                <h1
                  className="text-4xl leading-none md:text-6xl"
                  style={{ fontFamily: "\"Bahnschrift\", \"Aptos\", sans-serif", letterSpacing: "-0.05em" }}
                >
                  Flow Studio para pedir, correr y ver resultados reales de n8n.
                </h1>
                <p className="mt-4 max-w-2xl text-[15px] leading-7 text-white/72">
                  Esta pestana ya no dispara una demo. Aca escribis lo que queres generar, el pedido viaja al webhook real
                  <span className="mx-2 font-mono text-[#83dbc9]">office-ai/intake</span>
                  y ves el output que devolvio el flujo.
                </p>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                {Object.entries(STUDIO_PRESETS).map(([key, preset]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      lastTemplateRef.current = key;
                      applyPresetState(key);
                    }}
                    className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm transition-transform hover:-translate-y-0.5"
                    style={{
                      background: "rgba(244,187,120,0.12)",
                      border: "1px solid rgba(244,187,120,0.26)",
                      color: "#fde7ca",
                    }}
                  >
                    <Sparkles size={16} />
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <aside
              className="rounded-[28px] border px-5 py-5"
              style={{
                background: "linear-gradient(180deg, rgba(240,229,209,0.96) 0%, rgba(227,215,194,0.94) 100%)",
                borderColor: "rgba(255,255,255,0.1)",
                color: "#16212d",
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.24em] text-[#8d5c1f]">Ruta activa</div>
                  <div className="mt-1 text-2xl font-semibold" style={{ fontFamily: "\"Bahnschrift\", \"Aptos\", sans-serif" }}>
                    {selectedWorkflow?.name || "Sin workflow"}
                  </div>
                </div>
                <div className="rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.2em]" style={{ background: "#132130", color: "#f2dfc4" }}>
                  {selectedWorkflow?.active ? "active" : "draft"}
                </div>
              </div>

              <p className="mt-4 text-sm leading-6 text-[#253549]">{selectedWorkflow?.description}</p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border px-4 py-3" style={{ borderColor: "rgba(19,33,48,0.12)", background: "rgba(255,255,255,0.45)" }}>
                  <div className="text-[11px] uppercase tracking-[0.22em] text-[#6b7280]">Webhook real</div>
                  <div className="mt-2 break-all font-mono text-[12px] leading-5">{webhookUrl}</div>
                </div>
                <div className="rounded-2xl border px-4 py-3" style={{ borderColor: "rgba(19,33,48,0.12)", background: "rgba(255,255,255,0.45)" }}>
                  <div className="text-[11px] uppercase tracking-[0.22em] text-[#6b7280]">Nodos / triggers</div>
                  <div className="mt-2 font-mono text-[13px]">{selectedWorkflow?.nodeCount ?? 0} nodos</div>
                  <div className="mt-1 text-xs uppercase tracking-[0.18em] text-[#475569]">
                    {(selectedWorkflow?.triggerKinds ?? []).join(" / ")}
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <a
                  href="http://127.0.0.1:5678"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm"
                  style={{ background: "#132130", color: "#f7efe2" }}
                >
                  <ExternalLink size={16} />
                  Abrir n8n local
                </a>
                <button
                  type="button"
                  onClick={() => handleCopy(v0Prompt, "prompt-v0")}
                  className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm"
                  style={{ borderColor: "rgba(19,33,48,0.18)", color: "#132130" }}
                >
                  <Copy size={16} />
                  {copiedLabel === "prompt-v0" ? "Prompt v0 copiado" : "Copiar prompt v0"}
                </button>
              </div>
            </aside>
          </section>
          <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
            <form
              onSubmit={handleSubmit}
              className="rounded-[28px] border px-5 py-5"
              style={{
                background: "linear-gradient(180deg, rgba(11,18,29,0.93) 0%, rgba(8,13,22,0.97) 100%)",
                borderColor: "rgba(255,255,255,0.08)",
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.24em] text-[#83dbc9]">Pedido real</div>
                  <h2 className="mt-2 text-2xl" style={{ fontFamily: "\"Bahnschrift\", \"Aptos\", sans-serif" }}>
                    Decile al flujo que queres generar
                  </h2>
                </div>
                <div
                  className="rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.2em]"
                  style={{
                    background:
                      status === "success"
                        ? "rgba(34,197,94,0.14)"
                        : status === "error"
                          ? "rgba(248,113,113,0.16)"
                          : status === "running"
                            ? "rgba(244,187,120,0.14)"
                            : "rgba(131,219,201,0.12)",
                    color:
                      status === "success"
                        ? "#86efac"
                        : status === "error"
                          ? "#fecaca"
                          : status === "running"
                            ? "#f4bb78"
                            : "#83dbc9",
                  }}
                >
                  {status === "running" ? "ejecutando" : status === "success" ? "generado" : status === "error" ? "error" : "listo"}
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-2">
                  <span className="text-[11px] uppercase tracking-[0.22em] text-white/45">Proyecto / cliente</span>
                  <input
                    value={form.companyName}
                    onChange={(event) => updateField("companyName", event.target.value)}
                    className="rounded-2xl border px-4 py-3 outline-none transition-colors"
                    style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.08)" }}
                    placeholder="Ej: Estudio Delta"
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-[11px] uppercase tracking-[0.22em] text-white/45">Website</span>
                  <input
                    value={form.website}
                    onChange={(event) => updateField("website", event.target.value)}
                    className="rounded-2xl border px-4 py-3 outline-none transition-colors"
                    style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.08)" }}
                    placeholder="https://tu-sitio.com"
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-[11px] uppercase tracking-[0.22em] text-white/45">Canal</span>
                  <input
                    value={form.channel}
                    onChange={(event) => updateField("channel", event.target.value)}
                    className="rounded-2xl border px-4 py-3 outline-none transition-colors"
                    style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.08)" }}
                    placeholder="web / email / ops / web-app"
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-[11px] uppercase tracking-[0.22em] text-white/45">Entregable</span>
                  <input
                    value={form.requestedDeliverable}
                    onChange={(event) => updateField("requestedDeliverable", event.target.value)}
                    className="rounded-2xl border px-4 py-3 outline-none transition-colors"
                    style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.08)" }}
                    placeholder="landing-page-v0 / ops-cockpit / brief"
                  />
                </label>
              </div>

              <div className="mt-4 grid gap-4">
                <label className="flex flex-col gap-2">
                  <span className="text-[11px] uppercase tracking-[0.22em] text-white/45">Dolor</span>
                  <textarea
                    value={form.painPoint}
                    onChange={(event) => updateField("painPoint", event.target.value)}
                    className="min-h-[88px] rounded-2xl border px-4 py-3 outline-none transition-colors"
                    style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.08)" }}
                    placeholder="Que problema real estas tratando de resolver"
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-[11px] uppercase tracking-[0.22em] text-white/45">Objetivo</span>
                  <textarea
                    value={form.goal}
                    onChange={(event) => updateField("goal", event.target.value)}
                    className="min-h-[88px] rounded-2xl border px-4 py-3 outline-none transition-colors"
                    style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.08)" }}
                    placeholder="Que queres que el flujo deje listo al final"
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-[11px] uppercase tracking-[0.22em] text-white/45">Pedido para n8n</span>
                  <textarea
                    value={form.prompt}
                    onChange={(event) => updateField("prompt", event.target.value)}
                    className="min-h-[180px] rounded-[24px] border px-4 py-4 font-mono text-[14px] leading-6 outline-none transition-colors"
                    style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(244,187,120,0.2)" }}
                    placeholder="Ej: Necesito una landing vendible para este servicio, con copy, estructura y prompt listo para v0."
                  />
                </label>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={status === "running"}
                  className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-medium transition-transform hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-70"
                  style={{ background: "#f4bb78", color: "#111827" }}
                >
                  <Play size={16} />
                  {status === "running" ? "Generando..." : "Generar con n8n"}
                </button>

                <button
                  type="button"
                  onClick={() => handleCopy(JSON.stringify(form, null, 2), "payload")}
                  className="inline-flex items-center gap-2 rounded-full border px-5 py-3 text-sm"
                  style={{ borderColor: "rgba(255,255,255,0.12)" }}
                >
                  <Copy size={16} />
                  {copiedLabel === "payload" ? "Payload copiado" : "Copiar payload"}
                </button>

                <button
                  type="button"
                  onClick={() => handleCopy(v0Prompt, "v0-inline")}
                  className="inline-flex items-center gap-2 rounded-full border px-5 py-3 text-sm"
                  style={{ borderColor: "rgba(131,219,201,0.22)", color: "#83dbc9" }}
                >
                  <Sparkles size={16} />
                  {copiedLabel === "v0-inline" ? "Prompt v0 copiado" : "Copiar prompt para v0"}
                </button>
              </div>
            </form>

            <div className="flex flex-col gap-6">
              <section
                className="rounded-[28px] border px-5 py-5"
                style={{
                  background: "linear-gradient(180deg, rgba(239,230,215,0.97) 0%, rgba(228,218,200,0.95) 100%)",
                  borderColor: "rgba(255,255,255,0.08)",
                  color: "#16212d",
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.24em] text-[#8d5c1f]">Resultado</div>
                    <h2 className="mt-2 text-2xl" style={{ fontFamily: "\"Bahnschrift\", \"Aptos\", sans-serif" }}>
                      Salida del flujo real
                    </h2>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.18em]" style={{ background: "#132130", color: "#f0e6d6" }}>
                    <Activity size={14} />
                    {status}
                  </div>
                </div>

                <div className="mt-4 rounded-[24px] border px-4 py-4" style={{ borderColor: "rgba(19,33,48,0.12)", background: "rgba(255,255,255,0.52)" }}>
                  <div className="text-[11px] uppercase tracking-[0.22em] text-[#64748b]">Resumen</div>
                  <div className="mt-3 whitespace-pre-wrap text-[15px] leading-7">{summary}</div>
                  {errorMessage && <div className="mt-3 text-sm text-[#b91c1c]">{errorMessage}</div>}
                </div>

                <div className="mt-4 rounded-[24px] border px-4 py-4" style={{ borderColor: "rgba(19,33,48,0.12)", background: "#132130", color: "#f8f0e3" }}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-[#83dbc9]">Output crudo</div>
                    <button
                      type="button"
                      onClick={() => handleCopy(stringifyResult(result), "result")}
                      className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.18em]"
                      style={{ borderColor: "rgba(131,219,201,0.24)" }}
                    >
                      <Copy size={13} />
                      {copiedLabel === "result" ? "copiado" : "copiar"}
                    </button>
                  </div>
                  <pre className="mt-3 max-h-[320px] overflow-auto whitespace-pre-wrap break-words text-[12px] leading-6 text-white/78">
                    {stringifyResult(result)}
                  </pre>
                </div>
              </section>

              <section
                className="rounded-[28px] border px-5 py-5"
                style={{
                  background: "linear-gradient(180deg, rgba(10,18,28,0.94) 0%, rgba(8,13,22,0.97) 100%)",
                  borderColor: "rgba(255,255,255,0.08)",
                }}
              >
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-[#83dbc9]">
                  <Workflow size={14} />
                  Vista previa del pedido
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-[0.86fr_1.14fr]">
                  <div className="rounded-[24px] border px-4 py-4" style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}>
                    <div className="text-[11px] uppercase tracking-[0.22em] text-white/38">Workflow seleccionado</div>
                    <div className="mt-3 text-lg text-white">{selectedWorkflow?.name}</div>
                    <div className="mt-2 text-sm leading-6 text-white/58">{selectedWorkflow?.description}</div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {(selectedWorkflow?.webhooks ?? []).map((webhook) => (
                        <span
                          key={`${selectedWorkflow?.id}-${webhook.path}`}
                          className="rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.18em]"
                          style={{ borderColor: "rgba(244,187,120,0.22)", color: "#f4bb78" }}
                        >
                          {webhook.method} / {webhook.path}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[24px] border px-4 py-4" style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}>
                    <div className="text-[11px] uppercase tracking-[0.22em] text-white/38">Prompt activo</div>
                    <div className="mt-3 whitespace-pre-wrap font-mono text-[13px] leading-6 text-white/76">
                      {deferredPrompt || "Todavia no escribiste el pedido."}
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </section>
          <section
            className="rounded-[28px] border px-5 py-5"
            style={{
              background: "linear-gradient(180deg, rgba(239,230,215,0.96) 0%, rgba(228,218,200,0.94) 100%)",
              borderColor: "rgba(255,255,255,0.08)",
              color: "#16212d",
            }}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-[0.24em] text-[#8d5c1f]">Catalogo real</div>
                <h2 className="mt-2 text-2xl" style={{ fontFamily: "\"Bahnschrift\", \"Aptos\", sans-serif" }}>
                  Workflows detectados en el repo
                </h2>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.18em]" style={{ background: "#132130", color: "#f0e6d6" }}>
                <Boxes size={14} />
                {workflows.length} flujos
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {workflows.map((workflow) => {
                const isSelected = workflow.id === selectedWorkflow?.id;

                return (
                  <button
                    key={workflow.id}
                    type="button"
                    onClick={() => handleWorkflowSelection(workflow.id)}
                    className="rounded-[24px] border px-4 py-4 text-left transition-transform hover:-translate-y-1"
                    style={{
                      background: isSelected ? "#132130" : "rgba(255,255,255,0.45)",
                      color: isSelected ? "#f8f0e3" : "#16212d",
                      borderColor: isSelected ? "rgba(244,187,120,0.45)" : "rgba(19,33,48,0.12)",
                      boxShadow: isSelected ? "0 18px 40px rgba(19,33,48,0.24)" : "none",
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.2em]" style={{ color: isSelected ? "#f4bb78" : "#8d5c1f" }}>
                          {workflow.group}
                        </div>
                        <div className="mt-2 text-lg leading-6">{workflow.name}</div>
                      </div>
                      <span
                        className="rounded-full px-2 py-1 text-[10px] uppercase tracking-[0.18em]"
                        style={{ background: isSelected ? "rgba(244,187,120,0.14)" : "rgba(19,33,48,0.08)" }}
                      >
                        {workflow.active ? "active" : "draft"}
                      </span>
                    </div>

                    <p className="mt-3 text-sm leading-6 opacity-80">{workflow.description}</p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {workflow.triggerKinds.map((trigger) => (
                        <span
                          key={`${workflow.id}-${trigger}`}
                          className="rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.18em]"
                          style={{
                            borderColor: isSelected ? "rgba(255,255,255,0.14)" : "rgba(19,33,48,0.12)",
                            color: isSelected ? "rgba(255,255,255,0.82)" : "#475569",
                          }}
                        >
                          {trigger}
                        </span>
                      ))}
                    </div>

                    <div className="mt-4 flex items-center justify-between text-[12px] uppercase tracking-[0.16em] opacity-70">
                      <span>{workflow.nodeCount} nodos</span>
                      <span className="inline-flex items-center gap-1">
                        Seleccionar
                        <ArrowUpRight size={14} />
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section
            className="rounded-[28px] border px-5 py-5"
            style={{
              background: "linear-gradient(180deg, rgba(10,18,28,0.94) 0%, rgba(8,13,22,0.97) 100%)",
              borderColor: "rgba(255,255,255,0.08)",
            }}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-[0.24em] text-[#83dbc9]">Bajada web</div>
                <h2 className="mt-2 text-2xl" style={{ fontFamily: "\"Bahnschrift\", \"Aptos\", sans-serif" }}>
                  Prompt listo para llevar a v0
                </h2>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(v0Prompt, "v0-bottom")}
                className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm"
                style={{ borderColor: "rgba(131,219,201,0.22)", color: "#83dbc9" }}
              >
                <Globe size={16} />
                {copiedLabel === "v0-bottom" ? "Prompt copiado" : "Copiar prompt"}
              </button>
            </div>

            <pre className="mt-4 overflow-auto rounded-[24px] border px-4 py-4 whitespace-pre-wrap text-[13px] leading-6 text-white/80" style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}>
              {v0Prompt}
            </pre>
          </section>
        </main>
      </div>
    </div>
  );
}
