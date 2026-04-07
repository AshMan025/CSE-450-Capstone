# ExamAI Eval (Capstone)

Microservice-based exam evaluation platform with:
- teacher/student authentication
- course + assignment management
- submission uploads
- LLM-powered evaluation
- mark publishing workflow

## Architecture Overview

- Frontend: React app served on `http://localhost:3000`
- Gateway: Nginx reverse proxy on `http://localhost:8000`
- Backend: FastAPI microservices (auth, course, assignment, file, llm, marks, notification)
- Databases: one PostgreSQL instance per microservice

Requests flow:
`Frontend -> /api/* -> Nginx Gateway -> Target FastAPI Service -> Service DB`

## Tech Stack

### Frontend
- React 19 + TypeScript
- Vite
- React Router
- Axios
- Lucide icons
- KaTeX + Markdown rendering (evaluation view)

### Backend
- Python 3.11
- FastAPI + Uvicorn
- SQLAlchemy + PostgreSQL
- JWT auth (`python-jose`)
- Provider SDKs/APIs for LLM service:
  - OpenAI
  - Google Gemini
  - Anthropic
  - plus key-test support for Mistral/Cohere

### Infra
- Docker + Docker Compose
- Nginx API gateway
- Shared Docker volume for uploaded files

## Services and Ports

Internal container ports (routed through gateway):
- `auth-service` -> `8001`
- `course-service` -> `8002`
- `assignment-service` -> `8003`
- `file-service` -> `8004`
- `llm-service` -> `8005`
- `marks-service` -> `8006`
- `notification-service` -> `8007`

Host ports:
- Frontend: `3000`
- Gateway: `8000`

## Prerequisites

Minimum recommended:
- Git
- Docker Desktop (or Docker Engine + Compose plugin)

Optional (only if you want to run outside Docker):
- Node.js 20+
- npm 10+
- Python 3.11

## Setup and Run (Docker, Recommended)

### 1. Clone
```bash
git clone https://github.com/AshMan025/CSE-450-Capstone
cd CSE-450-Capstone
```

### 2. Configure environment files
Each backend service uses `services/<service-name>/.env`.

At minimum, verify these values:
- `DATABASE_URL`
- `SECRET_KEY` and `ALGORITHM`
- service-to-service URLs (where relevant)

For `llm-service`, also set provider keys:
- `GEMINI_API_KEY`
- `ANTHROPIC_API_KEY`
- `OPENAI_API_KEY` (if using OpenAI)
- `ENCRYPTION_KEY` (strongly recommended for stable API-key decryption across restarts)

You can generate a Fernet key for `ENCRYPTION_KEY` with:
```bash
python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

### 3. Start everything
Use either:
```bash
./docker-run.sh
```
or:
```bash
docker compose up --build -d
```

### 4. Access app
- Frontend UI: `http://localhost:3000`
- API Gateway: `http://localhost:8000`

## Useful Commands

Start:
```bash
docker compose up --build -d
```

Stop:
```bash
docker compose down
```

Rebuild one service:
```bash
docker compose up -d --build llm-service
```

Restart one service:
```bash
docker compose restart llm-service
```

View logs:
```bash
docker compose logs -f
docker compose logs -f llm-service
```

## API Base Paths (via Gateway)

- `/api/auth/*`
- `/api/courses/*`
- `/api/assignments/*`
- `/api/files/*`
- `/api/llm/*`
- `/api/marks/*`
- `/api/notifications/*`

## First Run Checklist

1. Start stack with Docker.
2. Open `http://localhost:3000`.
3. Register a teacher and a student user.
4. As teacher: create course + assignment.
5. As student: submit file.
6. As teacher: configure LLM API key(s), test key, run evaluation.

## Troubleshooting

- **Frontend works, API calls fail**:
  - check gateway/container health:
  ```bash
  docker compose ps
  docker compose logs -f gateway
  ```

- **LLM key test/evaluation mismatch**:
  - ensure `llm-service` is restarted after env/code changes:
  ```bash
  docker compose restart llm-service
  ```
  - check provider quota/billing limits.

- **Saved API keys become unreadable after restart**:
  - set a fixed `ENCRYPTION_KEY` in `services/llm-service/.env` and avoid changing it.

- **Port already in use**:
  - free `3000` or `8000`, or change mapped ports in `docker-compose.yml`.

## Security Notes

- Do not commit real API keys/secrets.
- Keep all `.env` files local/private.
- Rotate leaked keys immediately if exposed.
