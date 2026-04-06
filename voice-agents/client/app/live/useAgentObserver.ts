"use client";

import { useEffect, useRef, useState } from "react";

export type AgentViewSnapshot = {
  currentRoute: string;
  currentView: string | null;
  currentState: string | null;
  visibleActions: string[];
  visibleStates: string[];
  summary: string;
};

function buildSnapshot(): AgentViewSnapshot {
  const viewNode = document.querySelector<HTMLElement>("[data-ai-view]");
  const stateNode = document.querySelector<HTMLElement>("[data-ai-state]");

  const actionNodes = Array.from(
    document.querySelectorAll<HTMLElement>("[data-ai-action]"),
  ).filter((node) => node.offsetParent !== null);

  const stateNodes = Array.from(
    document.querySelectorAll<HTMLElement>("[data-ai-state]"),
  ).filter((node) => node.offsetParent !== null);

  const visibleActions = actionNodes
    .map((node) => node.dataset.aiAction || "")
    .filter(Boolean);

  const visibleStates = stateNodes
    .map((node) => node.dataset.aiState || "")
    .filter(Boolean);

  const currentView = viewNode?.dataset.aiView || null;
  const currentState = stateNode?.dataset.aiState || null;
  const currentRoute = `${window.location.pathname}${window.location.search}`;
  const summary = [
    currentView ? `Vista: ${currentView}` : null,
    currentState ? `Estat: ${currentState}` : null,
    visibleActions.length > 0 ? `Accions: ${visibleActions.join(", ")}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    currentRoute,
    currentView,
    currentState,
    visibleActions,
    visibleStates,
    summary,
  };
}

export function useAgentObserver(enabled: boolean) {
  const lastSnapshotRef = useRef<string>("");
  const [snapshot, setSnapshot] = useState<AgentViewSnapshot | null>(null);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") {
      setSnapshot(null);
      return;
    }

    let frameId = 0;

    const publish = () => {
      const snapshot = buildSnapshot();
      const serialized = JSON.stringify(snapshot);
      if (serialized === lastSnapshotRef.current) {
        return;
      }
      lastSnapshotRef.current = serialized;
      setSnapshot(snapshot);
    };

    const schedulePublish = () => {
      cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(publish);
    };

    const observer = new MutationObserver(schedulePublish);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["data-ai-action", "data-ai-state", "data-ai-view"],
      childList: true,
      subtree: true,
    });

    window.addEventListener("popstate", schedulePublish);
    schedulePublish();

    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
      window.removeEventListener("popstate", schedulePublish);
    };
  }, [enabled]);

  return snapshot;
}
