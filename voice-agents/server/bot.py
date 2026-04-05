"""Text-first backend for the Summa web-agent pilot."""

from __future__ import annotations

import json
import logging
import os
import re
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib import error, request

LOGGER = logging.getLogger("summa.web_agent")

DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 8787
DEFAULT_MODEL = "gemini-2.5-flash"
ALLOWED_UI_CAPABILITIES = {
    "choice_selector",
    "feature_card",
    "lead_capture_form",
    "qualification_summary",
}
FIT_ASSESSMENTS = {"good_fit", "uncertain_fit", "low_fit"}
RECOMMENDED_NEXT_STEPS = {
    "ask_more",
    "show_value",
    "offer_demo",
    "capture_contact",
    "disqualify",
}
UI_COMPONENTS = {
    "None",
    "ChoiceSelector",
    "FeatureCard",
    "LeadCaptureForm",
    "QualificationSummaryCard",
}
PROFILE_FIELDS = ("entity_type", "team_size", "primary_pain", "exclusion_reason")
ANTI_ICP_RULES = [
    ("necessitat d'ERP complet", ("erp", "enterprise resource planning")),
    ("comptabilitat formal completa", ("comptabilitat formal", "pla general comptable", "comptable completa")),
    ("rrhh o persones", ("rrhh", "recursos humans", "fitxatge", "horaris", "seleccio")),
    ("nomines", ("nomina", "nomines", "nòmina", "nòmines")),
    ("gestio de voluntariat", ("voluntariat", "voluntaris", "voluntariado")),
]
VALUE_PROPOSITIONS = {
    "quotes i remeses": {
        "title": "Valor clar en quotes i remeses",
        "body": "Si el dolor principal és quotes, remeses o feina manual amb el banc, Summa sol encaixar perquè ordena aquest flux i evita molta gestió dispersa.",
        "bullets": [
            "Seguiment de quotes i rebuts",
            "Remeses i moviments agrupats",
            "Traça clara per donant o soci",
        ],
    },
    "donacions i fiscalitat": {
        "title": "Valor clar en donacions i fiscalitat",
        "body": "Quan el problema és controlar donacions, devolucions i rastre fiscal, Summa tendeix a aportar valor real.",
        "bullets": [
            "Històric de donacions i devolucions",
            "Certificats i models fiscals",
            "Ordre operatiu al voltant del donant",
        ],
    },
    "tresoreria i conciliacio": {
        "title": "Valor clar en tresoreria i conciliació",
        "body": "Si la fricció està al banc i a la conciliació, el valor acostuma a aparèixer en claredat operativa i menys feina manual.",
        "bullets": [
            "Importació i conciliació bancària",
            "Seguiment de moviments",
            "Menys dispersió entre fulls i correus",
        ],
    },
    "projectes i justificacio": {
        "title": "Valor possible en projectes i justificació",
        "body": "Si el dolor és justificar despesa o ordenar projecte, hi pot haver encaix, però convé validar bé l'abast.",
        "bullets": [
            "Despeses i justificació econòmica",
            "Ordre per projecte",
            "Evidència documental més clara",
        ],
    },
}

SYSTEM_PROMPT = """
Ets el web-agent public de Summa Social.

Objectiu:
- qualificar o desqualificar una entitat del tercer sector
- ser curt, selectiu i pragmatic
- aportar valor enmig del diagnostic quan detectes un dolor alineat
- evitar salvar leads dubtosos amb llenguatge amable

Que es Summa:
- aplicacio web per a entitats petites i mitjanes
- resol sobretot tresoreria, moviments bancaris, donants, quotes, remeses, donacions, fiscalitat i operativa economica
- no es un ERP complet
- no es comptabilitat formal completa
- no es RRHH, nomines ni gestio de voluntariat

Regles:
- respon en catala si l'usuari no ha marcat clarament un altre idioma
- no facis mes preguntes de les necessaries
- si detectes un anti-ICP clar, marca low_fit i tanca sense salvar el lead
- si detectes un dolor alineat, pots explicar valor abans de seguir preguntant
- si falta un unic senyal critic, pregunta nomes per aquell senyal i no avancis al seguent
- no inventis integracions, moduls, processos ni capacitats no documentades al producte

Contracte de sortida:
- retorna nomes JSON valid
- agent_message: missatge curt i util
- fit_assessment: good_fit | uncertain_fit | low_fit
- signals_collected: entity_type, team_size, primary_pain, exclusion_reason
- next_question: string o null
- qualification_summary: string o null
- recommended_next_step: ask_more | show_value | offer_demo | capture_contact | disqualify
- ui_action.type: none | render_component
- ui_action.component: None | ChoiceSelector | FeatureCard | LeadCaptureForm | QualificationSummaryCard
- ui_action.props:
  - ChoiceSelector: { field, label, options: [{ id, label }] }
  - FeatureCard: { title, body, bullets? }
  - LeadCaptureForm: { headline, description, fields?: [{ id, label, placeholder?, type? }] }
  - QualificationSummaryCard: { headline, summary, bullets?, actionLabel?, actionMessage? }

No retornis text fora del JSON.
""".strip()


def load_local_env() -> None:
    env_candidates = (
        Path(__file__).with_name(".env"),
        Path(__file__).resolve().parents[2] / ".env.local",
    )

    for path in env_candidates:
        if not path.exists():
            continue

        for raw_line in path.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


REQUEST_SCHEMA = read_json(
    Path(__file__).resolve().parents[1] / "contracts" / "web-agent-request.schema.json"
)
RESPONSE_SCHEMA = read_json(
    Path(__file__).resolve().parents[1] / "contracts" / "web-agent-response.schema.json"
)


def json_error(error_code: str, details: list[str] | None = None) -> dict[str, Any]:
    payload: dict[str, Any] = {"error": error_code}
    if details:
        payload["details"] = details
    return payload


def normalize_text(value: Any, *, max_length: int = 2000) -> str | None:
    if not isinstance(value, str):
        return None
    text = " ".join(value.strip().split())
    if not text:
        return None
    return text[:max_length]


def normalize_signal(value: Any) -> str | None:
    if value is None:
        return None
    return normalize_text(value, max_length=200)


def empty_signals() -> dict[str, str | None]:
    return {field: None for field in PROFILE_FIELDS}


def validate_request_payload(payload: Any) -> tuple[dict[str, Any] | None, list[str]]:
    errors: list[str] = []

    if not isinstance(payload, dict):
        return None, ["Request body must be a JSON object."]

    locale = normalize_text(payload.get("locale"), max_length=10)
    if locale is None:
        errors.append("locale is required and must be a short string.")
        locale = "ca"

    raw_messages = payload.get("messages")
    messages: list[dict[str, str]] = []
    if not isinstance(raw_messages, list):
        errors.append("messages must be an array.")
    else:
        if len(raw_messages) > 12:
            errors.append("messages cannot exceed 12 items.")
        for index, item in enumerate(raw_messages[:12]):
            if not isinstance(item, dict):
                errors.append(f"messages[{index}] must be an object.")
                continue
            role = item.get("role")
            text = normalize_text(item.get("text"))
            if role not in {"user", "assistant"}:
                errors.append(f"messages[{index}].role must be user or assistant.")
                continue
            if text is None:
                errors.append(f"messages[{index}].text must be a non-empty string.")
                continue
            messages.append({"role": role, "text": text})

    raw_profile = payload.get("known_profile")
    signals = empty_signals()
    if not isinstance(raw_profile, dict):
        errors.append("known_profile must be an object.")
    else:
        for field in PROFILE_FIELDS:
            if field not in raw_profile:
                errors.append(f"known_profile.{field} is required.")
                continue
            signals[field] = normalize_signal(raw_profile.get(field))

    raw_ui_capabilities = payload.get("ui_capabilities")
    ui_capabilities: list[str] = []
    if not isinstance(raw_ui_capabilities, list):
        errors.append("ui_capabilities must be an array.")
    else:
        seen: set[str] = set()
        for index, item in enumerate(raw_ui_capabilities):
            if not isinstance(item, str) or item not in ALLOWED_UI_CAPABILITIES:
                errors.append(f"ui_capabilities[{index}] is not allowed.")
                continue
            if item in seen:
                errors.append(f"ui_capabilities[{index}] is duplicated.")
                continue
            seen.add(item)
            ui_capabilities.append(item)

    if errors:
        return None, errors

    return {
        "locale": locale,
        "messages": messages,
        "known_profile": signals,
        "ui_capabilities": ui_capabilities,
    }, []


def combined_user_text(messages: list[dict[str, str]]) -> str:
    return " ".join(message["text"].lower() for message in messages if message["role"] == "user")


def infer_entity_type(text: str) -> str | None:
    if "fundac" in text:
        return "fundacio"
    if "associ" in text:
        return "associacio"
    if "ong" in text:
        return "ong"
    if "cooperativ" in text:
        return "cooperativa social"
    if "federacio" in text:
        return "federacio"
    return None


def infer_primary_pain(text: str) -> str | None:
    if any(token in text for token in ("remesa", "quota", "rebut")):
        return "quotes i remeses"
    if any(token in text for token in ("donac", "certificat", "fiscal", "stripe")):
        return "donacions i fiscalitat"
    if any(token in text for token in ("banc", "moviment", "concili")):
        return "tresoreria i conciliacio"
    if any(token in text for token in ("project", "subvenci", "justific")):
        return "projectes i justificacio"
    return None


def infer_team_size(text: str) -> str | None:
    if any(token in text for token in ("una persona", "una sola persona", "1 persona")):
        return "1"
    if any(token in text for token in ("dues persones", "dos persones", "tres persones", "2 persones", "3 persones")):
        return "2-3"
    if any(
        token in text
        for token in (
            "quatre persones",
            "cinc persones",
            "sis persones",
            "set persones",
            "vuit persones",
            "4 persones",
            "5 persones",
            "6 persones",
            "7 persones",
            "8 persones",
        )
    ):
        return "4-8"
    if any(token in text for token in ("mes de vuit", "més de vuit", "9 persones", "10 persones")):
        return "8+"

    match = re.search(r"\b(\d{1,2})\s+person", text)
    if not match:
        return None

    amount = int(match.group(1))
    if amount <= 1:
        return "1"
    if amount <= 3:
        return "2-3"
    if amount <= 8:
        return "4-8"
    return "8+"


def detect_disqualification_reason(text: str) -> str | None:
    for reason, keywords in ANTI_ICP_RULES:
        if any(keyword in text for keyword in keywords):
            return reason
    return None


def infer_signals(
    messages: list[dict[str, str]],
    known_profile: dict[str, str | None],
) -> dict[str, str | None]:
    inferred = dict(known_profile)
    text = combined_user_text(messages)

    if not inferred["entity_type"]:
        inferred["entity_type"] = infer_entity_type(text)

    if not inferred["primary_pain"]:
        inferred["primary_pain"] = infer_primary_pain(text)

    if not inferred["team_size"]:
        inferred["team_size"] = infer_team_size(text)

    if not inferred["exclusion_reason"]:
        inferred["exclusion_reason"] = detect_disqualification_reason(text)

    return inferred


def next_missing_signal(signals: dict[str, str | None]) -> str | None:
    for field in ("entity_type", "primary_pain", "team_size"):
        if not signals[field]:
            return field
    return None


def choice_action(field: str, label: str, options: list[tuple[str, str]]) -> dict[str, Any]:
    return {
        "type": "render_component",
        "component": "ChoiceSelector",
        "props": {
            "field": field,
            "label": label,
            "options": [{"id": option_id, "label": option_label} for option_id, option_label in options],
        },
    }


def qualification_card(
    headline: str,
    summary: str,
    bullets: list[str],
    *,
    action_label: str | None = None,
    action_message: str | None = None,
) -> dict[str, Any]:
    return {
        "type": "render_component",
        "component": "QualificationSummaryCard",
        "props": {
            "headline": headline,
            "summary": summary,
            "bullets": bullets,
            "actionLabel": action_label,
            "actionMessage": action_message,
        },
    }


def feature_card(primary_pain: str | None) -> dict[str, Any]:
    value = VALUE_PROPOSITIONS.get(primary_pain or "", VALUE_PROPOSITIONS["tresoreria i conciliacio"])
    return {
        "type": "render_component",
        "component": "FeatureCard",
        "props": value,
    }


def lead_capture_form() -> dict[str, Any]:
    return {
        "type": "render_component",
        "component": "LeadCaptureForm",
        "props": {
            "headline": "Si hi ha encaix, deixa les dades i continuem",
            "description": "Això només té sentit si veieu clar que val la pena una demo curta.",
            "fields": [
                {"id": "name", "label": "Nom", "placeholder": "Nom i cognoms", "type": "text"},
                {"id": "entity", "label": "Entitat", "placeholder": "Nom de l'entitat", "type": "text"},
                {"id": "email", "label": "Email", "placeholder": "Correu electrònic", "type": "email"},
                {"id": "phone", "label": "Telèfon", "placeholder": "Telèfon opcional", "type": "tel"},
            ],
        },
    }


def default_choice_action(signals: dict[str, str | None]) -> dict[str, Any]:
    if not signals["entity_type"]:
        return choice_action(
            "entity_type",
            "Quin tipus d'entitat sou?",
            [
                ("associacio", "Associacio"),
                ("fundacio", "Fundacio"),
                ("ong", "ONG"),
                ("altres", "Altres entitats socials"),
            ],
        )

    if not signals["primary_pain"]:
        return choice_action(
            "primary_pain",
            "On teniu la friccio principal?",
            [
                ("tresoreria", "Tresoreria i conciliacio"),
                ("quotes", "Quotes i remeses"),
                ("donacions", "Donacions i fiscalitat"),
                ("projectes", "Projectes i justificacio"),
                ("altres", "Altres necessitats"),
            ],
        )

    if not signals["team_size"]:
        return choice_action(
            "team_size",
            "Quantes persones toqueu aquest flux?",
            [
                ("1", "Una persona"),
                ("2-3", "Dues o tres persones"),
                ("4-8", "Entre quatre i vuit"),
                ("8+", "Mes de vuit"),
            ],
        )

    return choice_action(
        "decision",
        "Si hi ha encaix, quin seguent pas preferiu?",
        [
            ("demo", "Volem una demo curta"),
            ("contacte", "Deixem el contacte"),
        ],
    )


def summarize_signals(signals: dict[str, str | None]) -> list[str]:
    bullets = []
    if signals["entity_type"]:
        bullets.append(f"Tipus d'entitat: {signals['entity_type']}")
    if signals["primary_pain"]:
        bullets.append(f"Dolor principal: {signals['primary_pain']}")
    if signals["team_size"]:
        bullets.append(f"Equip implicat: {signals['team_size']}")
    if signals["exclusion_reason"]:
        bullets.append(f"Motiu d'exclusio: {signals['exclusion_reason']}")
    return bullets


def deterministic_response(request_payload: dict[str, Any]) -> dict[str, Any]:
    signals = infer_signals(
        request_payload["messages"],
        request_payload["known_profile"],
    )

    if signals["exclusion_reason"]:
        summary = (
            "Pel que expliques, el cas apunta fora del que Summa resol millor. "
            "No sembla un bon encaix per aquest pilot."
        )
        return {
            "agent_message": "Aixo s'allunya del nucli de Summa. No us vull donar una falsa expectativa d'encaix.",
            "fit_assessment": "low_fit",
            "signals_collected": signals,
            "next_question": None,
            "qualification_summary": summary,
            "recommended_next_step": "disqualify",
            "ui_action": qualification_card(
                "Poc encaix",
                summary,
                summarize_signals(signals),
            ),
        }

    if not request_payload["messages"] or not signals["entity_type"]:
        next_question = "Quin tipus d'entitat sou?"
        return {
            "agent_message": "Per situar-nos be, comencem pel tipus d'entitat.",
            "fit_assessment": "uncertain_fit",
            "signals_collected": signals,
            "next_question": next_question,
            "qualification_summary": None,
            "recommended_next_step": "ask_more",
            "ui_action": default_choice_action(signals),
        }

    if not signals["primary_pain"]:
        next_question = "On teniu avui la friccio principal?"
        return {
            "agent_message": "Entes. Ara vull veure si el vostre problema entra realment dins del que Summa resol.",
            "fit_assessment": "uncertain_fit",
            "signals_collected": signals,
            "next_question": next_question,
            "qualification_summary": None,
            "recommended_next_step": "ask_more",
            "ui_action": default_choice_action(signals),
        }

    if not signals["team_size"]:
        summary = (
            "Hi ha senyal inicial d'encaix perquè el dolor que descrius entra dins del nucli de Summa."
        )
        return {
            "agent_message": "Aixo si que sona a un problema on Summa pot aportar valor.",
            "fit_assessment": "uncertain_fit",
            "signals_collected": signals,
            "next_question": "Quantes persones toqueu aquest flux en el dia a dia?",
            "qualification_summary": summary,
            "recommended_next_step": "show_value",
            "ui_action": feature_card(signals["primary_pain"]),
        }

    team_size = signals["team_size"] or ""
    fit_assessment = "uncertain_fit" if team_size == "8+" else "good_fit"
    recommended_next_step = "capture_contact" if fit_assessment == "uncertain_fit" else "offer_demo"
    summary = (
        "Veig un cas bastant alineat amb Summa: hi ha un dolor operatiu real i entra dins del nucli de producte."
        if fit_assessment == "good_fit"
        else "Veig una part del cas alineada amb Summa, pero convé validar abast abans de prometre massa."
    )
    action_label = "Demanar demo" if recommended_next_step == "offer_demo" else "Deixar contacte"
    action_message = (
        "Volem una demo curta per validar aquest flux."
        if recommended_next_step == "offer_demo"
        else "Us deixo les dades per continuar."
    )

    return {
        "agent_message": "Ja tinc prou senyal per deixar una conclusio clara.",
        "fit_assessment": fit_assessment,
        "signals_collected": signals,
        "next_question": None,
        "qualification_summary": summary,
        "recommended_next_step": recommended_next_step,
        "ui_action": qualification_card(
            "Resultat de qualificacio",
            summary,
            summarize_signals(signals),
            action_label=action_label,
            action_message=action_message,
        )
        if fit_assessment == "good_fit"
        else lead_capture_form(),
    }


def build_system_prompt(request_payload: dict[str, Any]) -> str:
    inferred_signals = infer_signals(
        request_payload["messages"],
        request_payload["known_profile"],
    )
    dynamic_context = {
        "locale": request_payload["locale"],
        "known_profile": request_payload["known_profile"],
        "inferred_signals": inferred_signals,
        "missing_signal": next_missing_signal(inferred_signals),
        "ui_capabilities": request_payload["ui_capabilities"],
    }
    return f"{SYSTEM_PROMPT}\n\nContext actual:\n{json.dumps(dynamic_context, ensure_ascii=False)}"


def build_contents(messages: list[dict[str, str]]) -> list[dict[str, Any]]:
    if not messages:
        return [
            {
                "role": "user",
                "parts": [{"text": "Comenca el diagnostic del web-agent per una entitat que arriba per primera vegada."}],
            }
        ]

    return [
        {
            "role": "user" if message["role"] == "user" else "model",
            "parts": [{"text": message["text"]}],
        }
        for message in messages
    ]


def call_gemini(request_payload: dict[str, Any]) -> dict[str, Any]:
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise RuntimeError("GOOGLE_API_KEY is required to call Gemini.")

    model = os.getenv("WEB_AGENT_MODEL", DEFAULT_MODEL)
    endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    payload = {
        "system_instruction": {
            "parts": [{"text": build_system_prompt(request_payload)}],
        },
        "contents": build_contents(request_payload["messages"]),
        "generationConfig": {
            "responseMimeType": "application/json",
            "responseJsonSchema": RESPONSE_SCHEMA,
        },
    }

    http_request = request.Request(
        endpoint,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "x-goog-api-key": api_key,
        },
        method="POST",
    )

    try:
        with request.urlopen(http_request, timeout=30) as response:
            raw_response = response.read().decode("utf-8")
    except error.HTTPError as exc:
        details = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Gemini HTTP {exc.code}: {details}") from exc
    except error.URLError as exc:
        raise RuntimeError(f"Gemini connection failed: {exc.reason}") from exc

    parsed = json.loads(raw_response)
    candidates = parsed.get("candidates")
    if not isinstance(candidates, list) or not candidates:
        raise RuntimeError("Gemini returned no candidates.")

    parts = candidates[0].get("content", {}).get("parts", [])
    text_parts = [
        part.get("text", "")
        for part in parts
        if isinstance(part, dict) and isinstance(part.get("text"), str)
    ]
    if not text_parts:
        raise RuntimeError("Gemini returned no text content.")

    return json.loads("".join(text_parts))


def normalize_ui_action(value: Any) -> dict[str, Any]:
    if not isinstance(value, dict):
        return {"type": "none", "component": "None", "props": {}}

    action_type = value.get("type")
    component = value.get("component")
    props = value.get("props")
    if action_type not in {"none", "render_component"} or component not in UI_COMPONENTS:
        return {"type": "none", "component": "None", "props": {}}
    if action_type == "none" or component == "None":
        return {"type": "none", "component": "None", "props": {}}
    return {
        "type": "render_component",
        "component": component,
        "props": props if isinstance(props, dict) else {},
    }


def enrich_ui_action(
    ui_action: dict[str, Any],
    signals: dict[str, str | None],
    fit_assessment: str,
    recommended_next_step: str,
    qualification_summary: str | None,
) -> dict[str, Any]:
    if ui_action["type"] != "render_component":
        return ui_action

    props = ui_action.get("props", {})
    if not isinstance(props, dict):
        props = {}

    if ui_action["component"] == "ChoiceSelector":
        if props.get("label") and isinstance(props.get("options"), list):
            return ui_action
        return default_choice_action(signals)

    if ui_action["component"] == "FeatureCard":
        if props:
            return ui_action
        return feature_card(signals["primary_pain"])

    if ui_action["component"] == "LeadCaptureForm":
        if props:
            return ui_action
        return lead_capture_form()

    if ui_action["component"] == "QualificationSummaryCard":
        if props:
            return ui_action
        action_label = None
        action_message = None
        if recommended_next_step == "offer_demo":
            action_label = "Demanar demo"
            action_message = "Volem una demo curta per validar aquest flux."
        elif recommended_next_step == "capture_contact":
            action_label = "Deixar contacte"
            action_message = "Us deixo les dades per continuar."
        return qualification_card(
            "Resultat de qualificacio" if fit_assessment != "low_fit" else "Poc encaix",
            qualification_summary or "Conclusio del diagnostic.",
            summarize_signals(signals),
            action_label=action_label,
            action_message=action_message,
        )

    return ui_action


def normalize_response(candidate: Any, request_payload: dict[str, Any]) -> dict[str, Any]:
    deterministic = deterministic_response(request_payload)
    if not isinstance(candidate, dict):
        return deterministic

    signals = infer_signals(
        request_payload["messages"],
        request_payload["known_profile"],
    )
    if signals["exclusion_reason"]:
        return deterministic

    agent_message = normalize_text(candidate.get("agent_message"), max_length=1200)
    if agent_message is None:
        return deterministic

    fit_assessment = candidate.get("fit_assessment")
    if fit_assessment not in FIT_ASSESSMENTS:
        fit_assessment = deterministic["fit_assessment"]

    next_question = normalize_text(candidate.get("next_question"), max_length=400)
    qualification_summary = normalize_text(candidate.get("qualification_summary"), max_length=600)

    recommended_next_step = candidate.get("recommended_next_step")
    if recommended_next_step not in RECOMMENDED_NEXT_STEPS:
        recommended_next_step = deterministic["recommended_next_step"]

    candidate_signals = candidate.get("signals_collected")
    if isinstance(candidate_signals, dict):
        for field in PROFILE_FIELDS:
            if field in candidate_signals:
                normalized_value = normalize_signal(candidate_signals.get(field))
                if field == "team_size" and signals["team_size"] is None:
                    continue
                signals[field] = normalized_value or signals[field]

    if fit_assessment == "low_fit":
        signals["exclusion_reason"] = signals["exclusion_reason"] or "fora de l'ICP actual"
        recommended_next_step = "disqualify"

    if recommended_next_step in {"ask_more", "show_value"} and fit_assessment == "good_fit":
        fit_assessment = "uncertain_fit"

    if recommended_next_step in {"offer_demo", "capture_contact", "disqualify"}:
        next_question = None

    ui_action = enrich_ui_action(
        normalize_ui_action(candidate.get("ui_action")),
        signals,
        fit_assessment,
        recommended_next_step,
        qualification_summary,
    )

    if not qualification_summary:
        qualification_summary = deterministic["qualification_summary"]
    if not next_question and recommended_next_step in {"ask_more", "show_value"}:
        next_question = deterministic["next_question"]

    return {
        "agent_message": agent_message,
        "fit_assessment": fit_assessment,
        "signals_collected": signals,
        "next_question": next_question,
        "qualification_summary": qualification_summary,
        "recommended_next_step": recommended_next_step,
        "ui_action": ui_action,
    }


class WebAgentHandler(BaseHTTPRequestHandler):
    server_version = "SummaWebAgent/0.1"

    def log_message(self, format: str, *args: Any) -> None:  # noqa: A003
        LOGGER.info("%s - %s", self.address_string(), format % args)

    def _send_json(self, status: HTTPStatus, payload: dict[str, Any]) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self) -> None:  # noqa: N802
        self._send_json(HTTPStatus.OK, {"ok": True})

    def do_GET(self) -> None:  # noqa: N802
        if self.path == "/health":
            self._send_json(
                HTTPStatus.OK,
                {
                    "ok": True,
                    "model": os.getenv("WEB_AGENT_MODEL", DEFAULT_MODEL),
                    "request_schema": REQUEST_SCHEMA["title"],
                    "response_schema": RESPONSE_SCHEMA["title"],
                },
            )
            return

        self._send_json(HTTPStatus.NOT_FOUND, json_error("not_found"))

    def do_POST(self) -> None:  # noqa: N802
        if self.path != "/api/web-agent":
            self._send_json(HTTPStatus.NOT_FOUND, json_error("not_found"))
            return

        content_length = self.headers.get("Content-Length")
        if not content_length:
            self._send_json(HTTPStatus.BAD_REQUEST, json_error("missing_body"))
            return

        try:
            raw_body = self.rfile.read(int(content_length))
            payload = json.loads(raw_body.decode("utf-8"))
        except (ValueError, json.JSONDecodeError):
            self._send_json(HTTPStatus.BAD_REQUEST, json_error("invalid_json"))
            return

        validated_payload, errors = validate_request_payload(payload)
        if validated_payload is None:
            self._send_json(HTTPStatus.BAD_REQUEST, json_error("invalid_request", errors))
            return

        signals = infer_signals(
            validated_payload["messages"],
            validated_payload["known_profile"],
        )
        if signals["exclusion_reason"]:
            self._send_json(HTTPStatus.OK, deterministic_response(validated_payload))
            return

        try:
            candidate = call_gemini(validated_payload)
            normalized = normalize_response(candidate, validated_payload)
        except Exception as exc:  # noqa: BLE001
            LOGGER.exception("Gemini call failed, falling back to deterministic response: %s", exc)
            normalized = deterministic_response(validated_payload)

        self._send_json(HTTPStatus.OK, normalized)


def main() -> None:
    load_local_env()
    host = os.getenv("WEB_AGENT_HOST", DEFAULT_HOST)
    port = int(os.getenv("WEB_AGENT_PORT", str(DEFAULT_PORT)))
    server = ThreadingHTTPServer((host, port), WebAgentHandler)
    LOGGER.info("Starting web-agent backend on http://%s:%s", host, port)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        LOGGER.info("Stopping web-agent backend")
    finally:
        server.server_close()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    main()
