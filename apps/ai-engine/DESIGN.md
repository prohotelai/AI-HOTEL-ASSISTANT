# AI Engine Design

## Overview
- Fastify server exposing agent, audio, TTS, and ingestion endpoints.
- RAG pipeline uses chunking + embeddings + Pinecone.
- Tools registry with stub implementations for hotel workflows.
- Voice pipeline uses OpenAI Whisper/TTS adapters with caching.
- Workers run BullMQ queues for embeddings and long tasks.

## RAG Flow
1. User message -> embed -> query Pinecone (namespace = hotelId).
2. Retrieved chunks + short-term memory -> prompt -> chat completion.
3. Tool calls parsed and executed via registry; responses returned.

## Workers
- `embeddings` queue consumes file uploads, extracts text, chunks, embeds, and upserts vectors.
- TTS queue placeholder for async synthesis.

## Security
- JWT-protected endpoints via `Authorization: Bearer`.
- Rate limiting via Fastify plugin.
- No keys stored in code; all via env.

## Observability
- Pino structured logs.
- Metrics endpoint stub; OpenTelemetry/Sentry hooks can wrap logger.

## TODO / Decision Points
- Pinecone namespace per tenant vs metadata filter performance.
- Embedding model: `text-embedding-3-small` vs larger models.
- Long-term memory storage: Pinecone vs relational DB.
- Streaming transport: WebRTC vs WebSocket (currently WS).
- Audio storage: S3 + presigned URLs vs transient local cache.
