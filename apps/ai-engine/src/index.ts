import Fastify from "fastify";
import multipart from "@fastify/multipart";
import websocket from "@fastify/websocket";
import rateLimit from "@fastify/rate-limit";
import { registerAgentRoutes } from "./api/agent";
import { registerAudioRoutes } from "./api/audio";
import { registerTtsRoutes } from "./api/tts";
import { registerIngestRoutes } from "./api/ingest";
import { registerVoiceStreamRoutes } from "./api/voiceStream";
export const buildServer = () => {
  const server = Fastify({
    logger: true
  });

  server.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute"
  });

  server.register(multipart);
  server.register(websocket);

  registerAgentRoutes(server);
  registerAudioRoutes(server);
  registerTtsRoutes(server);
  registerIngestRoutes(server);
  registerVoiceStreamRoutes(server);

  server.get("/health", async () => ({ status: "ok" }));

  server.get("/metrics", async () => {
    return {
      uptime: process.uptime()
    };
  });

  return server;
};

if (process.env.NODE_ENV !== "test") {
  const port = process.env.PORT ? Number(process.env.PORT) : 3001;
  buildServer()
    .listen({ port, host: "0.0.0.0" })
    .then((address) => {
      console.log(`AI Engine listening at ${address}`);
    })
    .catch((err) => {
      console.error("Failed to start server", err);
      process.exit(1);
    });
}
