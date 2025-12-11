# AI Engine

Backend microservice powering conversational AI, RAG, tooling, and voice adapters for the AI Hotel Assistant.

## Endpoints
- `POST /api/agent/message` — send text to the agent (requires `Authorization: Bearer <jwt>` and hotel headers)
- `POST /api/agent/audio` — upload audio for STT + agent response
- `POST /api/agent/tts` — synthesize speech with caching
- `POST /api/ingest/file` — ingest a document into the RAG pipeline
- `GET /ws/voice` — WebSocket endpoint for low-latency audio -> STT -> agent -> TTS
- `GET /health` — liveness
- `GET /metrics` — basic metrics

## Environment
See root `.env.example`.

## Run
```bash
cd apps/ai-engine
npm install
npm run dev
```

## Decision Points (TODO)
- Pinecone namespace per tenant vs metadata filter tradeoffs.
- Embedding model selection (cost vs quality).
- Long-term memory storage location (Pinecone vs DB).
- Real-time streaming tech choice (WebRTC vs WebSocket).
- Audio blob storage strategy (S3 vs streaming-only).
