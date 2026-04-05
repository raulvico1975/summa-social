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
  exclusion_reason: string | null;
};

export type WebAgentRequest = {
  locale: string;
  messages: ConversationMessage[];
  known_profile: KnownProfile;
  ui_capabilities: WebAgentUiCapability[];
};

export type QualificationStatus =
  | "good_fit"
  | "low_fit"
  | "uncertain_fit";

export type NextStep =
  | "ask_more"
  | "capture_contact"
  | "disqualify"
  | "offer_demo"
  | "show_value";

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
  fit_assessment: QualificationStatus;
  signals_collected: KnownProfile;
  next_question: string | null;
  qualification_summary: string | null;
  recommended_next_step: NextStep;
  ui_action: UiAction;
};

const QUALIFICATION_STATUSES: QualificationStatus[] = [
  "good_fit",
  "low_fit",
  "uncertain_fit",
];

const NEXT_STEPS: NextStep[] = [
  "ask_more",
  "capture_contact",
  "disqualify",
  "offer_demo",
  "show_value",
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
    exclusion_reason: null,
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
    exclusion_reason: update.exclusion_reason ?? current.exclusion_reason,
  };
}

export function isWebAgentResponse(value: unknown): value is WebAgentResponse {
  if (!isRecord(value)) {
    return false;
  }

  if (
    typeof value.agent_message !== "string" ||
    !QUALIFICATION_STATUSES.includes(value.fit_assessment as QualificationStatus) ||
    !NEXT_STEPS.includes(value.recommended_next_step as NextStep) ||
    !(typeof value.next_question === "string" || value.next_question === null) ||
    !(typeof value.qualification_summary === "string" || value.qualification_summary === null)
  ) {
    return false;
  }

  if (!isRecord(value.signals_collected) || !isRecord(value.ui_action)) {
    return false;
  }

  const profile = value.signals_collected;
  if (
    !isStringOrNull(profile.entity_type) ||
    !isStringOrNull(profile.team_size) ||
    !isStringOrNull(profile.primary_pain) ||
    !isStringOrNull(profile.exclusion_reason)
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
