# Server

Backend Python minim de la Fase 1 del `web-agent` text-first.

## Scope actual

- `POST /api/web-agent`
- `GET /health`
- contracte JSON explicit amb el client
- crida a Gemini text via REST

## Prerequisits

- Python 3.11+
- `GOOGLE_API_KEY`

## Run local

```bash
cp .env.example .env
python3 app.py
```

També pots fer:

```bash
uv run app.py
```
