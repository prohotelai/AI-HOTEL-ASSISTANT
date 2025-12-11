import { FastifyInstance } from "fastify";
import { speechToText, textToSpeech } from "../lib/openai";
import { orchestrateAgentMessage } from "../lib/rag";

export const registerVoiceStreamRoutes = (server: FastifyInstance) => {
  server.get("/ws/voice", { websocket: true }, (connection, request) => {
    if (!request.headers.authorization) {
      connection.socket.close();
      return;
    }
    connection.socket.on("message", async (raw: unknown) => {
      const payload =
        typeof raw === "string" ? raw : Buffer.isBuffer(raw) ? raw.toString("utf8") : JSON.stringify(raw);
      const { type, data } = JSON.parse(payload);
      if (type === "audio_chunk") {
        const buffer = Buffer.from(data.chunk, "base64");
        const transcript = await speechToText(buffer, data.mimetype || "audio/wav");
        connection.socket.send(JSON.stringify({ event: "transcript_partial", data: transcript }));
        const response = await orchestrateAgentMessage({
          hotelId: data.hotelId || "default",
          userId: data.userId || "anonymous",
          message: transcript.text
        });
        connection.socket.send(JSON.stringify({ event: "agent_response", data: response }));
        const tts = await textToSpeech(response.reply, data.voice || "alloy");
        connection.socket.send(JSON.stringify({ event: "tts_chunk", data: tts.toString("base64") }));
      }
    });
  });
};
