"use client";

import { useCallback, useEffect, useState } from "react";

export type CopilotDomContext = {
  currentRoute: string;
  visibleActions: string[];
};

function areEqualActions(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
}

function collectVisibleActions(): string[] {
  const nodes = Array.from(
    document.querySelectorAll<HTMLElement>("[data-ai-action]")
  );

  return nodes
    .filter((node) => {
      const action = node.dataset.aiAction?.trim();
      return Boolean(action && node.offsetParent !== null);
    })
    .map((node) => node.dataset.aiAction!.trim());
}

export function useCopilotObserver(currentRoute: string): CopilotDomContext {
  const [visibleActions, setVisibleActions] = useState<string[]>([]);

  const refresh = useCallback(() => {
    const nextActions = collectVisibleActions();
    setVisibleActions((currentActions) =>
      areEqualActions(currentActions, nextActions) ? currentActions : nextActions
    );
  }, []);

  useEffect(() => {
    refresh();

    const observer = new MutationObserver(() => {
      refresh();
    });

    observer.observe(document.body, {
      attributes: true,
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, [refresh]);

  return {
    currentRoute,
    visibleActions,
  };
}
