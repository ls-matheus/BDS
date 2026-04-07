import json
import os
import threading
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib import error, request

HOST = "127.0.0.1"
PORT = 8000
GEMINI_API_KEY_ENV = "GEMINI_API_KEY"
DEFAULT_GEMINI_MODELS = ("gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash")
MAX_HISTORY_MESSAGES = 24
SYSTEM_INSTRUCTION = (
    "Voce e o atendente virtual oficial da concessionaria AUTOCAR. "
    "Fale sempre em portugues do Brasil, com tom profissional, objetivo e cordial. "
    "Seu foco e atendimento comercial e consultivo de concessionaria: "
    "carros, versoes, cambio manual/automatico/hibrido, compra, financiamento, servicos, "
    "acessorios, sistemas, monitoramento de IA automotiva, manutencao e pecas com problema. "
    "Responda de forma clara e direta, sem enrolacao. "
    "Quando faltar contexto, faca 1 pergunta curta para avancar o atendimento. "
    "Nao invente dados tecnicos ou precos exatos se nao foram informados."
)


def load_local_env() -> None:
    env_path = ".env"
    if not os.path.exists(env_path):
        return

    with open(env_path, "r", encoding="utf-8") as env_file:
        for raw_line in env_file:
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue

            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip()
            if key and key not in os.environ:
                os.environ[key] = value


load_local_env()
GEMINI_MODEL = (os.getenv("GEMINI_MODEL") or "").strip()
ACTIVE_GEMINI_MODEL = None
CHAT_SESSIONS = {}
CHAT_SESSIONS_LOCK = threading.Lock()


def build_model_candidates() -> list[str]:
    candidates: list[str] = []

    if ACTIVE_GEMINI_MODEL and ACTIVE_GEMINI_MODEL not in candidates:
        candidates.append(ACTIVE_GEMINI_MODEL)

    if GEMINI_MODEL and GEMINI_MODEL not in candidates:
        candidates.append(GEMINI_MODEL)

    for model in DEFAULT_GEMINI_MODELS:
        if model not in candidates:
            candidates.append(model)

    return candidates


def discover_model_candidates(api_key: str) -> list[str]:
    endpoint = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"
    req = request.Request(endpoint, method="GET")

    try:
        with request.urlopen(req, timeout=15) as response:
            raw = response.read().decode("utf-8")
    except Exception:
        return []

    data = json.loads(raw)
    discovered: list[str] = []

    for model in data.get("models", []):
        model_name = str(model.get("name", "")).strip()
        if model_name.startswith("models/"):
            model_name = model_name.split("/", 1)[1]
        if not model_name.startswith("gemini"):
            continue

        methods = model.get("supportedGenerationMethods") or []
        if methods and "generateContent" not in methods:
            continue

        discovered.append(model_name)

    discovered = list(dict.fromkeys(discovered))
    discovered.sort(key=lambda name: (0 if "flash" in name else 1, 0 if "2.5" in name else 1, name))
    return discovered


def resolve_session_id(payload: dict, client_address: str) -> str:
    raw_session_id = str(payload.get("sessionId") or "").strip()
    if raw_session_id:
        return raw_session_id
    if client_address:
        return f"remote-{client_address}"
    return "remote-unknown"


def get_session_history(session_id: str) -> list[dict]:
    with CHAT_SESSIONS_LOCK:
        history = CHAT_SESSIONS.get(session_id) or []
        return [dict(item) for item in history]


def set_session_history(session_id: str, history: list[dict]) -> None:
    normalized = history[-MAX_HISTORY_MESSAGES:]
    with CHAT_SESSIONS_LOCK:
        CHAT_SESSIONS[session_id] = normalized


def generate_reply_with_model(message: str, api_key: str, model_name: str, history: list[dict]) -> str:
    endpoint = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{model_name}:generateContent?key={api_key}"
    )

    contents = []
    for item in history:
        role = str(item.get("role") or "").strip()
        text = str(item.get("text") or "").strip()
        if not role or not text:
            continue
        contents.append({"role": role, "parts": [{"text": text}]})
    contents.append({"role": "user", "parts": [{"text": message}]})

    payload = {
        "systemInstruction": {"parts": [{"text": SYSTEM_INSTRUCTION}]},
        "contents": contents,
        "generationConfig": {
            "temperature": 0.7,
            "maxOutputTokens": 350,
        },
    }

    req = request.Request(
        endpoint,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with request.urlopen(req, timeout=25) as response:
            raw = response.read().decode("utf-8")
    except error.HTTPError as exc:
        details = exc.read().decode("utf-8", errors="ignore")
        if exc.code == 404:
            raise FileNotFoundError(f"Model not found: {model_name}") from exc
        raise RuntimeError(f"Gemini API error {exc.code}: {details}") from exc
    except error.URLError as exc:
        raise RuntimeError(f"Gemini connection error: {exc.reason}") from exc

    data = json.loads(raw)
    candidates = data.get("candidates") or []
    if not candidates:
        return "Nao consegui gerar resposta no momento."

    parts = candidates[0].get("content", {}).get("parts", [])
    text_chunks = [part.get("text", "") for part in parts if part.get("text")]
    if not text_chunks:
        return "Nao consegui gerar resposta no momento."

    return "\n".join(text_chunks).strip()


def generate_reply(message: str, session_id: str) -> str:
    global ACTIVE_GEMINI_MODEL

    api_key = os.getenv(GEMINI_API_KEY_ENV)
    if not api_key:
        raise RuntimeError(f"Missing {GEMINI_API_KEY_ENV} environment variable")

    history = get_session_history(session_id)
    model_candidates = build_model_candidates()
    fallback_candidates = discover_model_candidates(api_key)

    for model_name in fallback_candidates:
        if model_name not in model_candidates:
            model_candidates.append(model_name)

    any_model_not_found = False
    last_runtime_error: RuntimeError | None = None

    for model_name in model_candidates:
        try:
            reply = generate_reply_with_model(message, api_key, model_name, history)
            ACTIVE_GEMINI_MODEL = model_name
            updated_history = history + [
                {"role": "user", "text": message},
                {"role": "model", "text": reply},
            ]
            set_session_history(session_id, updated_history)
            return reply
        except FileNotFoundError:
            any_model_not_found = True
            continue
        except RuntimeError as exc:
            last_runtime_error = exc
            break

    if last_runtime_error:
        raise last_runtime_error

    if any_model_not_found:
        raise RuntimeError(
            "Nenhum modelo Gemini compativel foi encontrado para essa chave. "
            "Defina GEMINI_MODEL em .env (ex: gemini-2.5-flash)."
        )

    raise RuntimeError("Nao foi possivel gerar resposta no momento.")


class SiteHandler(SimpleHTTPRequestHandler):
    def _send_json(self, payload: dict, status: int = HTTPStatus.OK) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self) -> None:
        self.send_response(HTTPStatus.NO_CONTENT)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_POST(self) -> None:
        if self.path != "/api/chat":
            self._send_json({"error": "Not found"}, status=HTTPStatus.NOT_FOUND)
            return

        content_length = int(self.headers.get("Content-Length", "0"))
        if content_length <= 0:
            self._send_json({"error": "Missing request body"}, status=HTTPStatus.BAD_REQUEST)
            return

        body = self.rfile.read(content_length).decode("utf-8", errors="ignore")
        try:
            payload = json.loads(body)
        except json.JSONDecodeError:
            self._send_json({"error": "Invalid JSON"}, status=HTTPStatus.BAD_REQUEST)
            return

        message = (payload.get("message") or "").strip()
        if not message:
            self._send_json({"error": "Message is required"}, status=HTTPStatus.BAD_REQUEST)
            return

        client_address = ""
        if self.client_address and len(self.client_address) > 0:
            client_address = str(self.client_address[0])
        session_id = resolve_session_id(payload, client_address)

        try:
            reply = generate_reply(message, session_id)
            self._send_json({"reply": reply})
        except RuntimeError as exc:
            self._send_json({"error": str(exc)}, status=HTTPStatus.BAD_GATEWAY)


def main() -> None:
    with ThreadingHTTPServer((HOST, PORT), SiteHandler) as server:
        print(f"Server running at http://{HOST}:{PORT}")
        server.serve_forever()


if __name__ == "__main__":
    main()
