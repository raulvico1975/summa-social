export function trackCopilotEvent(
  event:
    | "copilot_interaction_started"
    | "copilot_action_executed"
    | "copilot_goal_achieved",
  payload: Record<string, unknown> = {}
) {
  if (process.env.NODE_ENV !== "production") {
    console.info("[copilot]", event, payload);
  }
}
