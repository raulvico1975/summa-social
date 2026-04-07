"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { trackCopilotEvent } from "@/lib/copilot/track-copilot-event";
import { useCopilotObserver } from "@/lib/copilot/use-copilot-observer";

const CONTINGENCY_TEXT = "Aquesta opció no està disponible aquí.";
const GOAL_CLICK_WINDOW_MS = 4000;
const HIGHLIGHT_CLASSES = [
  "ring-4",
  "ring-green-500/50",
  "shadow-[0_0_28px_rgba(34,197,94,0.3)]",
  "transition-all",
  "duration-500",
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

function resolveActionNode(elementId: string): HTMLElement | null {
  const node = document.querySelector<HTMLElement>(
    `[data-ai-action="${elementId}"]`
  );

  if (!node || node.offsetParent === null) {
    return null;
  }

  return node;
}

export function OnboardingPill() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentRoute, visibleActions } = useCopilotObserver();

  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState("");

  const cleanupRef = useRef<(() => void) | null>(null);

  const shouldRender = useMemo(
    () => searchParams.get("onboarding") === "true" && !dismissed,
    [dismissed, searchParams]
  );

  useEffect(() => {
    return () => {
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, []);

  const cleanupHighlight = useCallback(() => {
    cleanupRef.current?.();
    cleanupRef.current = null;
  }, []);

  const executeHighlight = useCallback((elementId: string) => {
    const node = resolveActionNode(elementId);
    if (!node) {
      setStatus(CONTINGENCY_TEXT);
      setExpanded(false);
      setDismissed(true);
      return;
    }

    cleanupHighlight();
    const startedAt = Date.now();
    let clickTracked = false;

    node.scrollIntoView({ behavior: "smooth", block: "center" });

    const activate = window.setTimeout(() => {
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
        node.classList.remove(...HIGHLIGHT_CLASSES);
        node.removeEventListener("click", onClick);
      };
    }, 300);

    cleanupRef.current = () => {
      window.clearTimeout(activate);
      node.classList.remove(...HIGHLIGHT_CLASSES);
    };
  }, [cleanupHighlight]);

  const handleStart = useCallback(async () => {
    setPending(true);
    setStatus("");
    trackCopilotEvent("copilot_interaction_started", { currentRoute });

    try {
      const response = await fetch("/api/copilot", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          currentRoute,
          visibleActions,
          userMessage: "Vull generar una remesa.",
        }),
      });

      const data = (await response.json()) as CopilotApiResponse;
      if (!response.ok || !data.ok) {
        setStatus(data.message || CONTINGENCY_TEXT);
        setExpanded(false);
        return;
      }

      setStatus(data.message);

      if (!data.action) {
        setExpanded(false);
        return;
      }

      if (data.action.type === "navigate") {
        trackCopilotEvent("copilot_action_executed", {
          action: "navigate",
          destination: data.action.path,
        });
        router.push(data.action.path);
        setExpanded(false);
        setDismissed(true);
        return;
      }

      trackCopilotEvent("copilot_action_executed", {
        action: "highlight",
        elementId: data.action.elementId,
      });
      executeHighlight(data.action.elementId);
      setExpanded(false);
      setDismissed(true);
    } catch {
      setStatus("Ara mateix no puc orientar aquesta pantalla.");
      setExpanded(false);
    } finally {
      setPending(false);
    }
  }, [currentRoute, executeHighlight, router, visibleActions]);

  if (!shouldRender) {
    return null;
  }

  return (
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
              <button
                className="inline-flex rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-500"
                onClick={() => setExpanded(true)}
                type="button"
              >
                Guia&apos;m
              </button>
            ) : null}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm leading-6 text-slate-900">
              Vaig directe al punt clau per deixar la remesa en marxa.
            </p>

            <div className="rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-600">
              {pending ? (
                <span className="animate-pulse">Analitzant pantalla...</span>
              ) : (
                <span>Executaré una sola acció i m&apos;apartaré.</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                className="inline-flex rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-slate-300"
                disabled={pending}
                onClick={handleStart}
                type="button"
              >
                Començar
              </button>
              <button
                className="inline-flex rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                onClick={() => setExpanded(false)}
                type="button"
              >
                Tancar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
