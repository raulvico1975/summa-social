"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";

import { useAgentObserver, type AgentViewSnapshot } from "./useAgentObserver";

type ChatMessage = {
  content: string;
  role: "assistant" | "user";
};

type CopilotToolCall =
  | {
      args: { path: string };
      tool: "Maps_to";
    }
  | {
      args: { element_id: string };
      tool: "highlight_element";
    };

type CopilotResponse = {
  assistantMessage: string;
  model: string;
  toolCall?: CopilotToolCall | null;
};

type ToolValidationResult =
  | { ok: true; toolCall: CopilotToolCall }
  | { message: string; ok: false };

const ALLOWED_ROUTES = new Set(["/live?view=donants", "/live?view=remeses"]);

function useCurrentDemoView() {
  const searchParams = useSearchParams();
  const view = searchParams.get("view");
  if (view === "donants" || view === "remeses") {
    return view;
  }
  return "remeses";
}

export default function LiveDemoPage() {
  return (
    <Suspense fallback={<LiveDemoFallback />}>
      <LiveDemoClient />
    </Suspense>
  );
}

function LiveDemoClient() {
  const router = useRouter();
  const currentView = useCurrentDemoView();
  const observedContext = useAgentObserver(true);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      content: "Digues-me on t'has encallat i t'ajudo directament sobre la pantalla.",
      role: "assistant",
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [pending, setPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [highlightedAction, setHighlightedAction] = useState<string | null>(null);
  const [toolLog, setToolLog] = useState<string[]>([]);
  const [activeModel, setActiveModel] = useState<string>("encara no iniciat");
  const highlightTimeoutRef = useRef<number | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const fallbackContext = useMemo<AgentViewSnapshot>(
    () =>
      currentView === "donants"
        ? {
            currentRoute: "/live?view=donants",
            currentState: "45_donants_actius",
            currentView: "llista_donants",
            summary: "Vista de donants amb 45 registres actius i exportacio disponible.",
            visibleActions: ["obrir_remeses", "obrir_donants", "exportar_csv"],
            visibleStates: ["45_donants_actius"],
          }
        : {
            currentRoute: "/live?view=remeses",
            currentState: "errors_pendents",
            currentView: "panell_remeses",
            summary: "Vista de remeses amb una remesa pendent i un error d'exportacio per revisar.",
            visibleActions: ["obrir_remeses", "obrir_donants", "generar_sepa"],
            visibleStates: ["errors_pendents"],
          },
    [currentView],
  );

  const currentContext = observedContext || fallbackContext;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, pending]);

  const addToolLog = useCallback((entry: string) => {
    setToolLog((current) => [entry, ...current].slice(0, 6));
  }, []);

  const validateToolCall = useCallback(
    (toolCall: CopilotToolCall | null | undefined): ToolValidationResult | null => {
      if (!toolCall) {
        return null;
      }

      if (toolCall.tool === "Maps_to") {
        if (!ALLOWED_ROUTES.has(toolCall.args.path)) {
          return {
            ok: false,
            message: "Aquesta pantalla no està disponible en aquesta demo. Et guio només per les vistes reals que tenim obertes.",
          };
        }

        return { ok: true, toolCall };
      }

      if (!currentContext.visibleActions.includes(toolCall.args.element_id)) {
        return {
          ok: false,
          message: "Aquesta opció no està disponible aquí.",
        };
      }

      return { ok: true, toolCall };
    },
    [currentContext.visibleActions],
  );

  const triggerHighlight = useCallback(
    (elementId: string) => {
      setHighlightedAction(elementId);
      addToolLog(`highlight_element(${elementId})`);

      const node =
        document.querySelector<HTMLElement>(`[data-ai-action="${elementId}"]`) ||
        document.getElementById(elementId);
      node?.scrollIntoView({ behavior: "smooth", block: "center" });

      if (highlightTimeoutRef.current) {
        window.clearTimeout(highlightTimeoutRef.current);
      }
      highlightTimeoutRef.current = window.setTimeout(() => {
        setHighlightedAction(null);
      }, 2600);
    },
    [addToolLog],
  );

  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) {
        window.clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, []);

  const applyToolCall = useCallback(
    (toolCall: CopilotToolCall | null | undefined) => {
      if (!toolCall) {
        return;
      }

      if (toolCall.tool === "Maps_to") {
        addToolLog(`Maps_to(${toolCall.args.path})`);
        router.push(toolCall.args.path);
        return;
      }

      triggerHighlight(toolCall.args.element_id);
    },
    [addToolLog, router, triggerHighlight],
  );

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const trimmed = inputValue.trim();
      if (!trimmed || pending) {
        return;
      }

      const nextHistory = [...messages, { content: trimmed, role: "user" as const }];
      setMessages(nextHistory);
      setInputValue("");
      setPending(true);
      setErrorMessage(null);

      try {
        const response = await fetch("/api/copilot", {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            dom_context: currentContext,
            history: messages,
            message: trimmed,
          }),
        });

        const payload = (await response.json()) as CopilotResponse | { error: string };
        if (!response.ok || "error" in payload) {
          throw new Error(
            "error" in payload && payload.error.trim()
              ? payload.error
              : "No s'ha pogut executar el copilot.",
          );
        }

        setActiveModel(payload.model);
        const validation = validateToolCall(payload.toolCall);
        const assistantMessage =
          validation && !validation.ok ? validation.message : payload.assistantMessage;

        setMessages((current) => [
          ...current,
          { content: assistantMessage, role: "assistant" },
        ]);

        if (validation?.ok) {
          applyToolCall(validation.toolCall);
        }
      } catch (error) {
        console.error("Copilot submit failed", error);
        const message =
          error instanceof Error && error.message
            ? error.message
            : "No s'ha pogut executar el copilot.";
        setErrorMessage(message);
        setMessages((current) => [
          ...current,
          {
            content: "Ara mateix no puc actuar sobre la pantalla. Torna-ho a provar en un moment.",
            role: "assistant",
          },
        ]);
      } finally {
        setPending(false);
      }
    },
    [applyToolCall, currentContext, inputValue, messages, pending, validateToolCall],
  );

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top right, rgba(225, 237, 225, 0.95), transparent 32%), linear-gradient(180deg, #f6f1e6 0%, #ffffff 48%, #edf4ef 100%)",
        padding: "32px 18px 72px",
      }}
    >
      <div style={{ margin: "0 auto", maxWidth: 1320 }}>
        <section
          style={{
            display: "grid",
            gap: 24,
            gridTemplateColumns: "minmax(0, 1.15fr) minmax(340px, 0.85fr)",
            marginBottom: 26,
          }}
        >
          <article style={heroCardStyle}>
            <p style={eyebrowStyle}>Fase 2 · Text Copilot</p>
            <h1 style={heroTitleStyle}>
              Copilot contextual per guiar remeses i donants sense manuals ni tours.
            </h1>
            <p style={{ fontSize: 18, lineHeight: 1.65, margin: 0, maxWidth: 760 }}>
              Aquesta prova local manté la sandbox de Summa a l&apos;esquerra i hi afegeix
              un copilot de text a la dreta. El model llegeix el context del DOM, respon
              en català i pot canviar de vista o marcar botons directament.
            </p>
          </article>

          <article style={statusCardStyle}>
            <p style={eyebrowStyle}>Copilot</p>
            <p style={{ fontSize: 34, fontWeight: 800, margin: "12px 0 8px" }}>
              Text contextual
            </p>
            <p style={{ lineHeight: 1.6, margin: "0 0 18px" }}>
              Model actiu: {activeModel}.
            </p>
            <p
              style={{
                background: "rgba(255,255,255,0.08)",
                borderRadius: 16,
                lineHeight: 1.5,
                margin: "0 0 18px",
                padding: "12px 14px",
              }}
            >
              Escriu què vols fer i el copilot actuarà sobre la sandbox quan tingui clar si
              ha de navegar o destacar un element.
            </p>
            <div
              style={{
                background: "rgba(255,255,255,0.08)",
                borderRadius: 16,
                display: "grid",
                gap: 8,
                padding: "12px 14px",
              }}
            >
              <p style={{ lineHeight: 1.5, margin: 0 }}>
                <strong>Cas 1</strong>: “Vull anar a fer les remeses”
              </p>
              <p style={{ lineHeight: 1.5, margin: 0 }}>
                <strong>Cas 2</strong>: “No trobo el botó”
              </p>
            </div>
            {errorMessage ? (
              <p
                style={{
                  background: "#fff1f0",
                  borderRadius: 16,
                  color: "#7a2d20",
                  lineHeight: 1.5,
                  margin: "16px 0 0",
                  padding: "12px 14px",
                }}
              >
                {errorMessage}
              </p>
            ) : null}
          </article>
        </section>

        <section
          style={{
            display: "grid",
            gap: 24,
            gridTemplateColumns: "minmax(0, 1.5fr) minmax(360px, 0.9fr)",
          }}
        >
          <article
            style={{
              background: "rgba(255, 255, 255, 0.92)",
              border: "1px solid rgba(23, 49, 32, 0.12)",
              borderRadius: 28,
              boxShadow: "0 24px 70px rgba(33, 42, 35, 0.08)",
              overflow: "hidden",
            }}
          >
            <header
              style={{
                borderBottom: "1px solid rgba(23, 49, 32, 0.08)",
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
                padding: "18px 20px",
              }}
            >
              <div>
                <h2 style={{ margin: 0 }}>Sandbox de la demo</h2>
                <p style={{ margin: "6px 0 0", lineHeight: 1.55 }}>
                  DOM instrumentat amb `data-ai-view`, `data-ai-action` i `data-ai-state`.
                </p>
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  type="button"
                  data-ai-action="obrir_remeses"
                  onClick={() => router.push("/live?view=remeses")}
                  style={navButtonStyle(currentView === "remeses")}
                >
                  Remeses
                </button>
                <button
                  type="button"
                  data-ai-action="obrir_donants"
                  onClick={() => router.push("/live?view=donants")}
                  style={navButtonStyle(currentView === "donants")}
                >
                  Donants
                </button>
              </div>
            </header>

            <div style={{ padding: 20 }}>
              {currentView === "donants" ? (
                <DonantsView highlightedAction={highlightedAction} />
              ) : (
                <RemesesView highlightedAction={highlightedAction} />
              )}
            </div>
          </article>

          <aside style={{ display: "grid", gap: 18 }}>
            <article style={sideCardStyle}>
              <h3 style={{ margin: "0 0 10px" }}>Context observat</h3>
              <p style={{ color: "#4b6352", lineHeight: 1.6, margin: "0 0 12px" }}>
                {currentContext.summary}
              </p>
              <div style={{ display: "grid", gap: 10 }}>
                <DataPoint label="Ruta" value={currentContext.currentRoute} />
                <DataPoint label="Vista" value={currentContext.currentView || "Cap"} />
                <DataPoint
                  label="Accions visibles"
                  value={currentContext.visibleActions.join(", ") || "Cap"}
                />
                <DataPoint
                  label="Estats visibles"
                  value={currentContext.visibleStates.join(", ") || "Cap"}
                />
              </div>
            </article>

            <article style={{ ...sideCardStyle, padding: 0, overflow: "hidden" }}>
              <header
                style={{
                  borderBottom: "1px solid rgba(23, 49, 32, 0.08)",
                  padding: "20px 22px 14px",
                }}
              >
                <h3 style={{ margin: 0 }}>Copilot de text</h3>
                <p style={{ color: "#4b6352", lineHeight: 1.6, margin: "8px 0 0" }}>
                  Escriu què vols resoldre. El copilot decideix si ha de navegar o marcar
                  un element de la UI.
                </p>
              </header>

              <div
                style={{
                  display: "grid",
                  gap: 12,
                  maxHeight: 420,
                  overflowY: "auto",
                  padding: "18px 22px",
                }}
              >
                {messages.map((message, index) => (
                  <div
                    key={`${message.role}-${index}`}
                    style={{
                      background: message.role === "assistant" ? "#eef4ef" : "#f5f0e7",
                      borderRadius: 18,
                      justifySelf: message.role === "assistant" ? "stretch" : "end",
                      maxWidth: "92%",
                      padding: "12px 14px",
                    }}
                  >
                    <strong>{message.role === "assistant" ? "Copilot" : "Tu"}</strong>:{" "}
                    {message.content}
                  </div>
                ))}
                {pending ? (
                  <div
                    style={{
                      background: "#eef4ef",
                      borderRadius: 18,
                      padding: "12px 14px",
                    }}
                  >
                    <strong>Copilot</strong>: Ho miro i actuo sobre la pantalla.
                  </div>
                ) : null}
                <div ref={chatEndRef} />
              </div>

              <form
                onSubmit={handleSubmit}
                style={{
                  borderTop: "1px solid rgba(23, 49, 32, 0.08)",
                  display: "grid",
                  gap: 12,
                  padding: "16px 22px 22px",
                }}
              >
                <textarea
                  value={inputValue}
                  onChange={(event) => setInputValue(event.target.value)}
                  placeholder="Ex.: Vull anar a fer les remeses"
                  rows={3}
                  style={textareaStyle}
                />
                <button
                  type="submit"
                  disabled={pending || !inputValue.trim()}
                  style={{
                    ...actionButtonStyle,
                    background: pending || !inputValue.trim() ? "#aab7aa" : "#173120",
                    justifySelf: "start",
                  }}
                >
                  Enviar
                </button>
              </form>
            </article>

            <article style={sideCardStyle}>
              <h3 style={{ margin: "0 0 10px" }}>Consola del copilot</h3>
              <div style={{ display: "grid", gap: 10 }}>
                {toolLog.length === 0 ? (
                  <p style={{ color: "#4b6352", lineHeight: 1.6, margin: 0 }}>
                    Encara no hi ha cap acció executada. Prova de demanar un canvi de vista
                    o que et marqui un botó.
                  </p>
                ) : (
                  toolLog.map((entry, index) => (
                    <div
                      key={`${entry}-${index}`}
                      style={{
                        background: "#f4efe4",
                        borderRadius: 16,
                        padding: "10px 12px",
                      }}
                    >
                      {entry}
                    </div>
                  ))
                )}
              </div>
            </article>
          </aside>
        </section>
      </div>
    </main>
  );
}

function LiveDemoFallback() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f6f1e6",
        display: "grid",
        placeItems: "center",
      }}
    >
      <p style={{ fontSize: 18, margin: 0 }}>Preparant el copilot contextual…</p>
    </main>
  );
}

function DonantsView({ highlightedAction }: { highlightedAction: string | null }) {
  return (
    <section
      data-ai-view="llista_donants"
      data-ai-state="45_donants_actius"
      style={{ display: "grid", gap: 18 }}
    >
      <div style={panelHeaderStyle}>
        <div>
          <p style={panelEyebrowStyle}>Donants</p>
          <h3 style={{ margin: "6px 0 0" }}>45 donants actius</h3>
        </div>
        <button
          type="button"
          data-ai-action="exportar_csv"
          style={actionPillStyle(highlightedAction === "exportar_csv")}
        >
          Exportar CSV
        </button>
      </div>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={tableHeadStyle}>Nom</th>
            <th style={tableHeadStyle}>Última donació</th>
            <th style={tableHeadStyle}>Import</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={tableCellStyle}>Residència Sol Vell</td>
            <td style={tableCellStyle}>12 març 2026</td>
            <td style={tableCellStyle}>650 €</td>
          </tr>
          <tr>
            <td style={tableCellStyle}>Fundació Arrels Vives</td>
            <td style={tableCellStyle}>27 febr. 2026</td>
            <td style={tableCellStyle}>1.200 €</td>
          </tr>
          <tr>
            <td style={tableCellStyle}>Campanya Nadal</td>
            <td style={tableCellStyle}>18 gen. 2026</td>
            <td style={tableCellStyle}>320 €</td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}

function RemesesView({ highlightedAction }: { highlightedAction: string | null }) {
  return (
    <section
      data-ai-view="panell_remeses"
      data-ai-state="errors_pendents"
      style={{ display: "grid", gap: 18 }}
    >
      <div style={panelHeaderStyle}>
        <div>
          <p style={panelEyebrowStyle}>Remeses</p>
          <h3 style={{ margin: "6px 0 0" }}>1 remesa pendent de generar</h3>
        </div>
        <button
          type="button"
          data-ai-action="generar_sepa"
          style={actionPillStyle(highlightedAction === "generar_sepa")}
        >
          Generar SEPA
        </button>
      </div>

      <div
        style={{
          background: "#fff1f0",
          borderRadius: 20,
          padding: 16,
        }}
      >
        <strong>Incidència detectada</strong>
        <p style={{ lineHeight: 1.6, margin: "8px 0 0" }}>
          L&apos;última exportació va fallar perquè falta l&apos;IBAN d&apos;una quota.
        </p>
      </div>

      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={tableHeadStyle}>Lot</th>
            <th style={tableHeadStyle}>Quotes</th>
            <th style={tableHeadStyle}>Estat</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={tableCellStyle}>Abril 2026</td>
            <td style={tableCellStyle}>18</td>
            <td style={tableCellStyle}>Pendent</td>
          </tr>
          <tr>
            <td style={tableCellStyle}>Març 2026</td>
            <td style={tableCellStyle}>22</td>
            <td style={tableCellStyle}>Exportada</td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}

function DataPoint({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        background: "#f5f0e7",
        borderRadius: 16,
        padding: "10px 12px",
      }}
    >
      <p
        style={{
          fontSize: 12,
          fontWeight: 800,
          letterSpacing: "0.06em",
          margin: "0 0 4px",
          opacity: 0.7,
          textTransform: "uppercase",
        }}
      >
        {label}
      </p>
      <p style={{ lineHeight: 1.45, margin: 0 }}>{value}</p>
    </div>
  );
}

const heroCardStyle = {
  background: "rgba(255, 252, 246, 0.9)",
  border: "1px solid rgba(23, 49, 32, 0.12)",
  borderRadius: 28,
  boxShadow: "0 22px 60px rgba(33, 42, 35, 0.08)",
  padding: 28,
} satisfies CSSProperties;

const statusCardStyle = {
  background: "rgba(19, 47, 34, 0.96)",
  borderRadius: 28,
  boxShadow: "0 22px 60px rgba(33, 42, 35, 0.12)",
  color: "#f8f3ea",
  padding: 28,
} satisfies CSSProperties;

const sideCardStyle = {
  background: "rgba(255, 252, 246, 0.9)",
  border: "1px solid rgba(23, 49, 32, 0.12)",
  borderRadius: 24,
  boxShadow: "0 18px 50px rgba(33, 42, 35, 0.07)",
  padding: 22,
} satisfies CSSProperties;

const heroTitleStyle = {
  fontFamily: '"Iowan Old Style", "Palatino Linotype", serif',
  fontSize: "clamp(2.2rem, 4vw, 4rem)",
  lineHeight: 1.02,
  margin: "14px 0 16px",
} satisfies CSSProperties;

const eyebrowStyle = {
  color: "#c2b195",
  fontSize: 13,
  fontWeight: 800,
  letterSpacing: "0.12em",
  margin: 0,
  textTransform: "uppercase",
} satisfies CSSProperties;

const panelEyebrowStyle = {
  color: "#6d5430",
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: "0.08em",
  margin: 0,
  textTransform: "uppercase",
} satisfies CSSProperties;

const actionButtonStyle = {
  border: 0,
  borderRadius: 999,
  color: "#fff",
  cursor: "pointer",
  font: "inherit",
  fontWeight: 800,
  padding: "12px 18px",
} satisfies CSSProperties;

const textareaStyle = {
  background: "#fff",
  border: "1px solid rgba(23, 49, 32, 0.12)",
  borderRadius: 18,
  color: "#173120",
  font: "inherit",
  lineHeight: 1.6,
  minHeight: 88,
  padding: "12px 14px",
  resize: "vertical",
  width: "100%",
} satisfies CSSProperties;

const panelHeaderStyle = {
  alignItems: "center",
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
} satisfies CSSProperties;

const tableStyle = {
  borderCollapse: "collapse",
  width: "100%",
} satisfies CSSProperties;

const tableHeadStyle = {
  borderBottom: "1px solid rgba(23, 49, 32, 0.12)",
  padding: "12px 10px",
  textAlign: "left",
} satisfies CSSProperties;

const tableCellStyle = {
  borderBottom: "1px solid rgba(23, 49, 32, 0.08)",
  padding: "12px 10px",
} satisfies CSSProperties;

function navButtonStyle(active: boolean): CSSProperties {
  return {
    background: active ? "#173120" : "#f5f0e7",
    border: `1px solid ${active ? "#173120" : "rgba(23, 49, 32, 0.16)"}`,
    borderRadius: 999,
    color: active ? "#fff" : "#173120",
    cursor: "pointer",
    font: "inherit",
    fontWeight: 700,
    padding: "10px 14px",
  };
}

function actionPillStyle(active: boolean): CSSProperties {
  return {
    background: active ? "#173120" : "#edf5ee",
    border: `2px solid ${active ? "#d6b262" : "transparent"}`,
    borderRadius: 999,
    color: active ? "#fff" : "#173120",
    cursor: "pointer",
    font: "inherit",
    fontWeight: 800,
    padding: "11px 16px",
    transition: "all 180ms ease",
    boxShadow: active ? "0 0 0 6px rgba(214, 178, 98, 0.18)" : "none",
  };
}
