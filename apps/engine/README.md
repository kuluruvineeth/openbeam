# Engine

Document processing service using FastAPI and Unstructured.

## Setup

```bash
cd apps/engine
uv sync
```

## Run

```bash
uv run uvicorn engine.main:app --reload
```

## Development

```bash
# Lint
uv run ruff check .

# Format
uv run ruff format .

# Type check
uv run mypy src

# Test
uv run pytest
```

## VS Code

Install extensions:

- `charliermarsh.ruff` - Ruff linting and formatting
- `tamasfe.even-better-toml` - TOML support

Add to `.vscode/settings.json`:

```json
{
  "[python]": {
    "editor.formatOnSave": true,
    "editor.codeActionsOnSave": {
      "source.fixAll": "explicit",
      "source.organizeImports": "explicit"
    },
    "editor.defaultFormatter": "charliermarsh.ruff"
  }
}
```

## Docker

```bash
docker build -t openplane-engine .
docker run -p 8000:8000 openplane-engine
```
