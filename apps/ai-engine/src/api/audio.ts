import { FastifyInstance } from "fastify";
import { ensureAuth } from "../lib/auth";
import { speechToText } from "../lib/openai";
import { orchestrateAgentMessage } from "../lib/rag";

export const registerAudioRoutes = (server: FastifyInstance) => {
  server.post("/api/agent/audio", async (request, reply) => {
    const authed = await ensureAuth(request, reply);
    if (!authed) return;
    const data = await request.file();
    if (!data) {
      reply.code(400).send({ message: "File is required" });
      return;
    }
    const buffer = await data.toBuffer();
    const transcript = await speechToText(buffer, data.mimetype);
    const payload = {
      hotelId: request.headers["x-hotel-id"] as string,
      userId: request.headers["x-user-id"] as string,
      message: transcript.text,
      sessionId: request.headers["x-session-id"] as string
    };
    const response = await orchestrateAgentMessage(payload);
    reply.send({ transcript, response });
  });
};
