"use client";

import Script from "next/script";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";

import { useAgentObserver, type AgentViewSnapshot } from "./useAgentObserver";

type StartResponse = {
  model: string;
  room_url: string;
  session_id: string;
  token: string;
  websocket_url: string;
};

type ToolEvent =
  | {
      tool: "highlight_element";
      type: "tool_event";
      payload: { element_ai_id: string };
    }
  | {
      tool: "Maps_to";
      type: "tool_event";
      payload: { route_path: string };
    };

type DailyEventHandler = (event?: unknown) => void;

type DailyCallObject = {
  destroy(): void;
  join(args: { token: string; url: string; userName?: string }): Promise<void>;
  leave(): Promise<void>;
  off(eventName: string, handler?: DailyEventHandler): void;
  on(eventName: string, handler: DailyEventHandler): void;
};

declare global {
  interface Window {
    DailyIframe?: {
      createCallObject(): DailyCallObject;
    };
  }
}

type LogItem = {
  label: string;
  value: string;
};

function demoStatusLabel(status: string) {
  switch (status) {
    case "connected":
      return "Connectat";
    case "connecting":
      return "Connectant";
    case "error":
      return "Amb incidència";
    default:
      return "Desconnectat";
  }
}

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
  const [status, setStatus] = useState<"connected" | "connecting" | "disconnected" | "error">(
    "disconnected",
  );
  const [scriptReady, setScriptReady] = useState(false);
  const [sessionInfo, setSessionInfo] = useState<StartResponse | null>(null);
  const [toolLog, setToolLog] = useState<LogItem[]>([]);
  const [highlightedAction, setHighlightedAction] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastContext, setLastContext] = useState<AgentViewSnapshot | null>(null);
  const callObjectRef = useRef<DailyCallObject | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const connectInfoRef = useRef<StartResponse | null>(null);
  const highlightTimeoutRef = useRef<number | null>(null);

  const addLog = useCallback((label: string, value: string) => {
    setToolLog((current) => [
      { label, value },
      ...current,
    ].slice(0, 8));
  }, []);

  const disconnect = useCallback(async () => {
    if (highlightTimeoutRef.current) {
      window.clearTimeout(highlightTimeoutRef.current);
      highlightTimeoutRef.current = null;
    }

    socketRef.current?.close();
    socketRef.current = null;

    if (callObjectRef.current) {
      try {
        await callObjectRef.current.leave();
      } catch (error) {
        console.error("Daily leave failed", error);
      }
      try {
        callObjectRef.current.destroy();
      } catch (error) {
        console.error("Daily destroy failed", error);
      }
      callObjectRef.current = null;
    }

    connectInfoRef.current = null;
    setHighlightedAction(null);
    setSessionInfo(null);
    setStatus("disconnected");
  }, []);

  useEffect(() => {
    return () => {
      void disconnect();
    };
  }, [disconnect]);

  const handleToolEvent = useCallback(
    (event: ToolEvent) => {
      if (event.tool === "highlight_element") {
        const elementId = event.payload.element_ai_id;
        setHighlightedAction(elementId);
        addLog("Tool", `highlight_element(${elementId})`);
        if (highlightTimeoutRef.current) {
          window.clearTimeout(highlightTimeoutRef.current);
        }
        highlightTimeoutRef.current = window.setTimeout(() => {
          setHighlightedAction(null);
        }, 2800);
        return;
      }

      if (event.tool === "Maps_to") {
        addLog("Tool", `Maps_to(${event.payload.route_path})`);
        router.push(event.payload.route_path);
      }
    },
    [addLog, router],
  );

  const sendContext = useCallback(
    (snapshot: AgentViewSnapshot) => {
      setLastContext(snapshot);
      const socket = socketRef.current;
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        return;
      }
      socket.send(
        JSON.stringify({
          payload: snapshot,
          type: "ui_context",
        }),
      );
    },
    [],
  );

  useAgentObserver(status === "connected", sendContext);

  const connect = useCallback(async () => {
    if (!scriptReady || status === "connecting" || status === "connected") {
      return;
    }

    if (!window.DailyIframe) {
      setStatus("error");
      setErrorMessage("Daily JS encara no està disponible al navegador.");
      return;
    }

    setErrorMessage(null);
    setStatus("connecting");
    addLog("Sessió", "Arrencant el demo-agent Live");

    try {
      const startResponse = await fetch("/api/live/start", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
      });

      const payload = (await startResponse.json()) as StartResponse | { error: string };
      if (!startResponse.ok || "error" in payload) {
        const message =
          "error" in payload && typeof payload.error === "string" && payload.error.trim()
            ? payload.error.trim()
            : "No s'ha pogut arrencar el demo-agent.";
        throw new Error(message);
      }

      connectInfoRef.current = payload;
      setSessionInfo(payload);

      const socket = new WebSocket(payload.websocket_url);
      socketRef.current = socket;
      socket.addEventListener("open", () => {
        addLog("WebSocket", "Context UI connectat");
      });
      socket.addEventListener("message", (event) => {
        const data = JSON.parse(String(event.data)) as ToolEvent | { type: string };
        if (data.type === "tool_event") {
          handleToolEvent(data as ToolEvent);
        }
      });
      socket.addEventListener("close", () => {
        addLog("WebSocket", "Canal de context tancat");
      });

      const callObject = window.DailyIframe.createCallObject();
      callObjectRef.current = callObject;

      callObject.on("joined-meeting", () => {
        setStatus("connected");
        addLog("Daily", "Audio bidireccional connectat");
      });
      callObject.on("left-meeting", () => {
        setStatus("disconnected");
        addLog("Daily", "Sessió Daily tancada");
      });
      callObject.on("error", (event) => {
        console.error("Daily error", event);
        setStatus("error");
        setErrorMessage("La sessió Daily ha fallat.");
      });

      await callObject.join({
        token: payload.token,
        url: payload.room_url,
        userName: "Responsable economic",
      });
    } catch (error) {
      console.error("Live connect failed", error);
      setStatus("error");
      setErrorMessage(
        error instanceof Error && error.message
          ? error.message
          : "No s'ha pogut connectar la demo Live.",
      );
    }
  }, [addLog, handleToolEvent, scriptReady, status]);

  const visibleSummary = useMemo(() => {
    if (currentView === "donants") {
      return "Vista de donants amb 45 registres actius i exportacio disponible.";
    }
    return "Vista de remeses amb una remesa pendent i un error d'exportacio per revisar.";
  }, [currentView]);

  return (
    <>
      <Script
        src="https://unpkg.com/@daily-co/daily-js"
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
      />

      <main
        style={{
          minHeight: "100vh",
          background:
            "radial-gradient(circle at top right, rgba(225, 237, 225, 0.95), transparent 32%), linear-gradient(180deg, #f6f1e6 0%, #ffffff 48%, #edf4ef 100%)",
          padding: "32px 18px 72px",
        }}
      >
        <div style={{ margin: "0 auto", maxWidth: 1240 }}>
          <section
            style={{
              display: "grid",
              gap: 24,
              gridTemplateColumns: "minmax(0, 1.2fr) minmax(280px, 0.8fr)",
              marginBottom: 26,
            }}
          >
            <article style={heroCardStyle}>
              <p style={eyebrowStyle}>Fase 2 · Demo-Agent Live</p>
              <h1 style={heroTitleStyle}>
                Guia de veu calmada per pantalles reals de tresoreria i donants.
              </h1>
              <p style={{ fontSize: 18, lineHeight: 1.65, margin: 0, maxWidth: 700 }}>
                Aquesta prova de concepte manté el pilot aïllat. L&apos;usuari escolta
                una guia oral sobre el que té davant, mentre el model rep context
                estructurat del DOM i pot destacar accions o navegar entre pantalles.
              </p>
            </article>

            <article style={statusCardStyle}>
              <p style={eyebrowStyle}>Sessió Live</p>
              <p style={{ fontSize: 34, fontWeight: 800, margin: "12px 0 8px" }}>
                {demoStatusLabel(status)}
              </p>
              <p style={{ lineHeight: 1.6, margin: "0 0 18px" }}>
                Model actiu: {sessionInfo?.model || "encara no iniciat"}.
              </p>
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="button"
                  disabled={!scriptReady || status === "connecting" || status === "connected"}
                  onClick={() => void connect()}
                  style={{
                    ...actionButtonStyle,
                    background:
                      !scriptReady || status === "connecting" || status === "connected"
                        ? "#9eae9f"
                        : "#173120",
                  }}
                >
                  Connectar veu
                </button>
                <button
                  type="button"
                  onClick={() => void disconnect()}
                  style={{
                    ...actionButtonStyle,
                    background: "#e7dfd0",
                    color: "#173120",
                  }}
                >
                  Tancar sessió
                </button>
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
              gridTemplateColumns: "minmax(0, 1.5fr) minmax(300px, 0.9fr)",
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
                    Dom instrumentat amb `data-ai-view`, `data-ai-action` i `data-ai-state`.
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
                  {lastContext?.summary || visibleSummary}
                </p>
                <div style={{ display: "grid", gap: 10 }}>
                  <DataPoint label="Ruta" value={lastContext?.currentRoute || `/live?view=${currentView}`} />
                  <DataPoint label="Vista" value={lastContext?.currentView || currentView} />
                  <DataPoint
                    label="Accions visibles"
                    value={(lastContext?.visibleActions || []).join(", ") || "Cap"}
                  />
                  <DataPoint
                    label="Estats visibles"
                    value={(lastContext?.visibleStates || []).join(", ") || "Cap"}
                  />
                </div>
              </article>

              <article style={sideCardStyle}>
                <h3 style={{ margin: "0 0 10px" }}>Consola del guia</h3>
                <div style={{ display: "grid", gap: 10 }}>
                  {toolLog.length === 0 ? (
                    <p style={{ color: "#4b6352", lineHeight: 1.6, margin: 0 }}>
                      Encara no hi ha tools executades. Connecta la sessió i parla amb
                      l&apos;agent per provar `highlight_element` o `Maps_to`.
                    </p>
                  ) : (
                    toolLog.map((item, index) => (
                      <div
                        key={`${item.label}-${index}`}
                        style={{
                          background: "#f4efe4",
                          borderRadius: 16,
                          padding: "10px 12px",
                        }}
                      >
                        <strong>{item.label}</strong>: {item.value}
                      </div>
                    ))
                  )}
                </div>
              </article>

              <article style={sideCardStyle}>
                <h3 style={{ margin: "0 0 10px" }}>Guardrails</h3>
                <ul style={{ lineHeight: 1.7, margin: 0, paddingLeft: 18 }}>
                  <li>Guia de plataforma, no assessor fiscal.</li>
                  <li>No llegeix pantalles senceres; només resumeix.</li>
                  <li>Només pot destacar elements o navegar dins `/live`.</li>
                </ul>
              </article>
            </aside>
          </section>
        </div>
      </main>
    </>
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
      <p style={{ fontSize: 18, margin: 0 }}>Preparant la demo Live…</p>
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
