import { NextResponse } from "next/server";

export async function POST(): Promise<NextResponse> {
  const botStartUrl = process.env.DEMO_BOT_START_URL || "http://127.0.0.1:8790/start";

  try {
    const response = await fetch(botStartUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        createDailyRoom: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      let message = "Failed to start live demo agent";

      try {
        const parsed = JSON.parse(errorText) as { error?: string };
        if (typeof parsed.error === "string" && parsed.error.trim()) {
          message = parsed.error.trim();
        }
      } catch {
        if (errorText.trim()) {
          message = errorText.trim();
        }
      }

      console.error("Demo bot start failed", response.status, errorText);
      return NextResponse.json({ error: message }, { status: response.status });
    }

    const data = (await response.json()) as unknown;
    return NextResponse.json(data);
  } catch (error) {
    console.error("Live start route failed", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error && error.message
            ? error.message
            : "Failed to start live demo agent",
      },
      { status: 500 },
    );
  }
}
