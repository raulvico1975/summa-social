"use client";

import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";

import {
  buildWebAgentRequest,
  createEmptyProfile,
  isWebAgentResponse,
  mergeKnownProfile,
  type ChoiceSelectorProps,
  type ConversationMessage,
  type FeatureCardProps,
  type KnownProfile,
  type LeadCaptureFormProps,
  type QualificationSummaryProps,
  type UiAction,
  type WebAgentResponse,
  WEB_AGENT_API_URL,
} from "../lib/web-agent";

type LeadDraft = {
  email: string;
  entity: string;
  name: string;
  phone: string;
};

function detectLocale(): string {
  if (typeof navigator === "undefined") {
    return "ca";
  }
  return navigator.language?.slice(0, 2) || "ca";
}

function statusLabel(status: WebAgentResponse["fit_assessment"] | null) {
  switch (status) {
    case "good_fit":
      return "Bon encaix";
    case "uncertain_fit":
      return "Encaix incert";
    case "low_fit":
      return "Poc encaix";
    default:
      return "Sense conclusió";
  }
}

function nextStepLabel(nextStep: WebAgentResponse["recommended_next_step"] | null) {
  switch (nextStep) {
    case "offer_demo":
      return "Convidar a demo";
    case "capture_contact":
      return "Captar contacte";
    case "show_value":
      return "Aportar valor";
    case "disqualify":
      return "Desqualificar";
    default:
      return "Demanar més senyal";
  }
}

function compactProfile(profile: KnownProfile) {
  return [
    ["Tipus d'entitat", profile.entity_type],
    ["Equip implicat", profile.team_size],
    ["Dolor principal", profile.primary_pain],
    ["Motiu d'exclusió", profile.exclusion_reason],
  ].filter(([, value]) => Boolean(value));
}

export default function DiagnosisAgent() {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [knownProfile, setKnownProfile] = useState<KnownProfile>(createEmptyProfile);
  const [activeAction, setActiveAction] = useState<UiAction | null>(null);
  const [leadDraft, setLeadDraft] = useState<LeadDraft>({
    email: "",
    entity: "",
    name: "",
    phone: "",
  });
  const [qualificationStatus, setQualificationStatus] =
    useState<WebAgentResponse["fit_assessment"] | null>(null);
  const [nextQuestion, setNextQuestion] = useState<string | null>(null);
  const [qualificationSummary, setQualificationSummary] = useState<string | null>(null);
  const [nextStep, setNextStep] =
    useState<WebAgentResponse["recommended_next_step"] | null>(null);
  const [pendingMessage, setPendingMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initRef = useRef(false);
  const profileRef = useRef<KnownProfile>(createEmptyProfile());

  useEffect(() => {
    if (initRef.current) {
      return;
    }
    initRef.current = true;
    void requestAssistant([]);
  }, []);

  async function requestAssistant(history: ConversationMessage[]) {
    setBusy(true);
    setError(null);

    try {
      const response = await fetch(`${WEB_AGENT_API_URL}/api/web-agent`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(
          buildWebAgentRequest(detectLocale(), history, profileRef.current),
        ),
      });

      const payload = (await response.json()) as unknown;
      if (!response.ok) {
        throw new Error(
          typeof payload === "object" &&
            payload !== null &&
            "error" in payload &&
            typeof payload.error === "string"
            ? payload.error
            : "El backend no ha pogut respondre.",
        );
      }

      if (!isWebAgentResponse(payload)) {
        throw new Error("La resposta del web-agent no compleix el contracte JSON.");
      }

      const nextProfile = mergeKnownProfile(profileRef.current, payload.signals_collected);
      profileRef.current = nextProfile;
      setKnownProfile(nextProfile);
      setMessages((current) => [...current, { role: "assistant", text: payload.agent_message }]);
      setQualificationStatus(payload.fit_assessment);
      setNextQuestion(payload.next_question);
      setQualificationSummary(payload.qualification_summary);
      setNextStep(payload.recommended_next_step);
      setActiveAction(payload.ui_action.type === "render_component" ? payload.ui_action : null);
    } catch (caughtError) {
      console.error("web-agent request failed", caughtError);
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "No s'ha pogut completar el diagnòstic.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleSend(rawText: string) {
    const text = rawText.trim();
    if (!text || busy) {
      return;
    }

    setActiveAction(null);
    setPendingMessage("");

    const nextHistory = [...messages, { role: "user", text }] satisfies ConversationMessage[];
    setMessages(nextHistory);
    await requestAssistant(nextHistory);
  }

  async function handleLeadSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const summary = [
      `Nom: ${leadDraft.name || "-"}`,
      `Entitat: ${leadDraft.entity || "-"}`,
      `Email: ${leadDraft.email || "-"}`,
      `Telèfon: ${leadDraft.phone || "-"}`,
    ].join(" · ");
    await handleSend(`Dades de contacte per continuar: ${summary}`);
  }

  const profileRows = compactProfile(knownProfile);

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top left, rgba(239, 222, 188, 0.9), transparent 34%), linear-gradient(180deg, #f4efe4 0%, #ffffff 52%, #ebf3ec 100%)",
        padding: "36px 18px 72px",
      }}
    >
      <div style={{ margin: "0 auto", maxWidth: 1180 }}>
        <section
          style={{
            display: "grid",
            gap: 24,
            gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))",
            marginBottom: 28,
          }}
        >
          <article
            style={{
              background: "rgba(255, 252, 246, 0.88)",
              border: "1px solid rgba(23, 49, 32, 0.12)",
              borderRadius: 28,
              boxShadow: "0 22px 60px rgba(33, 42, 35, 0.08)",
              padding: 28,
            }}
          >
            <p
              style={{
                color: "#6d5430",
                fontSize: 13,
                fontWeight: 800,
                letterSpacing: "0.12em",
                margin: 0,
                textTransform: "uppercase",
              }}
            >
              Fase 1 · Web-Agent
            </p>
            <h1
              style={{
                fontFamily: '"Iowan Old Style", "Palatino Linotype", serif',
                fontSize: "clamp(2.5rem, 5vw, 4.6rem)",
                lineHeight: 1.02,
                margin: "14px 0 16px",
              }}
            >
              Diagnòstic text-first per veure si Summa encaixa.
            </h1>
            <p style={{ fontSize: 18, lineHeight: 1.65, margin: 0, maxWidth: 640 }}>
              Aquest pilot no fa veu, ni demo guiada, ni suport. Aquí només validem
              una conversa curta, clara i accionable que porti a una conclusió
              d&apos;encaix i al següent pas correcte.
            </p>
          </article>

          <article
            style={{
              background: "rgba(19, 47, 34, 0.96)",
              borderRadius: 28,
              boxShadow: "0 22px 60px rgba(33, 42, 35, 0.12)",
              color: "#f8f3ea",
              padding: 28,
            }}
          >
            <p style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.12em", margin: 0, textTransform: "uppercase" }}>
              Estat del diagnòstic
            </p>
            <p
              style={{
                fontFamily: '"Iowan Old Style", "Palatino Linotype", serif',
                fontSize: 34,
                lineHeight: 1.1,
                margin: "14px 0 10px",
              }}
            >
              {statusLabel(qualificationStatus)}
            </p>
            <p style={{ lineHeight: 1.6, margin: "0 0 18px" }}>
              Proper pas: {nextStepLabel(nextStep)}.
            </p>
            <div
              style={{
                background: "rgba(255, 255, 255, 0.08)",
                borderRadius: 20,
                padding: 18,
              }}
            >
              <p style={{ fontWeight: 700, margin: "0 0 10px" }}>El que busquem validar</p>
              <ul style={{ lineHeight: 1.7, margin: 0, paddingLeft: 20 }}>
                <li>Que no soni com un formulari disfressat.</li>
                <li>Que conclogui amb criteri i sense inventar.</li>
                <li>Que derivi cap a demo o contacte quan toca.</li>
              </ul>
            </div>
          </article>
        </section>

        <section
          style={{
            display: "grid",
            gap: 24,
            gridTemplateColumns: "minmax(0, 1.6fr) minmax(300px, 0.9fr)",
          }}
        >
          <article
            style={{
              background: "rgba(255, 255, 255, 0.9)",
              border: "1px solid rgba(23, 49, 32, 0.12)",
              borderRadius: 28,
              boxShadow: "0 24px 70px rgba(33, 42, 35, 0.08)",
              overflow: "hidden",
            }}
          >
            <header
              style={{
                borderBottom: "1px solid rgba(23, 49, 32, 0.09)",
                display: "flex",
                gap: 14,
                justifyContent: "space-between",
                padding: "18px 20px",
                flexWrap: "wrap",
              }}
            >
              <div>
                <h2 style={{ margin: 0 }}>Conversa de qualificació</h2>
                <p style={{ margin: "6px 0 0", lineHeight: 1.5 }}>
                  Conversa curta i pragmàtica. No intenta salvar leads dubtosos.
                </p>
              </div>
              <div
                style={{
                  alignItems: "center",
                  display: "inline-flex",
                  gap: 10,
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                <span
                  style={{
                    background: busy ? "#d08a1b" : "#1f7a4f",
                    borderRadius: 999,
                    display: "inline-block",
                    height: 10,
                    width: 10,
                  }}
                />
                {busy ? "Processant..." : "Contracte JSON actiu"}
              </div>
            </header>

            <div style={{ minHeight: 360, padding: 20 }}>
              {messages.length === 0 ? (
                <p style={{ color: "#4b6352", lineHeight: 1.6, margin: 0 }}>
                  Arrencant la primera pregunta del diagnòstic...
                </p>
              ) : (
                <div style={{ display: "grid", gap: 14 }}>
                  {messages.map((message, index) => (
                    <article
                      key={`${message.role}-${index}`}
                      style={{
                        background:
                          message.role === "assistant"
                            ? "linear-gradient(135deg, rgba(233, 242, 234, 0.96), rgba(247, 250, 244, 0.92))"
                            : "linear-gradient(135deg, rgba(23, 49, 32, 0.96), rgba(36, 72, 53, 0.92))",
                        borderRadius: 22,
                        color: message.role === "assistant" ? "#173120" : "#f8f3ea",
                        justifySelf: message.role === "assistant" ? "start" : "end",
                        maxWidth: "85%",
                        padding: "16px 18px",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      <p
                        style={{
                          fontSize: 12,
                          fontWeight: 800,
                          letterSpacing: "0.08em",
                          margin: "0 0 8px",
                          opacity: 0.75,
                          textTransform: "uppercase",
                        }}
                      >
                        {message.role === "assistant" ? "Summa" : "Entitat"}
                      </p>
                      <p style={{ lineHeight: 1.65, margin: 0 }}>{message.text}</p>
                    </article>
                  ))}
                </div>
              )}

              {activeAction ? (
                <div
                  style={{
                    marginTop: 18,
                    paddingTop: 18,
                    borderTop: "1px solid rgba(23, 49, 32, 0.09)",
                  }}
                >
                  <RichAction
                    action={activeAction}
                    busy={busy}
                    leadDraft={leadDraft}
                    onLeadDraftChange={setLeadDraft}
                    onLeadSubmit={handleLeadSubmit}
                    onQuickReply={handleSend}
                    qualificationStatus={qualificationStatus}
                  />
                </div>
              ) : null}

              {nextQuestion ? (
                <div
                  style={{
                    background: "#f7f3ea",
                    borderRadius: 18,
                    lineHeight: 1.55,
                    marginTop: 18,
                    padding: "14px 16px",
                  }}
                >
                  <strong>Pregunta següent:</strong> {nextQuestion}
                </div>
              ) : null}

              {error ? (
                <div
                  style={{
                    background: "#fff1f0",
                    border: "1px solid #e6b8b2",
                    borderRadius: 18,
                    color: "#7a2d20",
                    lineHeight: 1.55,
                    marginTop: 18,
                    padding: "14px 16px",
                  }}
                >
                  {error}
                </div>
              ) : null}
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                void handleSend(pendingMessage);
              }}
              style={{
                borderTop: "1px solid rgba(23, 49, 32, 0.09)",
                display: "grid",
                gap: 12,
                padding: 20,
              }}
            >
              <label htmlFor="message" style={{ fontSize: 14, fontWeight: 700 }}>
                Explica la vostra situació
              </label>
              <textarea
                id="message"
                value={pendingMessage}
                onChange={(event) => setPendingMessage(event.target.value)}
                placeholder="Exemple: Som una fundació petita amb moltes quotes i massa treball manual al banc."
                rows={4}
                style={{
                  border: "1px solid rgba(23, 49, 32, 0.18)",
                  borderRadius: 18,
                  font: "inherit",
                  minHeight: 120,
                  padding: 16,
                  resize: "vertical",
                }}
              />
              <div
                style={{
                  alignItems: "center",
                  display: "flex",
                  gap: 14,
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                }}
              >
                <p style={{ color: "#4b6352", fontSize: 14, margin: 0 }}>
                  L&apos;agent ha de qualificar, desqualificar o deixar un següent pas clar.
                </p>
                <button
                  type="submit"
                  disabled={busy || !pendingMessage.trim()}
                  style={{
                    background: busy || !pendingMessage.trim() ? "#a2b1a5" : "#173120",
                    border: 0,
                    borderRadius: 999,
                    color: "#fff",
                    cursor: busy || !pendingMessage.trim() ? "not-allowed" : "pointer",
                    font: "inherit",
                    fontWeight: 800,
                    padding: "12px 18px",
                  }}
                >
                  Enviar
                </button>
              </div>
            </form>
          </article>

          <aside style={{ display: "grid", gap: 18 }}>
            <article
              style={{
                background: "rgba(255, 252, 246, 0.9)",
                border: "1px solid rgba(23, 49, 32, 0.12)",
                borderRadius: 24,
                boxShadow: "0 18px 50px rgba(33, 42, 35, 0.07)",
                padding: 22,
              }}
            >
              <h3
                style={{
                  fontFamily: '"Iowan Old Style", "Palatino Linotype", serif',
                  fontSize: 28,
                  margin: "0 0 12px",
                }}
              >
                Senyals recollits
              </h3>
              {qualificationSummary ? (
                <div
                  style={{
                    background:
                      qualificationStatus === "low_fit" ? "#fff1f0" : "#edf5ee",
                    borderRadius: 18,
                    lineHeight: 1.55,
                    marginBottom: 14,
                    padding: "12px 14px",
                  }}
                >
                  <p
                    style={{
                      fontSize: 12,
                      fontWeight: 800,
                      letterSpacing: "0.06em",
                      margin: "0 0 4px",
                      opacity: 0.72,
                      textTransform: "uppercase",
                    }}
                  >
                    Resum de qualificació
                  </p>
                  <p style={{ margin: 0 }}>{qualificationSummary}</p>
                </div>
              ) : null}
              {profileRows.length === 0 ? (
                <p style={{ color: "#4b6352", lineHeight: 1.6, margin: 0 }}>
                  Encara no tenim prou senyal. El diagnòstic ha d&apos;omplir aquest
                  bloc de manera progressiva.
                </p>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {profileRows.map(([label, value]) => (
                    <div
                      key={label}
                      style={{
                        background: "#f5f0e7",
                        borderRadius: 18,
                        padding: "12px 14px",
                      }}
                    >
                      <p
                        style={{
                          fontSize: 12,
                          fontWeight: 800,
                          letterSpacing: "0.06em",
                          margin: "0 0 4px",
                          opacity: 0.72,
                          textTransform: "uppercase",
                        }}
                      >
                        {label}
                      </p>
                      <p style={{ lineHeight: 1.5, margin: 0 }}>{value}</p>
                    </div>
                  ))}
                </div>
              )}
            </article>

            <article
              style={{
                background: "rgba(19, 47, 34, 0.96)",
                borderRadius: 24,
                color: "#f8f3ea",
                padding: 22,
              }}
            >
              <h3 style={{ margin: "0 0 12px" }}>Límits d&apos;aquesta fase</h3>
              <ul style={{ lineHeight: 1.7, margin: 0, paddingLeft: 20 }}>
                <li>No hi ha veu ni Live real.</li>
                <li>No hi ha demo-agent ni support-agent.</li>
                <li>No s&apos;integra amb el suport ni amb el core de Summa.</li>
              </ul>
            </article>
          </aside>
        </section>
      </div>
    </main>
  );
}

function RichAction({
  action,
  busy,
  leadDraft,
  onLeadDraftChange,
  onLeadSubmit,
  onQuickReply,
  qualificationStatus,
}: {
  action: UiAction;
  busy: boolean;
  leadDraft: LeadDraft;
  onLeadDraftChange: (draft: LeadDraft) => void;
  onLeadSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onQuickReply: (text: string) => Promise<void>;
  qualificationStatus: WebAgentResponse["fit_assessment"] | null;
}) {
  if (action.component === "ChoiceSelector") {
    const props = action.props as ChoiceSelectorProps;
    const options = Array.isArray(props.options) ? props.options : [];

    return (
      <section>
        <p style={{ fontWeight: 700, margin: "0 0 12px" }}>
          {props.label || "Selecciona l'opció que us descriu millor"}
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              disabled={busy}
              onClick={() => void onQuickReply(option.label)}
              style={{
                background: "#f5f0e7",
                border: "1px solid rgba(23, 49, 32, 0.14)",
                borderRadius: 999,
                color: "#173120",
                cursor: busy ? "not-allowed" : "pointer",
                font: "inherit",
                fontWeight: 700,
                padding: "10px 14px",
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>
    );
  }

  if (action.component === "FeatureCard") {
    const props = action.props as FeatureCardProps;
    const bullets = Array.isArray(props.bullets) ? props.bullets : [];

    return (
      <section
        style={{
          background: "#f5f0e7",
          borderRadius: 22,
          padding: 18,
        }}
      >
        <h3 style={{ margin: "0 0 8px" }}>{props.title || "Com us podria ajudar Summa"}</h3>
        <p style={{ lineHeight: 1.6, margin: "0 0 12px" }}>
          {props.body || "Això apunta a un valor concret de Summa per aquest cas."}
        </p>
        {bullets.length > 0 ? (
          <ul style={{ lineHeight: 1.7, margin: "0 0 14px", paddingLeft: 20 }}>
            {bullets.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>
        ) : null}
        {props.ctaLabel && props.ctaMessage ? (
          <button
            type="button"
            onClick={() => void onQuickReply(props.ctaMessage || "")}
            style={{
              background: "#173120",
              border: 0,
              borderRadius: 999,
              color: "#fff",
              cursor: "pointer",
              font: "inherit",
              fontWeight: 800,
              padding: "10px 14px",
            }}
          >
            {props.ctaLabel}
          </button>
        ) : null}
      </section>
    );
  }

  if (action.component === "LeadCaptureForm") {
    const props = action.props as LeadCaptureFormProps;
    const fields = Array.isArray(props.fields) ? props.fields : [];
    const requestedIds = new Set(fields.map((field) => field.id));

    return (
      <form
        onSubmit={onLeadSubmit}
        style={{
          background: "#f5f0e7",
          borderRadius: 22,
          display: "grid",
          gap: 12,
          padding: 18,
        }}
      >
        <div>
          <h3 style={{ margin: "0 0 8px" }}>
            {props.headline || "Si voleu, deixeu les dades i continuem"}
          </h3>
          <p style={{ lineHeight: 1.6, margin: 0 }}>
            {props.description || "Això només serveix per deixar el contacte si realment hi ha encaix."}
          </p>
        </div>

        <input
          value={leadDraft.name}
          onChange={(event) =>
            onLeadDraftChange({ ...leadDraft, name: event.target.value })
          }
          placeholder={
            fields.find((field) => field.id === "name")?.placeholder || "Nom i cognoms"
          }
          style={fieldStyle}
          type="text"
        />
        <input
          value={leadDraft.entity}
          onChange={(event) =>
            onLeadDraftChange({ ...leadDraft, entity: event.target.value })
          }
          placeholder={
            fields.find((field) => field.id === "entity")?.placeholder || "Nom de l'entitat"
          }
          style={fieldStyle}
          type="text"
        />
        <input
          value={leadDraft.email}
          onChange={(event) =>
            onLeadDraftChange({ ...leadDraft, email: event.target.value })
          }
          placeholder={
            fields.find((field) => field.id === "email")?.placeholder || "Correu electrònic"
          }
          style={fieldStyle}
          type="email"
        />
        <input
          value={leadDraft.phone}
          onChange={(event) =>
            onLeadDraftChange({ ...leadDraft, phone: event.target.value })
          }
          placeholder={
            fields.find((field) => field.id === "phone")?.placeholder || "Telèfon (opcional)"
          }
          style={fieldStyle}
          type="tel"
        />
        <div style={{ display: "flex", gap: 10, justifyContent: "space-between", flexWrap: "wrap" }}>
          <p style={{ color: "#4b6352", fontSize: 14, margin: 0 }}>
            {requestedIds.size > 0
              ? `Camps demanats: ${Array.from(requestedIds).join(", ")}`
              : "Cap camp s'envia fins que premis continuar."}
          </p>
          <button
            type="submit"
            disabled={busy || !leadDraft.name || !leadDraft.email}
            style={{
              background:
                busy || !leadDraft.name || !leadDraft.email ? "#a2b1a5" : "#173120",
              border: 0,
              borderRadius: 999,
              color: "#fff",
              cursor:
                busy || !leadDraft.name || !leadDraft.email ? "not-allowed" : "pointer",
              font: "inherit",
              fontWeight: 800,
              padding: "10px 14px",
            }}
          >
            Continuar
          </button>
        </div>
      </form>
    );
  }

  if (action.component === "QualificationSummaryCard") {
    const props = action.props as QualificationSummaryProps;
    const bullets = Array.isArray(props.bullets) ? props.bullets : [];

    return (
      <section
        style={{
          background:
            qualificationStatus === "low_fit"
              ? "#fff1f0"
              : "linear-gradient(135deg, rgba(233, 242, 234, 0.96), rgba(247, 250, 244, 0.92))",
          borderRadius: 22,
          padding: 18,
        }}
      >
        <h3 style={{ margin: "0 0 8px" }}>
          {props.headline || "Conclusió provisional del diagnòstic"}
        </h3>
        <p style={{ lineHeight: 1.6, margin: "0 0 12px" }}>
          {props.summary || "L'agent ja té prou senyal per deixar una conclusió útil."}
        </p>
        {bullets.length > 0 ? (
          <ul style={{ lineHeight: 1.7, margin: "0 0 14px", paddingLeft: 20 }}>
            {bullets.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>
        ) : null}
        {props.actionLabel && props.actionMessage ? (
          <button
            type="button"
            onClick={() => void onQuickReply(props.actionMessage || "")}
            style={{
              background: "#173120",
              border: 0,
              borderRadius: 999,
              color: "#fff",
              cursor: "pointer",
              font: "inherit",
              fontWeight: 800,
              padding: "10px 14px",
            }}
          >
            {props.actionLabel}
          </button>
        ) : null}
      </section>
    );
  }

  return null;
}

const fieldStyle = {
  border: "1px solid rgba(23, 49, 32, 0.18)",
  borderRadius: 14,
  font: "inherit",
  padding: "12px 14px",
} satisfies CSSProperties;
