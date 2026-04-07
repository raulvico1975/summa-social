"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";

import { OnboardingPill } from "@/components/copilot/OnboardingPill";

export function LiveCopilotSandbox() {
  const searchParams = useSearchParams();
  const view = searchParams.get("view") ?? "remittances";

  const content = useMemo(() => {
    if (view === "donants") {
      return {
        title: "Donants",
        description: "Vista de prova per validar navegació del copilot.",
      };
    }

    return {
      title: "Remeses",
      description: "Sandbox local per provar el copilot executiu d'onboarding.",
    };
  }, [view]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#e0f2fe_0%,#f8fafc_48%,#eef2ff_100%)] p-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="space-y-3">
          <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-sky-700">
            Live Copilot Sandbox
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-950">
            {content.title}
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-slate-600">
            {content.description}
          </p>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="rounded-[28px] border border-white/70 bg-white/80 p-6 shadow-[0_25px_80px_rgba(15,23,42,0.12)] backdrop-blur-md">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Centre operatiu
                </p>
                <p className="text-sm text-slate-500">
                  Elements persistents instrumentats amb `data-ai-action`.
                </p>
              </div>
              <div className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                {view === "donants" ? "Vista donants" : "Vista remeses"}
              </div>
            </div>

            {view === "donants" ? (
              <div
                className="rounded-3xl border border-slate-200 bg-slate-50 p-6"
                data-ai-action="open-donors-overview"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                      Donants actius
                    </h2>
                    <p className="text-sm text-slate-500">
                      Vista secundaria per provar `Maps`.
                    </p>
                  </div>
                  <button
                    className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
                    data-ai-action="open-remittance-flow"
                    type="button"
                  >
                    Obrir remeses
                  </button>
                </div>
                <div className="space-y-3">
                  {["Fundació Mar", "Associació Tramuntana", "Residència Canigó"].map(
                    (name) => (
                      <div
                        className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3"
                        key={name}
                      >
                        <span className="text-sm font-medium text-slate-800">{name}</span>
                        <span className="text-xs text-slate-500">Actiu</span>
                      </div>
                    )
                  )}
                </div>
              </div>
            ) : (
              <div
                className="rounded-3xl border border-slate-200 bg-slate-50 p-6"
                data-ai-action="remittance-workspace"
              >
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                      Remesa de quotes
                    </h2>
                    <p className="text-sm text-slate-500">
                      L&apos;acció persistent clau és el botó de generar remesa.
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                    Llest per generar
                  </span>
                </div>

                <div className="grid gap-4">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-sm font-medium text-slate-800">
                      24 quotes preparades
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Import total pendent de processar: 4.280,00 €
                    </p>
                  </div>

                  <button
                    className="inline-flex w-fit items-center rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-500"
                    data-ai-action="generate-remittance"
                    type="button"
                  >
                    Generar remesa
                  </button>
                </div>
              </div>
            )}
          </div>

          <aside className="rounded-[28px] border border-white/70 bg-slate-950/[0.92] p-6 text-white shadow-[0_25px_80px_rgba(15,23,42,0.22)] backdrop-blur-md">
            <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-sky-300">
              Context visible
            </p>
            <div className="mt-4 space-y-4 text-sm text-slate-200">
              <p>
                Ruta actual:{" "}
                <span className="font-semibold text-white">
                  {view === "donants" ? "/live?view=donants" : "/live?view=remittances"}
                </span>
              </p>
              <p>
                Query d&apos;onboarding:{" "}
                <span className="font-semibold text-white">
                  {searchParams.get("onboarding") === "true" ? "activa" : "inactiva"}
                </span>
              </p>
              <p className="leading-6 text-slate-300">
                Prova recomanada: “Vull generar una remesa” amb{" "}
                <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs text-sky-200">
                  ?onboarding=true
                </code>
              </p>
            </div>
          </aside>
        </section>
      </div>

      <OnboardingPill />
    </main>
  );
}
