"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { trackCopilotEvent } from "@/lib/copilot/track-copilot-event";
import { useCopilotObserver } from "@/lib/copilot/use-copilot-observer";

const CONTINGENCY_TEXT = "Aquesta opció no està disponible aquí.";
const GOAL_CLICK_WINDOW_MS = 4000;
const REQUEST_TIMEOUT_MS = 5000;
const SESSION_STORAGE_KEY = "copilot-onboarding-pill";
const HIGHLIGHT_CLASSES = [
  "relative",
  "z-30",
  "ring-4",
  "ring-emerald-400/70",
  "shadow-[0_0_0_1px_rgba(255,255,255,0.9),0_0_32px_rgba(16,185,129,0.45)]",
  "transition-all",
  "duration-700",
];

type CopilotApiResponse = {
  ok: boolean;
  message: string;
  action:
    | {
        type: "navigate";
        path: string;
        message: string;
      }
    | {
        type: "highlight";
        elementId: string;
        message: string;
      }
    | null;
};

type CopilotMessage = {
  role: "user" | "assistant";
  text: string;
};

type PendingFollowUp =
  | {
      kind: "highlight";
      route: string;
      elementId: string;
      message: string;
    }
  | null;

type PersistedPillState = {
  expanded: boolean;
  dismissed: boolean;
  status: string;
  messages: CopilotMessage[];
  pendingFollowUp: PendingFollowUp;
};

type OnboardingPillProps = {
  currentRoute: string;
  onboardingActive: boolean;
};

function resolveActionNode(elementId: string): HTMLElement | null {
  const node = document.querySelector<HTMLElement>(
    `[data-ai-action="${elementId}"]`
  );

  if (!node || node.offsetParent === null) {
    return null;
  }

  return node;
}

export function OnboardingPill({
  currentRoute,
  onboardingActive,
}: OnboardingPillProps) {
  const router = useRouter();
  const { visibleActions } = useCopilotObserver(currentRoute);
  const storageKey = useMemo(
    () => `${SESSION_STORAGE_KEY}:${currentRoute.split("?")[0]}`,
    [currentRoute]
  );
  const isSepaWizardRoute = currentRoute.includes("/dashboard/donants/remeses-cobrament");
  const introMessage = isSepaWizardRoute
    ? "Explica'm què vols fer amb la remesa i et marco el punt clau."
    : "Explica'm què vols fer i et guio fins al punt clau.";
  const helperMessage = isSepaWizardRoute
    ? "Demana el següent pas i et marcaré el camp o el botó correcte."
    : "Pregunta pel següent pas i actuaré si toca.";
  const placeholder = isSepaWizardRoute
    ? 'Ex: "Vull preparar la primera remesa"'
    : 'Ex: "Vull generar la remesa"';

  const [expanded, setExpanded] = useState(onboardingActive);
  const [dismissed, setDismissed] = useState(false);
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState("");
  const [spotlightActive, setSpotlightActive] = useState(false);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      role: "assistant",
      text: introMessage,
    },
  ]);
  const [pendingFollowUp, setPendingFollowUp] = useState<PendingFollowUp>(null);

  const cleanupRef = useRef<(() => void) | null>(null);
  const interactionStartedRef = useRef(false);
  const restoredStateRef = useRef(false);

  const shouldRender = useMemo(
    () => onboardingActive && !dismissed,
    [dismissed, onboardingActive]
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const rawState = window.sessionStorage.getItem(storageKey);
    if (!rawState) {
      return;
    }

    try {
      const parsedState = JSON.parse(rawState) as Partial<PersistedPillState>;
      if (typeof parsedState.expanded === "boolean") {
        setExpanded(parsedState.expanded);
      }
      if (typeof parsedState.dismissed === "boolean") {
        setDismissed(parsedState.dismissed);
      }
      if (typeof parsedState.status === "string") {
        setStatus(parsedState.status);
      }
      if (Array.isArray(parsedState.messages) && parsedState.messages.length > 0) {
        setMessages(parsedState.messages as CopilotMessage[]);
      }
      if (parsedState.pendingFollowUp) {
        setPendingFollowUp(parsedState.pendingFollowUp as PendingFollowUp);
      }
      restoredStateRef.current = true;
    } catch {
      window.sessionStorage.removeItem(storageKey);
    }
  }, [storageKey]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const snapshot: PersistedPillState = {
      expanded,
      dismissed,
      status,
      messages,
      pendingFollowUp,
    };

    window.sessionStorage.setItem(storageKey, JSON.stringify(snapshot));
  }, [dismissed, expanded, messages, pendingFollowUp, status, storageKey]);

  useEffect(() => {
    setMessages((current) => {
      if (current.length === 1 && current[0]?.role === "assistant") {
        return [{ role: "assistant", text: introMessage }];
      }
      return current;
    });
  }, [introMessage]);

  useEffect(() => {
    return () => {
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (restoredStateRef.current) {
      return;
    }

    if (onboardingActive && !dismissed) {
      setExpanded(true);
    }
  }, [dismissed, onboardingActive]);

  const cleanupHighlight = useCallback(() => {
    setSpotlightActive(false);
    cleanupRef.current?.();
    cleanupRef.current = null;
  }, []);

  const executeHighlight = useCallback((elementId: string) => {
    const node = resolveActionNode(elementId);
    if (!node) {
      setStatus(CONTINGENCY_TEXT);
      setExpanded(true);
      return;
    }

    cleanupHighlight();
    const startedAt = Date.now();
    let clickTracked = false;

    node.scrollIntoView({ behavior: "smooth", block: "center" });

    const activate = window.setTimeout(() => {
      setSpotlightActive(true);
      node.classList.add(...HIGHLIGHT_CLASSES);

      const onClick = () => {
        if (clickTracked) return;
        clickTracked = true;
        trackCopilotEvent("copilot_goal_achieved", {
          elementId,
          time_to_click_ms: Date.now() - startedAt,
        });
        cleanupHighlight();
      };

      node.addEventListener("click", onClick, { once: true });

      const expire = window.setTimeout(() => {
        cleanupHighlight();
      }, GOAL_CLICK_WINDOW_MS);

      cleanupRef.current = () => {
        window.clearTimeout(expire);
        setSpotlightActive(false);
        node.classList.remove(...HIGHLIGHT_CLASSES);
        node.removeEventListener("click", onClick);
      };
    }, 300);

    cleanupRef.current = () => {
      window.clearTimeout(activate);
      setSpotlightActive(false);
      node.classList.remove(...HIGHLIGHT_CLASSES);
    };
  }, [cleanupHighlight]);

  useEffect(() => {
    if (
      !pendingFollowUp ||
      pendingFollowUp.kind !== "highlight" ||
      pendingFollowUp.route !== currentRoute ||
      !visibleActions.includes(pendingFollowUp.elementId)
    ) {
      return;
    }

    setStatus(pendingFollowUp.message);
    setMessages((currentMessages) => {
      const lastMessage = currentMessages[currentMessages.length - 1];
      if (
        lastMessage?.role === "assistant" &&
        lastMessage.text === pendingFollowUp.message
      ) {
        return currentMessages;
      }

      return [
        ...currentMessages,
        {
          role: "assistant",
          text: pendingFollowUp.message,
        },
      ];
    });
    executeHighlight(pendingFollowUp.elementId);
    trackCopilotEvent("copilot_action_executed", {
      action: "highlight",
      elementId: pendingFollowUp.elementId,
      source: "post_navigation_followup",
    });
    setPendingFollowUp(null);
    setExpanded(false);
  }, [currentRoute, executeHighlight, pendingFollowUp, visibleActions]);

  const handleSubmit = useCallback(async () => {
    const userMessage = draft.trim();
    if (!userMessage) return;

    setPending(true);
    setStatus("");
    const nextMessages = [
      ...messages,
      {
        role: "user" as const,
        text: userMessage,
      },
    ];
    setMessages(nextMessages);
    setDraft("");
    if (!interactionStartedRef.current) {
      trackCopilotEvent("copilot_interaction_started", { currentRoute });
      interactionStartedRef.current = true;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch("/api/copilot", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          currentRoute,
          visibleActions,
          userMessage,
          history: nextMessages.slice(-4),
        }),
        signal: controller.signal,
      });

      const data = (await response.json()) as CopilotApiResponse;
      if (!response.ok || !data.ok) {
        setStatus(data.message || CONTINGENCY_TEXT);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            text: data.message || CONTINGENCY_TEXT,
          },
        ]);
        return;
      }

      setStatus(data.message);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: data.message,
        },
      ]);

      if (!data.action) {
        setExpanded(true);
        return;
      }

      if (data.action.type === "navigate") {
        trackCopilotEvent("copilot_action_executed", {
          action: "navigate",
          destination: data.action.path,
        });
        const [path, query = ""] = data.action.path.split("?");
        const merged = new URLSearchParams(query);
        merged.set("onboarding", "true");
        if (path === "/live" && merged.get("view") === "remeses") {
          setPendingFollowUp({
            kind: "highlight",
            route: "/live?view=remeses",
            elementId: "generate-remittance",
            message: "Ja ets a remeses. T'il·lumino el botó clau.",
          });
        }
        router.push(`${path}?${merged.toString()}`);
        setExpanded(false);
        return;
      }

      trackCopilotEvent("copilot_action_executed", {
        action: "highlight",
        elementId: data.action.elementId,
      });
      executeHighlight(data.action.elementId);
      setExpanded(false);
    } catch (error) {
      const timeoutMessage =
        error instanceof DOMException && error.name === "AbortError"
          ? "Problemes de connexió. Torna-ho a provar."
          : "Ara mateix no puc orientar aquesta pantalla.";

      setStatus(timeoutMessage);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: timeoutMessage,
        },
      ]);
    } finally {
      window.clearTimeout(timeout);
      setPending(false);
    }
  }, [currentRoute, draft, executeHighlight, messages, router, visibleActions]);

  if (!shouldRender) {
    return null;
  }

  return (
    <>
      <div
        aria-hidden="true"
        className={`pointer-events-none fixed inset-0 z-20 bg-slate-950/20 transition-opacity duration-500 ${
          spotlightActive ? "opacity-100" : "opacity-0"
        }`}
      />
      <div className="fixed bottom-6 right-6 z-50 w-[min(360px,calc(100vw-32px))]">
        <div className="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-2xl backdrop-blur-md transition-all duration-300">
          {!expanded ? (
            <div className="space-y-3">
              <div className="space-y-1">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-slate-500">
                  Onboarding
                </p>
                <p className="text-sm font-medium text-slate-900">
                  ✨ T&apos;ajudo a generar la teva primera remesa.
                </p>
                {status ? (
                  <p className="text-xs leading-5 text-slate-600">{status}</p>
                ) : null}
              </div>

              {!dismissed ? (
                <div className="flex items-center gap-2">
                  <button
                    className="inline-flex rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-500"
                    onClick={() => setExpanded(true)}
                    type="button"
                  >
                    Guia&apos;m
                  </button>
                  <button
                    className="inline-flex rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    onClick={() => setDismissed(true)}
                    type="button"
                  >
                    Omet
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="max-h-44 space-y-2 overflow-y-auto rounded-xl bg-slate-50 p-3">
                {messages.slice(-3).map((message, index) => (
                  <div
                    className={
                      message.role === "assistant"
                        ? "rounded-2xl bg-white px-3 py-2 text-sm text-slate-700 shadow-sm"
                        : "rounded-2xl bg-sky-600 px-3 py-2 text-sm text-white"
                    }
                    key={`${message.role}-${index}-${message.text}`}
                  >
                    {message.text}
                  </div>
                ))}
              </div>

              <div className="rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-600">
                {pending ? (
                  <span className="animate-pulse">Analitzant pantalla...</span>
                ) : (
                  <span>{helperMessage}</span>
                )}
              </div>

              <form
                className="flex items-center gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleSubmit();
                }}
              >
                <input
                  className="min-w-0 flex-1 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400 focus:border-sky-300"
                  disabled={pending}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder={placeholder}
                  type="text"
                  value={draft}
                />
                <button
                  className="inline-flex rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-slate-300"
                  disabled={pending || !draft.trim()}
                  type="submit"
                >
                  Envia
                </button>
                <button
                  className="inline-flex rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  onClick={() => setExpanded(false)}
                  type="button"
                >
                  Tancar
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
