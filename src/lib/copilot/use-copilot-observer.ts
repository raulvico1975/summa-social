"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export type CopilotDomContext = {
  currentRoute: string;
  visibleActions: string[];
};

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

export function useCopilotObserver(): CopilotDomContext {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [visibleActions, setVisibleActions] = useState<string[]>([]);

  const refresh = useCallback(() => {
    setVisibleActions(collectVisibleActions());
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

  const view = searchParams.get("view");
  const currentRoute = view ? `${pathname}?view=${view}` : pathname;

  return {
    currentRoute,
    visibleActions,
  };
}
