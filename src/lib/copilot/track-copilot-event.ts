import { trackUX } from "@/lib/ux/trackUX";

export function trackCopilotEvent(
  event:
    | "copilot_interaction_started"
    | "copilot_action_executed"
    | "copilot_goal_achieved",
  payload: Record<string, unknown> = {}
) {
  trackUX(event, payload);
}
