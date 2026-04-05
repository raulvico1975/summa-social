"""Text-first backend for the Summa web-agent pilot."""

from __future__ import annotations

import json
import logging
import os
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib import error, request

LOGGER = logging.getLogger("summa.voice_agents.web_agent")

DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 8787
DEFAULT_MODEL = "gemini-2.5-flash"
ALLOWED_UI_CAPABILITIES = {
    "choice_selector",
    "feature_card",
    "lead_capture_form",
    "qualification_summary",
}
QUALIFICATION_STATUSES = {
    "evaluating",
    "good_fit",
    "partial_fit",
    "low_fit",
    "ready_to_convert",
}
NEXT_STEPS = {
    "continue_diagnosis",
    "offer_demo",
    "capture_lead",
    "close_out",
}
UI_COMPONENTS = {
    "None",
    "ChoiceSelector",
    "FeatureCard",
    "LeadCaptureForm",
    "QualificationSummaryCard",
}
PROFILE_FIELDS = (
    "entity_type",
    "team_size",
    "primary_pain",
    "urgency",
    "fit_band",
)

SYSTEM_PROMPT = """
Ets el web-agent public de Summa Social.

Objectiu:
- diagnosticar si Summa Social encaixa amb una entitat del tercer sector
- reduir friccio respecte a un formulari o xat generic
- concloure clarament amb bon encaix, encaix parcial o poc encaix
- derivar nomes cap a demo o contacte quan toca

Context real de producte:
- Summa Social es una aplicacio web per a entitats petites i mitjanes
- resol tresoreria, moviments bancaris, donants, quotes, remeses SEPA, donacions, fiscalitat, certificats, justificacio economica de projectes i suport operatiu
- encaixa millor amb entitats que avui treballen amb fulls de calcul, correus i processos manuals
- no es un ERP complet ni una suite de RRHH ni una eina pensada per a self-service total sense acompanyament

Criteri de prequalificacio:
- senyal positiva: entitat social petita o mitjana, necessitat d'ordre operatiu, dos o mes persones implicades, dades historiques disponibles, voluntat de fer onboarding
- senyal de risc: necessitat d'ERP complet, self-service absolut, pressa extrema per estar operatius en menys de dues setmanes, expectatives 24/7, volum molt superior al perfil habitual

Regles de conversa:
- respon en catala, excepte si la persona escriu clarament en un altre idioma
- maxim tres preguntes de diagnostic abans d'emetre una conclusio
- no facis interrogatori: quan puguis, usa opcions guiades
- no inventis funcionalitats ni promeses comercials
- si ja tens prou senyal, tanca i proposa el seguent pas
- si la persona no encaixa, explica-ho amb honestedat i sense tancar en fals

Contracte de sortida:
- has de retornar nomes JSON valid
- agent_message: text natural per a l'usuari
- qualification_status: evaluating | good_fit | partial_fit | low_fit | ready_to_convert
- collected_signals: entity_type, team_size, primary_pain, urgency, fit_band
- ui_action.type: none | render_component
- ui_action.component: None | ChoiceSelector | FeatureCard | LeadCaptureForm | QualificationSummaryCard
- ui_action.props:
  - ChoiceSelector: { field, label, options: [{ id, label }] }
  - FeatureCard: { title, body, bullets?, ctaLabel?, ctaMessage? }
  - LeadCaptureForm: { headline, description, fields?: [{ id, label, placeholder?, type? }] }
  - QualificationSummaryCard: { headline, summary, bullets?, actionLabel?, actionMessage? }
- next_step: continue_diagnosis | offer_demo | capture_lead | close_out

Regles finals:
- si no tens historial, comenca preguntant pel tipus d'entitat o pel dolor principal
- si detectes bon encaix o encaix parcial, recomana demo o captura de contacte
- si detectes poc encaix, tanca amb respecte i sense demanar demo
- no escriguis text fora del JSON
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


def default_profile() -> dict[str, str | None]:
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
    profile = default_profile()
    if not isinstance(raw_profile, dict):
        errors.append("known_profile must be an object.")
    else:
        for field in PROFILE_FIELDS:
            if field not in raw_profile:
                errors.append(f"known_profile.{field} is required.")
                continue
            normalized = normalize_signal(raw_profile.get(field))
            profile[field] = normalized

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
        "known_profile": profile,
        "ui_capabilities": ui_capabilities,
    }, []


def infer_profile_from_messages(
    messages: list[dict[str, str]],
    known_profile: dict[str, str | None],
) -> dict[str, str | None]:
    inferred = dict(known_profile)
    combined = " ".join(message["text"].lower() for message in messages if message["role"] == "user")

    if not inferred["entity_type"]:
        if "fundac" in combined:
            inferred["entity_type"] = "fundacio"
        elif "associ" in combined:
            inferred["entity_type"] = "associacio"
        elif "ong" in combined:
            inferred["entity_type"] = "ong"
        elif "cooperativ" in combined:
            inferred["entity_type"] = "cooperativa social"

    if not inferred["primary_pain"]:
        if "remesa" in combined or "quota" in combined:
            inferred["primary_pain"] = "quotes i remeses"
        elif "donac" in combined or "stripe" in combined:
            inferred["primary_pain"] = "donacions i fiscalitat"
        elif "concili" in combined or "banc" in combined or "moviment" in combined:
            inferred["primary_pain"] = "tresoreria i conciliacio"
        elif "project" in combined or "subvenci" in combined or "justific" in combined:
            inferred["primary_pain"] = "projectes i justificacio"

    if not inferred["urgency"]:
        if "urgent" in combined or "aviat" in combined:
            inferred["urgency"] = "alta"
        elif "quan puguem" in combined or "sense pressa" in combined:
            inferred["urgency"] = "baixa"

    return inferred


def normalize_ui_action(value: Any) -> dict[str, Any]:
    if not isinstance(value, dict):
        return {"type": "none", "component": "None", "props": {}}

    action_type = value.get("type")
    component = value.get("component")
    props = value.get("props")

    if action_type not in {"none", "render_component"}:
        return {"type": "none", "component": "None", "props": {}}

    if component not in UI_COMPONENTS:
        return {"type": "none", "component": "None", "props": {}}

    if action_type == "none" or component == "None":
        return {"type": "none", "component": "None", "props": {}}

    if not isinstance(props, dict):
        props = {}

    return {
        "type": "render_component",
        "component": component,
        "props": props,
    }


def fallback_choice(field: str, label: str, options: list[tuple[str, str]]) -> dict[str, Any]:
    return {
        "type": "render_component",
        "component": "ChoiceSelector",
        "props": {
            "field": field,
            "label": label,
            "options": [{"id": option_id, "label": option_label} for option_id, option_label in options],
        },
    }


def default_choice_action(profile: dict[str, str | None]) -> dict[str, Any]:
    if not profile["entity_type"]:
        return fallback_choice(
            "entity_type",
            "Tria l'opcio que us descriu millor",
            [
                ("associacio", "Associacio"),
                ("fundacio", "Fundacio"),
                ("ong", "ONG"),
                ("altres", "Altres entitats socials"),
            ],
        )

    if not profile["primary_pain"]:
        return fallback_choice(
            "primary_pain",
            "On teniu mes friccio ara mateix?",
            [
                ("tresoreria", "Tresoreria i conciliacio"),
                ("quotes", "Quotes i remeses"),
                ("donacions", "Donacions i fiscalitat"),
                ("projectes", "Projectes i justificacio"),
            ],
        )

    if not profile["team_size"]:
        return fallback_choice(
            "team_size",
            "Quantes persones esteu implicades en aquesta gestio?",
            [
                ("1", "Una persona"),
                ("2-3", "Dues o tres persones"),
                ("4-8", "Entre quatre i vuit"),
                ("8+", "Mes de vuit"),
            ],
        )

    if not profile["urgency"]:
        return fallback_choice(
            "urgency",
            "Amb quina urgencia voldrieu ordenar aquest flux?",
            [
                ("alta", "Ens urgeix aquest mes"),
                ("mitjana", "Aquest trimestre"),
                ("baixa", "Ho estem explorant"),
            ],
        )

    return fallback_choice(
        "next_step",
        "Voleu passar al seguent pas?",
        [
            ("demo", "Si, volem una demo curta"),
            ("contacte", "Si, deixem el contacte"),
            ("encara-no", "No encara, nomes estem valorant"),
        ],
    )


def default_feature_card(profile: dict[str, str | None]) -> dict[str, Any]:
    pain = (profile["primary_pain"] or "").lower()
    if "quotes" in pain or "remes" in pain:
        return {
            "title": "Quotes i remeses amb menys feina manual",
            "body": "Summa ajuda a separar remeses, seguir quotes i entendre cada apunt sense tant Excel manual.",
            "bullets": [
                "Seguiment de quotes i rebuts",
                "Remeses SEPA i moviments agrupats",
                "Fitxa unica del donant o soci",
            ],
        }
    if "donac" in pain or "fiscal" in pain:
        return {
            "title": "Donacions i fiscalitat mes clares",
            "body": "El valor acostuma a aparèixer quan cal controlar donacions, devolucions, certificats i rastre fiscal.",
            "bullets": [
                "Historic de donacions i devolucions",
                "Certificats i models fiscals",
                "Integracio operativa amb Stripe",
            ],
        }
    if "project" in pain or "justific" in pain:
        return {
            "title": "Projectes i justificacio economica",
            "body": "Si el dolor es justificar despeses o ordenar projectes, Summa pot reduir dispersio i temps de preparacio.",
            "bullets": [
                "Despeses i evidencies documentals",
                "Pressupost i seguiment per projecte",
                "Exports per financadors",
            ],
        }
    return {
        "title": "Tresoreria i operativa mes netes",
        "body": "Summa centralitza moviments, conciliacio i seguiment economic per reduir feina repetitiva.",
        "bullets": [
            "Importacio i conciliacio bancaria",
            "Categories i seguiment operatiu",
            "Context economic mes clar per l'equip",
        ],
    }


def default_lead_capture_form() -> dict[str, Any]:
    return {
        "headline": "Si voleu continuar, deixeu-nos les dades clau",
        "description": "Amb aixo podem preparar una demo o una conversa curta de validacio.",
        "fields": [
            {"id": "name", "label": "Nom", "placeholder": "Nom i cognoms", "type": "text"},
            {"id": "entity", "label": "Entitat", "placeholder": "Nom de l'entitat", "type": "text"},
            {"id": "email", "label": "Email", "placeholder": "Correu electronic", "type": "email"},
            {"id": "phone", "label": "Telefon", "placeholder": "Telefon opcional", "type": "tel"},
        ],
    }


def default_summary_card(
    profile: dict[str, str | None],
    qualification_status: str,
    next_step: str,
) -> dict[str, Any]:
    summary = {
        "good_fit": "Hi ha prou senyal per considerar que Summa encaixa be amb el vostre cas.",
        "partial_fit": "Hi ha encaix en una part clara del problema, pero encara convé validar limitacions i abast.",
        "low_fit": "El cas sembla anar cap a necessitats que superen l'abast actual de Summa.",
        "ready_to_convert": "El diagnostic esta prou madur per passar directament a contacte o demo.",
    }.get(qualification_status, "Ja tenim prou senyal per decidir el seguent pas.")
    bullets = [
        f"Tipus d'entitat: {profile['entity_type'] or 'pendent'}",
        f"Dolor principal: {profile['primary_pain'] or 'pendent'}",
        f"Equip implicat: {profile['team_size'] or 'pendent'}",
    ]
    action_label = "Demanar demo" if next_step == "offer_demo" else "Deixar contacte"
    action_message = (
        "Ens interessa una demo curta per veure el flux."
        if next_step == "offer_demo"
        else "Us deixo les nostres dades per continuar."
    )

    return {
        "headline": "Conclusio del diagnostic",
        "summary": summary,
        "bullets": bullets,
        "actionLabel": action_label if next_step in {"offer_demo", "capture_lead"} else None,
        "actionMessage": action_message if next_step in {"offer_demo", "capture_lead"} else None,
    }


def enrich_ui_action(
    ui_action: dict[str, Any],
    profile: dict[str, str | None],
    qualification_status: str,
    next_step: str,
) -> dict[str, Any]:
    if ui_action["type"] != "render_component":
        return ui_action

    props = ui_action.get("props", {})
    if not isinstance(props, dict):
        props = {}

    if ui_action["component"] == "ChoiceSelector":
        required = props.get("label") and isinstance(props.get("options"), list)
        return {
            **ui_action,
            "props": props if required else default_choice_action(profile)["props"],
        }

    if ui_action["component"] == "FeatureCard":
        return {
            **ui_action,
            "props": props or default_feature_card(profile),
        }

    if ui_action["component"] == "LeadCaptureForm":
        return {
            **ui_action,
            "props": props or default_lead_capture_form(),
        }

    if ui_action["component"] == "QualificationSummaryCard":
        return {
            **ui_action,
            "props": props or default_summary_card(profile, qualification_status, next_step),
        }

    return ui_action


def fallback_response(request_payload: dict[str, Any]) -> dict[str, Any]:
    inferred_profile = infer_profile_from_messages(
        request_payload["messages"],
        request_payload["known_profile"],
    )
    combined = " ".join(
        message["text"].lower()
        for message in request_payload["messages"]
        if message["role"] == "user"
    )

    if not request_payload["messages"] or not inferred_profile["entity_type"]:
        return {
            "agent_message": "Per situar-nos be, quin tipus d'entitat sou i en quin punt us pesa mes la gestio economica?",
            "qualification_status": "evaluating",
            "collected_signals": inferred_profile,
            "ui_action": default_choice_action(inferred_profile),
            "next_step": "continue_diagnosis",
        }

    if not inferred_profile["primary_pain"]:
        return {
            "agent_message": "Entes. On teniu ara mateix la friccio principal que voldrieu ordenar amb mes urgencia?",
            "qualification_status": "evaluating",
            "collected_signals": inferred_profile,
            "ui_action": default_choice_action(inferred_profile),
            "next_step": "continue_diagnosis",
        }

    if not inferred_profile["team_size"]:
        return {
            "agent_message": "Perfecte. Quantes persones esteu realment implicades en la gestio economica o administrativa del dia a dia?",
            "qualification_status": "evaluating",
            "collected_signals": inferred_profile,
            "ui_action": default_choice_action(inferred_profile),
            "next_step": "continue_diagnosis",
        }

    low_fit_markers = ("erp", "rrhh", "24/7", "dues setmanes", "2 setmanes")
    if any(marker in combined for marker in low_fit_markers):
        inferred_profile["fit_band"] = "low_fit"
        return {
            "agent_message": "Veig valor parcial en alguna part del flux, pero el que demaneu s'acosta mes a un ERP complet o a una implantacio molt mes intensa del que Summa acostuma a cobrir.",
            "qualification_status": "low_fit",
            "collected_signals": inferred_profile,
            "ui_action": {
                "type": "render_component",
                "component": "QualificationSummaryCard",
                "props": {
                    "headline": "Poc encaix per aquest cas",
                    "summary": "El vostre cas sembla demanar una capa mes ampla que la proposta actual de Summa.",
                    "bullets": [
                        "Necessitats mes properes a ERP complet",
                        "Risc d'expectatives massa altes pel pilot actual",
                    ],
                },
            },
            "next_step": "close_out",
        }

    inferred_profile["fit_band"] = "partial_fit" if inferred_profile["team_size"] == "1" else "good_fit"
    qualification = inferred_profile["fit_band"] or "partial_fit"
    next_step = "offer_demo" if qualification == "good_fit" else "capture_lead"
    action_message = (
        "Ens interessa una demo curta per veure el flux."
        if next_step == "offer_demo"
        else "Us deixo les nostres dades per continuar."
    )
    action_label = "Demanar demo" if next_step == "offer_demo" else "Deixar contacte"

    return {
        "agent_message": "Amb el que m'heu explicat, veig un encaix prou bo per continuar. El valor sembla estar sobretot en ordenar operativa, cobrament i seguiment sense tanta dispersio manual.",
        "qualification_status": qualification,
        "collected_signals": inferred_profile,
        "ui_action": {
            "type": "render_component",
            "component": "QualificationSummaryCard",
            "props": {
                "headline": "Conclusio del diagnostic",
                "summary": "Hi ha prou senyal per passar al següent pas sense allargar mes la conversa.",
                "bullets": [
                    f"Tipus d'entitat: {inferred_profile['entity_type']}",
                    f"Dolor principal: {inferred_profile['primary_pain']}",
                    f"Equip implicat: {inferred_profile['team_size']}",
                ],
                "actionLabel": action_label,
                "actionMessage": action_message,
            },
        },
        "next_step": next_step,
    }


def build_system_prompt(request_payload: dict[str, Any]) -> str:
    dynamic_context = {
        "locale": request_payload["locale"],
        "known_profile": request_payload["known_profile"],
        "ui_capabilities": request_payload["ui_capabilities"],
    }
    return f"{SYSTEM_PROMPT}\n\nContext de la sessio actual:\n{json.dumps(dynamic_context, ensure_ascii=False)}"


def build_contents(messages: list[dict[str, str]]) -> list[dict[str, Any]]:
    if not messages:
        return [
            {
                "role": "user",
                "parts": [
                    {
                        "text": "Comenca el diagnostic del web-agent per a una entitat que arriba per primera vegada."
                    }
                ],
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


def normalize_response(candidate: Any, request_payload: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(candidate, dict):
        return fallback_response(request_payload)

    agent_message = normalize_text(candidate.get("agent_message"), max_length=1200)
    if agent_message is None:
        return fallback_response(request_payload)

    qualification_status = candidate.get("qualification_status")
    if qualification_status not in QUALIFICATION_STATUSES:
        qualification_status = "evaluating"

    next_step = candidate.get("next_step")
    if next_step not in NEXT_STEPS:
        next_step = "continue_diagnosis"

    current_profile = infer_profile_from_messages(
        request_payload["messages"],
        request_payload["known_profile"],
    )
    candidate_profile = candidate.get("collected_signals")
    if isinstance(candidate_profile, dict):
        for field in PROFILE_FIELDS:
            current_profile[field] = normalize_signal(candidate_profile.get(field)) or current_profile[field]

    if not current_profile["fit_band"] and qualification_status != "evaluating":
        current_profile["fit_band"] = qualification_status

    ui_action = normalize_ui_action(candidate.get("ui_action"))
    ui_action = enrich_ui_action(
        ui_action,
        current_profile,
        qualification_status,
        next_step,
    )

    return {
        "agent_message": agent_message,
        "qualification_status": qualification_status,
        "collected_signals": current_profile,
        "ui_action": ui_action,
        "next_step": next_step,
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

        self._send_json(
            HTTPStatus.NOT_FOUND,
            json_error("not_found"),
        )

    def do_POST(self) -> None:  # noqa: N802
        if self.path != "/api/web-agent":
            self._send_json(
                HTTPStatus.NOT_FOUND,
                json_error("not_found"),
            )
            return

        content_length = self.headers.get("Content-Length")
        if not content_length:
            self._send_json(
                HTTPStatus.BAD_REQUEST,
                json_error("missing_body"),
            )
            return

        try:
            raw_body = self.rfile.read(int(content_length))
            payload = json.loads(raw_body.decode("utf-8"))
        except (ValueError, json.JSONDecodeError):
            self._send_json(
                HTTPStatus.BAD_REQUEST,
                json_error("invalid_json"),
            )
            return

        validated_payload, errors = validate_request_payload(payload)
        if validated_payload is None:
            self._send_json(
                HTTPStatus.BAD_REQUEST,
                json_error("invalid_request", errors),
            )
            return

        try:
            candidate = call_gemini(validated_payload)
            normalized = normalize_response(candidate, validated_payload)
        except Exception as exc:  # noqa: BLE001
            LOGGER.exception("Gemini call failed, falling back to safe response: %s", exc)
            normalized = fallback_response(validated_payload)

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
