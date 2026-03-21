import Link from "next/link";
import { notFound } from "next/navigation";

import { getGeneratedSite } from "@/lib/generatedSites";

export const dynamic = "force-dynamic";

interface SitePageProps {
  params: Promise<{
    siteId: string;
  }>;
}

export default async function GeneratedSitePage({ params }: SitePageProps) {
  const { siteId } = await params;
  const site = await getGeneratedSite(siteId);

  if (!site) {
    notFound();
  }

  return (
    <main
      className="min-h-screen px-6 py-8 text-[#f8efe2]"
      style={{
        background:
          "radial-gradient(circle at top left, rgba(249,115,22,0.3), transparent 28%), radial-gradient(circle at 82% 12%, rgba(34,211,238,0.2), transparent 24%), linear-gradient(135deg, #1b140d 0%, #0f1827 48%, #08101c 100%)",
      }}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <section
          className="rounded-[32px] border px-6 py-8"
          style={{
            background: "linear-gradient(180deg, rgba(13,23,36,0.92) 0%, rgba(10,16,28,0.96) 100%)",
            borderColor: "rgba(255,255,255,0.08)",
            boxShadow: "0 30px 80px rgba(0,0,0,0.34)",
          }}
        >
          <div className="text-[11px] uppercase tracking-[0.3em] text-[#f4bb78]">web generada</div>
          <h1 className="mt-4 max-w-4xl text-4xl leading-none md:text-6xl" style={{ fontFamily: "\"Bahnschrift\", \"Aptos\", sans-serif" }}>
            {site.heroTitle}
          </h1>
          <p className="mt-4 max-w-3xl text-[16px] leading-7 text-white/72">{site.heroSubtitle}</p>

          <div className="mt-6 flex flex-wrap gap-3 text-[11px] uppercase tracking-[0.22em]">
            <span className="rounded-full border px-3 py-1" style={{ borderColor: "rgba(244,187,120,0.28)", color: "#f4bb78" }}>
              {site.requestedDeliverable}
            </span>
            <span className="rounded-full border px-3 py-1" style={{ borderColor: "rgba(34,211,238,0.24)", color: "#83dbc9" }}>
              {site.companyName}
            </span>
            <span className="rounded-full border px-3 py-1" style={{ borderColor: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.7)" }}>
              {new Date(site.createdAt).toLocaleString("es-AR")}
            </span>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div
            className="rounded-[28px] border px-6 py-6"
            style={{
              background: "linear-gradient(180deg, rgba(242,231,214,0.97) 0%, rgba(229,218,201,0.95) 100%)",
              borderColor: "rgba(255,255,255,0.08)",
              color: "#16212d",
            }}
          >
            <div className="text-[11px] uppercase tracking-[0.24em] text-[#8d5c1f]">Highlights</div>
            <div className="mt-4 grid gap-3">
              {site.highlights.map((highlight) => (
                <div
                  key={highlight}
                  className="rounded-[22px] border px-4 py-4 text-[15px] leading-7"
                  style={{ background: "rgba(255,255,255,0.46)", borderColor: "rgba(19,33,48,0.12)" }}
                >
                  {highlight}
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div
              className="rounded-[28px] border px-6 py-6"
              style={{
                background: "linear-gradient(180deg, rgba(10,18,28,0.94) 0%, rgba(8,13,22,0.97) 100%)",
                borderColor: "rgba(255,255,255,0.08)",
              }}
            >
              <div className="text-[11px] uppercase tracking-[0.24em] text-[#83dbc9]">Prompt usado</div>
              <div className="mt-4 whitespace-pre-wrap font-mono text-[13px] leading-6 text-white/76">{site.prompt}</div>
            </div>

            <div
              className="rounded-[28px] border px-6 py-6"
              style={{
                background: "linear-gradient(180deg, rgba(10,18,28,0.94) 0%, rgba(8,13,22,0.97) 100%)",
                borderColor: "rgba(255,255,255,0.08)",
              }}
            >
              <div className="text-[11px] uppercase tracking-[0.24em] text-[#83dbc9]">Salida cruda</div>
              <pre className="mt-4 max-h-[420px] overflow-auto whitespace-pre-wrap break-words text-[12px] leading-6 text-white/76">
                {JSON.stringify(site.result, null, 2)}
              </pre>
            </div>
          </div>
        </section>

        <section
          className="rounded-[28px] border px-6 py-6"
          style={{
            background: "linear-gradient(180deg, rgba(13,23,36,0.92) 0%, rgba(10,16,28,0.96) 100%)",
            borderColor: "rgba(255,255,255,0.08)",
          }}
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-[11px] uppercase tracking-[0.24em] text-[#f4bb78]">Siguiente paso</div>
              <div className="mt-2 text-2xl text-white" style={{ fontFamily: "\"Bahnschrift\", \"Aptos\", sans-serif" }}>
                {site.ctaLabel}
              </div>
              <div className="mt-2 text-white/62">
                Esta URL queda como salida navegable del agente para que puedas revisar la web generada y seguir iterando.
              </div>
            </div>
            <Link
              href="/"
              className="rounded-full px-5 py-3 text-sm font-medium"
              style={{ background: "#f4bb78", color: "#111827" }}
            >
              Volver a ARIA
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
