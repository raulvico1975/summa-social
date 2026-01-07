"use client";

import * as React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * SummaTooltip - Tooltip amb estil global de l'app
 *
 * Estil: blau primary + text blanc
 * Ús: informació contextual (no per warnings/errors)
 */

export interface SummaTooltipProps {
  /** Contingut del tooltip */
  content: React.ReactNode;
  /** Element que activa el tooltip */
  children: React.ReactNode;
  /** Posició del tooltip */
  side?: "top" | "right" | "bottom" | "left";
  /** Alineació del tooltip */
  align?: "start" | "center" | "end";
  /** Delay abans de mostrar (ms) */
  delayDuration?: number;
}

export function SummaTooltip({
  content,
  children,
  side = "top",
  align = "center",
  delayDuration = 200,
}: SummaTooltipProps) {
  return (
    <TooltipProvider delayDuration={delayDuration}>
      <Tooltip>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent
          side={side}
          align={align}
          className="bg-primary text-white text-xs px-2 py-1.5 rounded-md shadow-md max-w-xs leading-tight border-0"
        >
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
