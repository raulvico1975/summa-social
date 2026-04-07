import { NextRequest, NextResponse } from "next/server";

import { resolveGoogleGenAiApiKey } from "@/ai/config";

const MODEL = "gemini-3-pro-preview";
const CONTINGENCY_TEXT = "Aquesta opció no està disponible aquí.";
const ALLOWED_PATHS = ["/live", "/live?view=remeses", "/live?view=donants"];

type CopilotRequest = {
  currentRoute: string;
  visibleActions: string[];
  userMessage: string;
  history?: Array<{
    role: "user" | "assistant";
    text: string;
  }>;
};

type CopilotToolAction =
  | {
      type: "navigate";
      path: string;
      message: string;
    }
  | {
      type: "highlight";
      elementId: string;
      message: string;
    };

type CopilotResponse =
  | {
      ok: true;
      action: CopilotToolAction | null;
      message: string;
    }
  | {
      ok: false;
      message: string;
    };

type GeminiPart =
  | { text?: string }
  | {
      functionCall?: {
        name?: string;
        args?: Record<string, unknown>;
      };
    };

function sanitizeMessage(text: string | undefined): string {
  const value = (text ?? "").trim();
  if (!value) return CONTINGENCY_TEXT;
  if (value === CONTINGENCY_TEXT) return value;
  return value.split(/\s+/).slice(0, 12).join(" ");
}

function normalizeRoute(route: string): string {
  return route.replace("remittances", "remeses");
}

function inferHappyPathFallback(body: CopilotRequest): CopilotToolAction | null {
  const message = body.userMessage.toLowerCase();
  const currentRoute = normalizeRoute(body.currentRoute);

  const asksToCreateRemittance =
    /(primera\s+remesa|generar.*remesa|fer.*remesa|crear.*remesa|vull.*remesa)/i.test(
      message
    );

  if (currentRoute.includes("/live?view=donants") && asksToCreateRemittance) {
    return {
      type: "navigate",
      path: "/live?view=remeses",
      message: "Et porto a remeses.",
    };
  }

  const asksForButton =
    /(on.*bot[oó]|on és el bot[oó]|on es el bot[oó]|on clico|quin bot[oó]|quina boto|bot[oó].*gener|generar-la)/i.test(
      message
    );

  if (
    currentRoute.includes("/live?view=remeses") &&
    asksForButton &&
    body.visibleActions.includes("generate-remittance")
  ) {
    return {
      type: "highlight",
      elementId: "generate-remittance",
      message: "Te l'il·lumino ara mateix.",
    };
  }

  return null;
}

function inferDeterministicAction(body: CopilotRequest): CopilotToolAction | null {
  const currentRoute = normalizeRoute(body.currentRoute);
  const normalizedMessage = body.userMessage.toLowerCase().trim();

  const firstRemittanceIntent =
    /(primera\s+remesa|generar.*remesa|fer.*remesa|crear.*remesa|vull.*remesa)/i.test(
      normalizedMessage
    );

  if (currentRoute.includes("/live?view=donants") && firstRemittanceIntent) {
    return {
      type: "navigate",
      path: "/live?view=remeses",
      message: "Et porto a remeses.",
    };
  }

  const buttonIntent =
    /(on.*bot[oó]|on és el bot[oó]|on es el bot[oó]|on clico|quin bot[oó]|quina boto|bot[oó].*gener|generar-la)/i.test(
      normalizedMessage
    );

  if (
    currentRoute.includes("/live?view=remeses") &&
    buttonIntent &&
    body.visibleActions.includes("generate-remittance")
  ) {
    return {
      type: "highlight",
      elementId: "generate-remittance",
      message: "Te l'il·lumino ara mateix.",
    };
  }

  return null;
}

function inferDeterministicContingency(body: CopilotRequest): string | null {
  const normalizedMessage = body.userMessage.toLowerCase().trim();

  if (/(cancel·?lar|cancelar).*(remesa)|remesa.*(cancel·?lar|cancelar)/i.test(normalizedMessage)) {
    return CONTINGENCY_TEXT;
  }

  return null;
}

function validateAction(
  functionName: string | undefined,
  args: Record<string, unknown> | undefined,
  visibleActions: string[]
): CopilotToolAction | null {
  if (!functionName || !args) {
    return null;
  }

  if (functionName === "highlight_element") {
    const elementId = typeof args.elementId === "string" ? args.elementId : "";
    const message = sanitizeMessage(
      typeof args.message === "string" ? args.message : "T'he marcat el punt clau."
    );

    if (!elementId || !visibleActions.includes(elementId)) {
      return null;
    }

    return {
      type: "highlight",
      elementId,
      message,
    };
  }

  if (functionName === "Maps") {
    const path = typeof args.path === "string" ? args.path : "";
    const message = sanitizeMessage(
      typeof args.message === "string" ? args.message : "Et porto a la vista correcta."
    );

    if (!path || !ALLOWED_PATHS.includes(normalizeRoute(path))) {
      return null;
    }

    return {
      type: "navigate",
      path: normalizeRoute(path),
      message,
    };
  }

  return null;
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<CopilotResponse>> {
  const apiKey = resolveGoogleGenAiApiKey();
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, message: "Falta GOOGLE_API_KEY per provar el copilot." },
      { status: 500 }
    );
  }

  let body: CopilotRequest;
  try {
    body = (await request.json()) as CopilotRequest;
  } catch {
    return NextResponse.json(
      { ok: false, message: "Payload invàlid." },
      { status: 400 }
    );
  }

  if (
    !body ||
    typeof body.currentRoute !== "string" ||
    !Array.isArray(body.visibleActions) ||
    typeof body.userMessage !== "string"
  ) {
    return NextResponse.json(
      { ok: false, message: "Payload invàlid." },
      { status: 400 }
    );
  }

  const deterministicAction = inferDeterministicAction(body);
  if (deterministicAction) {
    return NextResponse.json({
      ok: true,
      action: deterministicAction,
      message: deterministicAction.message,
    });
  }

  const deterministicContingency = inferDeterministicContingency(body);
  if (deterministicContingency) {
    return NextResponse.json({
      ok: true,
      action: null,
      message: deterministicContingency,
    });
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;

  const systemInstruction = [
    "Ets un executor d'interfícies per a Summa Social.",
    "Només pots usar aquestes eines: Maps(path) i highlight_element(elementId).",
    "Si has d'executar una eina, fes-ho i respon només amb 1 frase curta.",
    "Si l'usuari vol fer una acció que pertany a una altra pantalla, usa Maps per portar-lo allà.",
    "No necessites que el botó final sigui visible per navegar.",
    "Només usa highlight_element quan l'usuari ja és a la pantalla correcta i l'element és present a visibleActions.",
    "Si l'usuari demana un element que NO és a visibleActions, tens PROHIBIT inventar-lo.",
    `En aquest cas, retorna únicament el text exacte: "${CONTINGENCY_TEXT}".`,
    "No narris passos llargs. No improvisis. No inventis botons ni rutes.",
    "L'objectiu és guiar l'usuari cap a generar una remesa."
  ].join(" ");

  const payload = {
    system_instruction: {
      parts: [{ text: systemInstruction }],
    },
    contents: [
      ...((body.history ?? []).map((entry) => ({
        role: entry.role,
        parts: [{ text: entry.text }],
      })) as Array<{ role: string; parts: Array<{ text: string }> }>),
      {
        role: "user",
        parts: [
          {
            text: JSON.stringify({
              currentRoute: normalizeRoute(body.currentRoute),
              visibleActions: body.visibleActions,
              userMessage: body.userMessage,
            }),
          },
        ],
      },
    ],
    tools: [
      {
        function_declarations: [
          {
            name: "Maps",
            description:
              "Canvia a una vista vàlida quan l'usuari demana anar a una secció concreta.",
            parameters: {
              type: "OBJECT",
              properties: {
                path: {
                  type: "STRING",
                  description: "Ruta permesa dins la sandbox local.",
                },
                message: {
                  type: "STRING",
                  description: "Frase curta de confirmació per a l'usuari.",
                },
              },
              required: ["path", "message"],
            },
          },
          {
            name: "highlight_element",
            description:
              "Marca un element visible i persistent del DOM quan l'usuari necessita orientació visual.",
            parameters: {
              type: "OBJECT",
              properties: {
                elementId: {
                  type: "STRING",
                  description: "Identificador exacte que existeix a visibleActions.",
                },
                message: {
                  type: "STRING",
                  description: "Frase curta de confirmació per a l'usuari.",
                },
              },
              required: ["elementId", "message"],
            },
          },
        ],
      },
    ],
    tool_config: {
      function_calling_config: {
        mode: "VALIDATED",
        allowed_function_names: ["Maps", "highlight_element"],
      },
    },
    generation_config: {
      temperature: 0.1,
      max_output_tokens: 120,
    },
  };

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { ok: false, message: errorText.slice(0, 200) || "Error de Gemini." },
        { status: 502 }
      );
    }

    const data = await response.json();
    const candidate = data?.candidates?.[0];
    const parts = (candidate?.content?.parts ?? []) as GeminiPart[];

    const functionPart = parts.find(
      (part) => "functionCall" in part && part.functionCall
    ) as GeminiPart | undefined;

    if (functionPart && "functionCall" in functionPart) {
      const action = validateAction(
        functionPart.functionCall?.name,
        functionPart.functionCall?.args,
        body.visibleActions
      );

      if (!action) {
        const fallbackAction = inferHappyPathFallback(body);
        if (fallbackAction) {
          return NextResponse.json({
            ok: true,
            action: fallbackAction,
            message: fallbackAction.message,
          });
        }

        return NextResponse.json({
          ok: true,
          action: null,
          message: CONTINGENCY_TEXT,
        });
      }

      return NextResponse.json({
        ok: true,
        action,
        message: action.message,
      });
    }

    const textPart = parts.find((part) => "text" in part && part.text) as
      | { text?: string }
      | undefined;

    const text = sanitizeMessage(textPart?.text);
    const fallbackAction = inferHappyPathFallback(body);
    if (fallbackAction) {
      return NextResponse.json({
        ok: true,
        action: fallbackAction,
        message: fallbackAction.message,
      });
    }

    return NextResponse.json({
      ok: true,
      action: null,
      message: text === CONTINGENCY_TEXT ? text : CONTINGENCY_TEXT,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error inesperat del copilot.";

    return NextResponse.json(
      { ok: false, message: message.slice(0, 200) },
      { status: 500 }
    );
  }
}
