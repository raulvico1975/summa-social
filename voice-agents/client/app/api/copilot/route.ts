import { readFileSync } from "node:fs";
import path from "node:path";

import { NextResponse } from "next/server";

type CopilotRequest = {
  dom_context?: {
    currentRoute?: string | null;
    currentState?: string | null;
    currentView?: string | null;
    summary?: string;
    visibleActions?: string[];
    visibleStates?: string[];
  };
  history?: Array<{
    content: string;
    role: "assistant" | "user";
  }>;
  message?: string;
};

type ToolCall =
  | {
      args: { path: string };
      tool: "Maps_to";
    }
  | {
      args: { element_id: string };
      tool: "highlight_element";
    };

export const runtime = "nodejs";

const DEFAULT_MODEL = process.env.COPILOT_MODEL || "gemini-3-pro-preview";

function normalizeIntent(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function readEnvFileValue(name: string): string | null {
  const envPaths = [
    path.resolve(process.cwd(), "../server/.env"),
    path.resolve(process.cwd(), "../../.env.local"),
  ];

  for (const filePath of envPaths) {
    try {
      const content = readFileSync(filePath, "utf8");
      for (const rawLine of content.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith("#")) {
          continue;
        }
        const separator = line.indexOf("=");
        if (separator <= 0) {
          continue;
        }
        const key = line.slice(0, separator).trim();
        if (key !== name) {
          continue;
        }
        return line
          .slice(separator + 1)
          .trim()
          .replace(/^['"]|['"]$/g, "");
      }
    } catch {
      continue;
    }
  }

  return null;
}

function requireGoogleApiKey() {
  const key = process.env.GOOGLE_API_KEY || readEnvFileValue("GOOGLE_API_KEY");
  if (!key) {
    throw new Error("Falta GOOGLE_API_KEY per al copilot contextual.");
  }
  return key;
}

function buildUserTurn(message: string, domContext: CopilotRequest["dom_context"]) {
  return [
    `Missatge de l'usuari: ${message}`,
    "Context visible actual:",
    JSON.stringify(
      {
        currentRoute: domContext?.currentRoute || null,
        currentState: domContext?.currentState || null,
        currentView: domContext?.currentView || null,
        summary: domContext?.summary || "",
        visibleActions: domContext?.visibleActions || [],
        visibleStates: domContext?.visibleStates || [],
      },
      null,
      2,
    ),
  ].join("\n");
}

function toGeminiContents(history: CopilotRequest["history"], message: string, domContext: CopilotRequest["dom_context"]) {
  const items =
    history?.flatMap((entry) => {
      const text = entry.content.trim();
      if (!text) {
        return [];
      }
      return [
        {
          parts: [{ text }],
          role: entry.role === "assistant" ? "model" : "user",
        },
      ];
    }) || [];

  items.push({
    parts: [{ text: buildUserTurn(message, domContext) }],
    role: "user",
  });

  return items;
}

function extractText(parts: Array<Record<string, unknown>> | undefined) {
  if (!parts) {
    return "";
  }

  return parts
    .map((part) => (typeof part.text === "string" ? part.text.trim() : ""))
    .filter(Boolean)
    .join("\n")
    .trim();
}

function extractToolCall(parts: Array<Record<string, unknown>> | undefined): ToolCall | null {
  if (!parts) {
    return null;
  }

  for (const part of parts) {
    const functionCall = part.functionCall;
    if (!functionCall || typeof functionCall !== "object") {
      continue;
    }

    const functionCallRecord = functionCall as Record<string, unknown>;
    const name =
      typeof functionCallRecord.name === "string" ? functionCallRecord.name : "";
    const args =
      functionCallRecord.args && typeof functionCallRecord.args === "object"
        ? (functionCallRecord.args as Record<string, unknown>)
        : {};

    if (name === "Maps_to" && typeof args.path === "string" && args.path.trim()) {
      return {
        args: { path: args.path.trim() },
        tool: "Maps_to",
      };
    }

    if (
      name === "highlight_element" &&
      typeof args.element_id === "string" &&
      args.element_id.trim()
    ) {
      return {
        args: { element_id: args.element_id.trim() },
        tool: "highlight_element",
      };
    }
  }

  return null;
}

function fallbackToolCall(message: string, domContext: CopilotRequest["dom_context"]): ToolCall | null {
  const normalized = normalizeIntent(message);
  const view = domContext?.currentView || "";

  if (
    (normalized.includes("remes") || normalized.includes("quota") || normalized.includes("sepa")) &&
    view !== "panell_remeses"
  ) {
    return {
      args: { path: "/live?view=remeses" },
      tool: "Maps_to",
    };
  }

  if (
    (normalized.includes("donant") || normalized.includes("donacio")) &&
    view !== "llista_donants"
  ) {
    return {
      args: { path: "/live?view=donants" },
      tool: "Maps_to",
    };
  }

  if (
    view === "panell_remeses" &&
    (normalized.includes("on") ||
      normalized.includes("trobo") ||
      normalized.includes("boto") ||
      normalized.includes("clico"))
  ) {
    return {
      args: { element_id: "generar_sepa" },
      tool: "highlight_element",
    };
  }

  return null;
}

function missingActionMessage(
  message: string,
  domContext: CopilotRequest["dom_context"],
): string | null {
  const normalized = normalizeIntent(message);
  const visibleActions = domContext?.visibleActions || [];

  const asksForRemittanceButton =
    (normalized.includes("remes") || normalized.includes("sepa")) &&
    (normalized.includes("boto") ||
      normalized.includes("genera") ||
      normalized.includes("generar") ||
      normalized.includes("trobo") ||
      normalized.includes("clico"));

  if (asksForRemittanceButton && !visibleActions.includes("generar_sepa")) {
    return "Aquesta opció no està disponible aquí.";
  }

  return null;
}

function singleActionConfirmation(toolCall: ToolCall | null | undefined) {
  if (!toolCall) {
    return null;
  }

  if (toolCall.tool === "Maps_to") {
    if (toolCall.args.path.includes("remeses")) {
      return "Et porto a remeses.";
    }
    if (toolCall.args.path.includes("donants")) {
      return "Et porto a donants.";
    }
    return "Et porto a la vista correcta.";
  }

  if (toolCall.args.element_id === "generar_sepa") {
    return "El tens il·luminat en verd aquí dalt. Clica'l i ho deixem llest.";
  }

  return "T'ho he marcat a la pantalla.";
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CopilotRequest;
    const message = body.message?.trim();

    if (!message) {
      return NextResponse.json({ error: "Falta el missatge de l'usuari." }, { status: 400 });
    }

    const exactMissingActionMessage = missingActionMessage(message, body.dom_context);
    if (exactMissingActionMessage) {
      return NextResponse.json({
        assistantMessage: exactMissingActionMessage,
        model: DEFAULT_MODEL,
        toolCall: null,
      });
    }

    const apiKey = requireGoogleApiKey();
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          system_instruction: {
            parts: [
              {
                text: [
                  "Ets el Copilot integrat de Summa Social, un assistent d'alt nivell per a entitats del tercer sector.",
                  "La teva missio es reduir la friccio operativa de l'usuari llegint el seu dom_context i executant accions.",
                  "Respon unicament en catala.",
                  "To B2B directe, pragmatic i empatic. Zero positivitat toxica.",
                  "Prohibit usar llenguatge robotic com Hola, He procedit a, Com et puc ajudar avui, Entes.",
                  "Utilitza el dom_context per saber on es troba l'usuari, quins estats veu i quins botons te disponibles.",
                  "Si l'usuari vol anar a una altra seccio, executa Maps_to i respon amb una frase curta i d'accio, per exemple Et porto a la vista de donants.",
                  "Si l'usuari no troba un boto i el tens al context, executa highlight_element i guia'l visualment de forma natural, per exemple El tens just aqui dalt a la dreta il·luminat. Clica'l i ho deixem llest.",
                  "Si et fan una pregunta generica sobre on son les coses, mira primer el dom_context: si ja son a la vista correcta, fes highlight; si no, fes Maps_to.",
                  "Si l usuari demana una accio sobre un boto que no veus a visibleActions, no utilitzis highlight_element. Respon exclusivament amb aquest text exacte: Aquesta opcio no esta disponible aqui. I atura t.",
                  "No donis instruccions llargues. Sigues invisible i eficient. L'usuari ha de sentir que el programa es condueix sol.",
                  "REGLA D ACCIO UNICA MOLT IMPORTANT: si en aquest torn decideixes executar una eina highlight_element o Maps_to, la teva resposta de text ha de ser exclusivament la confirmacio breu de l accio.",
                  "Esta absolutament prohibit fer preguntes de seguiment, demanar aclariments o continuar la conversa si has disparat una eina en aquell mateix torn. Fes l accio, confirma ho breument, i calla.",
                ].join(" "),
              },
            ],
          },
          tools: [
            {
              functionDeclarations: [
                {
                  description: "Canvia la vista actual de la sandbox a una ruta concreta.",
                  name: "Maps_to",
                  parameters: {
                    properties: {
                      path: {
                        description: "Ruta absoluta dins /live, per exemple /live?view=remeses.",
                        type: "string",
                      },
                    },
                    required: ["path"],
                    type: "object",
                  },
                },
                {
                  description: "Destaca visualment un element existent perquè l'usuari el trobi de seguida.",
                  name: "highlight_element",
                  parameters: {
                    properties: {
                      element_id: {
                        description: "Identificador exacte del data-ai-action a ressaltar.",
                        type: "string",
                      },
                    },
                    required: ["element_id"],
                    type: "object",
                  },
                },
              ],
            },
          ],
          toolConfig: {
            functionCallingConfig: {
              mode: "AUTO",
            },
          },
          contents: toGeminiContents(body.history, message, body.dom_context),
        }),
      },
    );

    const payload = (await response.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<Record<string, unknown>>;
        };
      }>;
      error?: { message?: string };
    };

    if (!response.ok) {
      const messageText =
        payload.error?.message?.trim() || "Gemini no ha pogut respondre al copilot.";
      return NextResponse.json({ error: messageText }, { status: response.status });
    }

    const parts = payload.candidates?.[0]?.content?.parts;
    const assistantMessage = extractText(parts);
    const toolCall = extractToolCall(parts) || fallbackToolCall(message, body.dom_context);
    const forcedConfirmation = singleActionConfirmation(toolCall);

    return NextResponse.json({
      assistantMessage:
        forcedConfirmation ||
        assistantMessage ||
        "Ja ho tens.",
      model: DEFAULT_MODEL,
      toolCall,
    });
  } catch (error) {
    console.error("Copilot route failed", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error && error.message
            ? error.message
            : "No s'ha pogut executar el copilot contextual.",
      },
      { status: 500 },
    );
  }
}
