export const WEB_AGENT_API_URL =
  process.env.NEXT_PUBLIC_WEB_AGENT_API_URL || "http://127.0.0.1:8787";

export const WEB_AGENT_UI_CAPABILITIES = [
  "choice_selector",
  "feature_card",
  "lead_capture_form",
  "qualification_summary",
] as const;

export type WebAgentUiCapability = (typeof WEB_AGENT_UI_CAPABILITIES)[number];

export type ConversationRole = "assistant" | "user";

export type ConversationMessage = {
  role: ConversationRole;
  text: string;
};

export type KnownProfile = {
  entity_type: string | null;
  team_size: string | null;
  primary_pain: string | null;
  urgency: string | null;
  fit_band: string | null;
};

export type WebAgentRequest = {
  locale: string;
  messages: ConversationMessage[];
  known_profile: KnownProfile;
  ui_capabilities: WebAgentUiCapability[];
};

export type QualificationStatus =
  | "evaluating"
  | "good_fit"
  | "partial_fit"
  | "low_fit"
  | "ready_to_convert";

export type NextStep =
  | "capture_lead"
  | "close_out"
  | "continue_diagnosis"
  | "offer_demo";

export type UiComponent =
  | "ChoiceSelector"
  | "FeatureCard"
  | "LeadCaptureForm"
  | "None"
  | "QualificationSummaryCard";

export type ChoiceSelectorProps = {
  field?: string;
  label?: string;
  options?: Array<{ id: string; label: string }>;
};

export type FeatureCardProps = {
  title?: string;
  body?: string;
  bullets?: string[];
  ctaLabel?: string;
  ctaMessage?: string;
};

export type LeadCaptureFormProps = {
  headline?: string;
  description?: string;
  fields?: Array<{
    id: string;
    label: string;
    placeholder?: string;
    type?: "email" | "tel" | "text";
  }>;
};

export type QualificationSummaryProps = {
  headline?: string;
  summary?: string;
  bullets?: string[];
  actionLabel?: string;
  actionMessage?: string;
};

export type UiAction = {
  type: "none" | "render_component";
  component: UiComponent;
  props:
    | ChoiceSelectorProps
    | FeatureCardProps
    | LeadCaptureFormProps
    | QualificationSummaryProps
    | Record<string, unknown>;
};

export type WebAgentResponse = {
  agent_message: string;
  qualification_status: QualificationStatus;
  collected_signals: KnownProfile;
  ui_action: UiAction;
  next_step: NextStep;
};

const QUALIFICATION_STATUSES: QualificationStatus[] = [
  "evaluating",
  "good_fit",
  "partial_fit",
  "low_fit",
  "ready_to_convert",
];

const NEXT_STEPS: NextStep[] = [
  "capture_lead",
  "close_out",
  "continue_diagnosis",
  "offer_demo",
];

const UI_COMPONENTS: UiComponent[] = [
  "ChoiceSelector",
  "FeatureCard",
  "LeadCaptureForm",
  "None",
  "QualificationSummaryCard",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringOrNull(value: unknown): value is string | null {
  return typeof value === "string" || value === null;
}

export function createEmptyProfile(): KnownProfile {
  return {
    entity_type: null,
    team_size: null,
    primary_pain: null,
    urgency: null,
    fit_band: null,
  };
}

export function buildWebAgentRequest(
  locale: string,
  messages: ConversationMessage[],
  knownProfile: KnownProfile,
): WebAgentRequest {
  return {
    locale,
    messages,
    known_profile: knownProfile,
    ui_capabilities: [...WEB_AGENT_UI_CAPABILITIES],
  };
}

export function mergeKnownProfile(
  current: KnownProfile,
  update: KnownProfile,
): KnownProfile {
  return {
    entity_type: update.entity_type ?? current.entity_type,
    team_size: update.team_size ?? current.team_size,
    primary_pain: update.primary_pain ?? current.primary_pain,
    urgency: update.urgency ?? current.urgency,
    fit_band: update.fit_band ?? current.fit_band,
  };
}

export function isWebAgentResponse(value: unknown): value is WebAgentResponse {
  if (!isRecord(value)) {
    return false;
  }

  if (
    typeof value.agent_message !== "string" ||
    !QUALIFICATION_STATUSES.includes(value.qualification_status as QualificationStatus) ||
    !NEXT_STEPS.includes(value.next_step as NextStep)
  ) {
    return false;
  }

  if (!isRecord(value.collected_signals) || !isRecord(value.ui_action)) {
    return false;
  }

  const profile = value.collected_signals;
  if (
    !isStringOrNull(profile.entity_type) ||
    !isStringOrNull(profile.team_size) ||
    !isStringOrNull(profile.primary_pain) ||
    !isStringOrNull(profile.urgency) ||
    !isStringOrNull(profile.fit_band)
  ) {
    return false;
  }

  const action = value.ui_action;
  if (
    (action.type !== "none" && action.type !== "render_component") ||
    !UI_COMPONENTS.includes(action.component as UiComponent) ||
    !isRecord(action.props)
  ) {
    return false;
  }

  return true;
}
