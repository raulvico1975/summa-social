import { LiveCopilotSandbox } from "@/components/copilot/LiveCopilotSandbox";

type LiveCopilotPageProps = {
  searchParams?: Promise<{
    onboarding?: string;
    view?: string;
  }>;
};

export default async function LiveCopilotPage({
  searchParams,
}: LiveCopilotPageProps) {
  const params = (await searchParams) ?? {};
  const onboardingActive = params.onboarding === "true";
  const view = params.view === "donants" ? "donants" : "remeses";

  return (
    <LiveCopilotSandbox onboardingActive={onboardingActive} view={view} />
  );
}
