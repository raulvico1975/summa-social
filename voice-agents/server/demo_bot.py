"""Live demo-agent backend for the isolated Summa voice-agents pilot."""

from __future__ import annotations

import asyncio
import json
import logging
import os
import time
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any
from urllib import error, request

from aiohttp import WSMsgType, web

LOGGER = logging.getLogger("summa.demo_agent")

DEMO_HOST = "127.0.0.1"
DEMO_PORT = 8790
DEFAULT_MODEL = os.getenv(
    "DEMO_AGENT_MODEL",
    "gemini-2.5-flash-native-audio-preview-12-2025",
)
DEFAULT_DAILY_API_URL = "https://api.daily.co/v1"

SYSTEM_PROMPT = """
Ets el demo-agent oral de Summa Social.

Missio:
- guiar una persona saturada i amb poc temps dins la plataforma
- parlar amb calma, paciencia i frases curtes
- entendre la pantalla actual a partir del context estructurat rebut pel sistema
- ajudar a trobar el boto o la pantalla correcta sense llegir la UI sencera

To:
- empatic
- calmat
- directe
- concis

Regles:
- no llegeixis pantalles senceres
- resumeix en una sola frase el context visible abans de guiar
- si la pregunta es fiscal o legalment complexa, respon: "Soc una guia de la plataforma, no un assessor fiscal. Et recomano consultar aixo amb el teu gestor."
- espera que l'usuari parli, excepte si reps un context de pantalla amb estat d'error
- si hi ha `error` al context de la UI, pots intervenir suaument per oferir ajuda
- no inventis funcionalitats que no siguin visibles o aportades pel context
- quan usis una tool, acompanya-la amb una frase natural i curta

Tools:
- `highlight_element(element_ai_id)`: destaca visualment un element concret de la pantalla
- `Maps_to(route_path)`: navega a una altra pantalla dins la demo
""".strip()

try:
    from pipecat.adapters.schemas.function_schema import FunctionSchema
    from pipecat.adapters.schemas.tools_schema import ToolsSchema
    from pipecat.frames.frames import FunctionCallResultProperties, LLMRunFrame
    from pipecat.pipeline.pipeline import Pipeline
    from pipecat.pipeline.runner import PipelineRunner
    from pipecat.pipeline.task import PipelineParams, PipelineTask
    from pipecat.processors.aggregators.llm_context import LLMContext
    from pipecat.processors.aggregators.llm_response_universal import (
        LLMContextAggregatorPair,
    )
    from pipecat.services.google.gemini_live.llm import GeminiLiveLLMService
    from pipecat.services.llm_service import FunctionCallParams
    from pipecat.transports.daily.transport import DailyParams, DailyTransport

    PIPECAT_IMPORT_ERROR: Exception | None = None
except Exception as exc:  # noqa: BLE001
    PIPECAT_IMPORT_ERROR = exc


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


def json_response(payload: dict[str, Any], status: int = 200) -> web.Response:
    return web.json_response(payload, status=status)


def require_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"{name} is required.")
    return value


def create_room(api_key: str) -> dict[str, Any]:
    expires_at = int(time.time()) + 3600
    payload = {
        "properties": {
            "exp": expires_at,
            "enable_chat": True,
            "start_audio_off": False,
            "start_video_off": True,
        }
    }
    return daily_request(api_key, "/rooms", payload)


def create_meeting_token(api_key: str, room_name: str, user_name: str) -> str:
    payload = {
        "properties": {
            "room_name": room_name,
            "user_name": user_name,
        }
    }
    response = daily_request(api_key, "/meeting-tokens", payload)
    token = response.get("token")
    if not isinstance(token, str) or not token:
        raise RuntimeError("Daily did not return a token.")
    return token


def daily_request(api_key: str, path: str, payload: dict[str, Any]) -> dict[str, Any]:
    endpoint = f"{DEFAULT_DAILY_API_URL}{path}"
    http_request = request.Request(
        endpoint,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with request.urlopen(http_request, timeout=30) as response:
            return json.loads(response.read().decode("utf-8"))
    except error.HTTPError as exc:
        details = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Daily HTTP {exc.code}: {details}") from exc
    except error.URLError as exc:
        raise RuntimeError(f"Daily connection failed: {exc.reason}") from exc


def build_ui_context_message(snapshot: dict[str, Any]) -> str:
    route = snapshot.get("currentRoute") or "sense ruta"
    view = snapshot.get("currentView") or "sense vista"
    state = snapshot.get("currentState") or "sense estat"
    actions = snapshot.get("visibleActions") or []
    summary = snapshot.get("summary") or ""
    return (
        "[UI_CONTEXT] "
        f"ruta={route}; vista={view}; estat={state}; "
        f"accions={', '.join(actions) if isinstance(actions, list) else ''}; "
        f"resum={summary}"
    )


@dataclass
class DemoSession:
    session_id: str
    room_url: str
    browser_token: str
    bot_token: str
    websocket_url: str
    latest_ui_context: dict[str, Any] | None = None
    last_ui_context_signature: str | None = None
    last_error_signature: str | None = None
    task: Any | None = None
    runner_task: asyncio.Task[Any] | None = None
    runner: Any | None = None
    transport: Any | None = None
    llm_context: Any | None = None
    websocket_clients: set[web.WebSocketResponse] = field(default_factory=set)

    async def start(self) -> None:
        if PIPECAT_IMPORT_ERROR is not None:
            raise RuntimeError(
                "Pipecat Live dependencies are not available locally."
            ) from PIPECAT_IMPORT_ERROR

        highlight_tool = FunctionSchema(
            name="highlight_element",
            description="Highlight a visible UI element so the user knows where to click.",
            properties={
                "element_ai_id": {
                    "type": "string",
                    "description": "Exact data-ai-action identifier to highlight.",
                }
            },
            required=["element_ai_id"],
        )
        navigate_tool = FunctionSchema(
            name="Maps_to",
            description="Navigate the live demo to another route inside /live.",
            properties={
                "route_path": {
                    "type": "string",
                    "description": "Absolute route path inside the demo, for example /live?view=donants.",
                }
            },
            required=["route_path"],
        )
        tools = ToolsSchema(standard_tools=[highlight_tool, navigate_tool])

        self.transport = DailyTransport(
            self.room_url,
            self.bot_token,
            "Summa Demo Guide",
            DailyParams(
                audio_in_enabled=True,
                audio_out_enabled=True,
                video_in_enabled=False,
                microphone_out_enabled=True,
                camera_out_enabled=False,
                vad_enabled=True,
            ),
        )

        llm = GeminiLiveLLMService(
            api_key=require_env("GOOGLE_API_KEY"),
            settings=GeminiLiveLLMService.Settings(
                model=DEFAULT_MODEL,
                system_instruction=SYSTEM_PROMPT,
                voice="Charon",
                temperature=0.3,
            ),
            inference_on_context_initialization=False,
        )
        llm.register_function("highlight_element", self.handle_highlight_element)
        llm.register_function("Maps_to", self.handle_maps_to)

        self.llm_context = LLMContext(tools=tools)
        user_aggregator, assistant_aggregator = LLMContextAggregatorPair(self.llm_context)

        pipeline = Pipeline(
            [
                self.transport.input(),
                user_aggregator,
                llm,
                self.transport.output(),
                assistant_aggregator,
            ]
        )

        self.task = PipelineTask(
            pipeline,
            params=PipelineParams(
                allow_interruptions=True,
                enable_metrics=True,
                enable_usage_metrics=True,
            ),
        )

        @self.transport.event_handler("on_client_connected")
        async def on_client_connected(transport: Any, participant: dict[str, Any]) -> None:
            LOGGER.info("Demo client connected: %s", participant.get("id"))
            if self.latest_ui_context:
                self.push_ui_context_to_context(self.latest_ui_context)

        @self.transport.event_handler("on_client_disconnected")
        async def on_client_disconnected(transport: Any, participant: dict[str, Any]) -> None:
            LOGGER.info("Demo client disconnected: %s", participant.get("id"))
            await self.stop()

        self.runner = PipelineRunner(handle_sigint=False)
        self.runner_task = asyncio.create_task(self.runner.run(self.task))

    async def stop(self) -> None:
        if self.task is not None:
            await self.task.cancel()
            self.task = None
        if self.runner_task is not None:
            self.runner_task.cancel()
            self.runner_task = None

    async def attach_socket(self, ws: web.WebSocketResponse) -> None:
        self.websocket_clients.add(ws)

    async def detach_socket(self, ws: web.WebSocketResponse) -> None:
        self.websocket_clients.discard(ws)

    async def broadcast_tool(self, payload: dict[str, Any]) -> None:
        stale: list[web.WebSocketResponse] = []
        for ws in self.websocket_clients:
            if ws.closed:
                stale.append(ws)
                continue
            await ws.send_json(payload)
        for ws in stale:
            self.websocket_clients.discard(ws)

    async def handle_highlight_element(self, params: FunctionCallParams) -> None:
        element_ai_id = str(params.arguments.get("element_ai_id", "")).strip()
        if element_ai_id:
            await self.broadcast_tool(
                {
                    "type": "tool_event",
                    "tool": "highlight_element",
                    "payload": {"element_ai_id": element_ai_id},
                }
            )
        properties = FunctionCallResultProperties(run_llm=True)
        await params.result_callback(
            {
                "status": "ok",
                "highlighted": element_ai_id,
            },
            properties=properties,
        )

    async def handle_maps_to(self, params: FunctionCallParams) -> None:
        route_path = str(params.arguments.get("route_path", "")).strip()
        if route_path:
            await self.broadcast_tool(
                {
                    "type": "tool_event",
                    "tool": "Maps_to",
                    "payload": {"route_path": route_path},
                }
            )
        properties = FunctionCallResultProperties(run_llm=True)
        await params.result_callback(
            {
                "status": "ok",
                "navigated_to": route_path,
            },
            properties=properties,
        )

    def push_ui_context_to_context(self, snapshot: dict[str, Any]) -> None:
        if self.llm_context is None:
            return

        message = build_ui_context_message(snapshot)
        if hasattr(self.llm_context, "add_user_message"):
            self.llm_context.add_user_message(message)
            return
        if hasattr(self.llm_context, "messages"):
            self.llm_context.messages.append({"role": "user", "content": message})

    async def update_ui_context(self, snapshot: dict[str, Any]) -> None:
        signature = json.dumps(snapshot, sort_keys=True)
        if signature == self.last_ui_context_signature:
            return

        self.latest_ui_context = snapshot
        self.last_ui_context_signature = signature
        self.push_ui_context_to_context(snapshot)

        state = str(snapshot.get("currentState") or "")
        if "error" in state and signature != self.last_error_signature and self.task is not None:
            self.last_error_signature = signature
            await self.task.queue_frames([LLMRunFrame()])


SESSIONS: dict[str, DemoSession] = {}


async def health(request: web.Request) -> web.Response:
    return json_response(
        {
            "ok": True,
            "model": DEFAULT_MODEL,
            "pipecat_ready": PIPECAT_IMPORT_ERROR is None,
        }
    )


async def start(request: web.Request) -> web.Response:
    try:
        load_local_env()
        api_key = require_env("DAILY_API_KEY")
        room = create_room(api_key)
        room_name = room.get("name")
        room_url = room.get("url")
        if not isinstance(room_name, str) or not isinstance(room_url, str):
            raise RuntimeError("Daily did not return a valid room.")

        session_id = uuid.uuid4().hex
        browser_token = create_meeting_token(api_key, room_name, "Responsable economic")
        bot_token = create_meeting_token(api_key, room_name, "Summa Demo Guide")

        websocket_url = f"ws://{request.host}/ws/{session_id}"
        session = DemoSession(
            session_id=session_id,
            room_url=room_url,
            browser_token=browser_token,
            bot_token=bot_token,
            websocket_url=websocket_url,
        )
        await session.start()
        SESSIONS[session_id] = session

        return json_response(
            {
                "model": DEFAULT_MODEL,
                "room_url": room_url,
                "session_id": session_id,
                "token": browser_token,
                "websocket_url": websocket_url,
            }
        )
    except Exception as exc:  # noqa: BLE001
        LOGGER.exception("Failed to start demo session: %s", exc)
        return json_response({"error": str(exc)}, status=500)


async def websocket_handler(request: web.Request) -> web.StreamResponse:
    session_id = request.match_info["session_id"]
    session = SESSIONS.get(session_id)
    if session is None:
        return json_response({"error": "unknown_session"}, status=404)

    ws = web.WebSocketResponse(heartbeat=20)
    await ws.prepare(request)
    await session.attach_socket(ws)
    await ws.send_json({"type": "session_ready", "session_id": session_id})

    try:
        async for msg in ws:
            if msg.type == WSMsgType.TEXT:
                payload = json.loads(msg.data)
                if payload.get("type") == "ui_context":
                    context_payload = payload.get("payload")
                    if isinstance(context_payload, dict):
                        await session.update_ui_context(context_payload)
            elif msg.type == WSMsgType.ERROR:
                LOGGER.warning("WebSocket error: %s", ws.exception())
    finally:
        await session.detach_socket(ws)

    return ws


def create_app() -> web.Application:
    app = web.Application()
    app.add_routes(
        [
            web.get("/health", health),
            web.post("/start", start),
            web.get("/ws/{session_id}", websocket_handler),
        ]
    )
    return app


def main() -> None:
    load_local_env()
    host = os.getenv("DEMO_AGENT_HOST", DEMO_HOST)
    port = int(os.getenv("DEMO_AGENT_PORT", str(DEMO_PORT)))
    web.run_app(create_app(), host=host, port=port)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    main()
