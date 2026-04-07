import { Suspense } from "react";

import { LiveCopilotSandbox } from "@/components/copilot/LiveCopilotSandbox";

export default function LiveCopilotPage() {
  return (
    <Suspense
      fallback={<main className="min-h-screen bg-slate-50 p-8 text-sm text-slate-500">Carregant live sandbox...</main>}
    >
      <LiveCopilotSandbox />
    </Suspense>
  );
}
