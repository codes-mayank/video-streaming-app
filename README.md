# Umtube — Video Streaming Platform

A microservices-based video streaming application inspired by YouTube. Users can sign up, upload videos, and watch adaptive HLS playback with multiple quality levels. The stack uses FastAPI backends, a Next.js frontend, Cloudflare R2 for object storage, and Kafka for async transcoding.

--

## Features

- **Authentication** — Email/password signup & login, Google OAuth, JWT via HttpOnly cookies
- **Video upload** — Presigned direct-to-storage uploads or same-origin server upload
- **Adaptive streaming** — FFmpeg transcodes uploads into multi-resolution HLS (1080p / 720p / 480p)
- **Chunked playback** — Video.js player streams HLS segments proxied through the video-service
- **Profile management** — Avatar upload to object storage, profile editing
- **Modern UI** — Next.js app with glassmorphism layout, responsive video grid

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Browser (Next.js :3000)                      │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   API Gateway (nginx :8090)                      │
│   /users/*  →  auth-service (:8000)                              │
│   /videos/* →  video-service (:8001)                             │
└────────────┬───────────────────────────────┬────────────────────┘
             ▼                               ▼
┌────────────────────────┐    ┌──────────────────────────────────┐
│   auth-service         │    │   video-service                   │
│   PostgreSQL           │    │   PostgreSQL                      │
│   JWT cookies          │    │   R2/S3 uploads & HLS proxy       │
└────────────────────────┘    └──────────────┬───────────────────┘
                                             │ Kafka
                                             ▼
                              ┌──────────────────────────────────┐
                              │   transcoding-service (worker)    │
                              │   FFmpeg → HLS segments → R2      │
                              └──────────────────────────────────┘
```

| Service | Port | Description |
|---------|------|-------------|
| **frontend** | 3000 | Next.js web app |
| **api-gateway** | 8090 | nginx reverse proxy |
| **auth-service** | 8000 | User auth & profiles |
| **video-service** | 8001 | Video metadata, upload, playback |
| **transcoding-service** | — | Kafka consumer, FFmpeg worker |
| **Kafka** (KRaft) | 9092 | Transcode job queue |
| **PostgreSQL** | 5432 | Shared database |

---

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| Frontend | Next.js 16, React 19, Tailwind CSS 4, Video.js |
| Backend | FastAPI, SQLAlchemy, Pydantic |
| Storage | Cloudflare R2 (S3-compatible) |
| Messaging | Apache Kafka (KRaft, no Zookeeper) |
| Transcoding | FFmpeg, HLS |
| Gateway | nginx (Docker) |
| Database | PostgreSQL |

---

## Project Structure

```
video-streaming-app/
├── frontend/              # Next.js web application
├── auth-service/          # Authentication & user profiles
├── video-service/         # Video CRUD, upload, HLS playback proxy
├── transcoding-service/   # Kafka worker — FFmpeg HLS transcoding
├── api-gateway/           # nginx reverse proxy (Docker)
├── kafka/                 # Kafka KRaft stack (Docker)
├── scripts/               # Setup utilities
└── design.md              # Full product & API specification
```

---

## Prerequisites

- **macOS** (setup script targets Homebrew; other platforms work with manual setup)
- [Homebrew](https://brew.sh)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Node.js](https://nodejs.org/) 18+
- [Python](https://www.python.org/) 3.12
- [FFmpeg](https://ffmpeg.org/)
- [PostgreSQL](https://www.postgresql.org/)
- Cloudflare R2 bucket (or any S3-compatible storage)

---

## Getting Started

### 1. Clone and install dependencies

```bash
git clone <repository-url>
cd video-streaming-app
chmod +x scripts/setup-mac.sh
./scripts/setup-mac.sh
```

This installs Python virtualenvs for all backend services and `npm` dependencies for the frontend.

### 2. Configure environment variables

Copy example env files and fill in your credentials:

**auth-service/.env**
```env
DATABASE_URL=postgresql+psycopg2://<user>:<password>@localhost/video_stream_app
GOOGLE_CLIENT_ID=<your-google-oauth-client-id>
```

**video-service/.env**
```env
DATABASE_URL=postgresql+psycopg2://<user>:<password>@localhost/video_stream_app
AWS_ACCESS_KEY_ID=<r2-access-key>
AWS_SECRET_ACCESS_KEY=<r2-secret-key>
AWS_ENDPOINT_URL=https://<account-id>.r2.cloudflarestorage.com
AWS_BUCKET_NAME=videos
KAFKA_BOOTSTRAP_SERVERS=localhost:9092
KAFKA_VIDEO_TOPIC=video-transcode-jobs
```

**transcoding-service/.env**
```env
AWS_ACCESS_KEY_ID=<r2-access-key>
AWS_SECRET_ACCESS_KEY=<r2-secret-key>
AWS_ENDPOINT_URL=https://<account-id>.r2.cloudflarestorage.com
AWS_BUCKET_NAME=videos
KAFKA_BOOTSTRAP_SERVERS=localhost:9092
KAFKA_VIDEO_TOPIC=video-transcode-jobs
VIDEO_SERVICE_BASE_URL=http://127.0.0.1:8001
```

**frontend/.env.local**
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8090
```

### 3. Create the database

```bash
createdb video_stream_app
```

Both auth-service and video-service create their tables automatically on startup.

### 4. Start infrastructure (Docker)

```bash
# API gateway
cd api-gateway && docker compose up -d

# Kafka (KRaft — no Zookeeper)
cd kafka && docker compose up -d
```

Verify Kafka topic:
```bash
docker exec kafka /opt/kafka/bin/kafka-topics.sh \
  --bootstrap-server localhost:29092 --list
# → video-transcode-jobs
```

### 5. Start application services

Open separate terminals for each service:

```bash
# Auth service
cd auth-service && source .venv/bin/activate
uvicorn main:app --reload --port 8000

# Video service
cd video-service && source .venv/bin/activate
uvicorn main:app --reload --port 8001

# Transcoding worker
cd transcoding-service && source .venv/bin/activate
python worker.py

# Frontend
cd frontend && npm run dev
```

### 6. Open the app

| URL | Description |
|-----|-------------|
| http://localhost:3000 | Web application |
| http://localhost:8090/users/docs | Auth API (Swagger) |
| http://localhost:8001/docs | Video API (Swagger, direct) |

---

## Video Pipeline

```
Upload → Complete → Kafka job → FFmpeg transcode → HLS to R2 → Ready for playback
```

1. **Initiate upload** — `POST /videos/upload/initiate` returns a presigned R2 URL
2. **Upload file** — Client PUTs to R2, or `POST /videos/{id}/upload` via server
3. **Complete upload** — `POST /videos/{id}/complete` verifies the object and publishes a Kafka job
4. **Transcode** — Worker downloads source, produces 1080p/720p/480p HLS, uploads to R2
5. **Playback** — Player loads `GET /videos/{id}/hls/master.m3u8`; service proxies playlists and `.ts` chunks from R2

Object storage layout:
```
users/{user_id}/{timestamp}_{name}/
  raw/{name}.mp4
  1080p/{name}.m3u8, {name}_000.ts, …
  720p/…
  480p/…
  master.m3u8
```

---

## API Overview

All frontend requests go through the gateway at `http://localhost:8090`.

### Auth (`/users/auth/…`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/users/auth/signup` | Register |
| POST | `/users/auth/login` | Login |
| POST | `/users/auth/google/login` | Google OAuth |
| GET | `/users/auth/me` | Current user |
| POST | `/users/auth/logout` | Logout |

### Videos (`/videos/…`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/videos` | List videos |
| GET | `/videos/{id}` | Video metadata |
| POST | `/videos/upload/initiate` | Start upload |
| POST | `/videos/{id}/complete` | Finalize & queue transcode |
| GET | `/videos/{id}/hls/master.m3u8` | HLS master playlist |
| GET | `/videos/{id}/hls/object?key=…` | HLS segment proxy |
| GET | `/videos/{id}/file` | Raw file fallback |

See [design.md](./design.md) for the full API specification and UI wireframes.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `NoBrokersAvailable` in transcoding worker | Start Kafka: `cd kafka && docker compose up -d` |
| Auth/video service won't start | Check PostgreSQL is running and `DATABASE_URL` credentials are correct |
| Video list fetch fails (CORS / 301) | Recreate gateway: `cd api-gateway && docker compose up -d --force-recreate`, then hard-refresh browser |
| HLS playback 404 | Ensure transcoding finished (`status: ready`) and objects exist in R2 |
| Signup returns 500 | bcrypt/passlib version conflict — use `bcrypt` directly (already fixed in auth-service) |

---

## License

This project is for educational and portfolio purposes.
