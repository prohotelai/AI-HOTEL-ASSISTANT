import { FastifyInstance } from "fastify";
import { ensureAuth } from "../lib/auth";
import { textToSpeech } from "../lib/openai";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const cachePath = process.env.TTS_CACHE_PATH || ".tts-cache";

const ensureCacheDir = async () => {
  await fs.promises.mkdir(cachePath, { recursive: true });
};

export const registerTtsRoutes = (server: FastifyInstance) => {
  server.post("/api/agent/tts", async (request, reply) => {
    const authed = await ensureAuth(request, reply);
    if (!authed) return;
    const body = request.body as { text?: string; voice?: string; format?: string; hotelId?: string };
    if (!body?.text) {
      reply.code(400).send({ message: "text is required" });
      return;
    }
    await ensureCacheDir();
    const hash = crypto.createHash("sha256").update(body.text + (body.voice || "")).digest("hex");
    const target = path.join(cachePath, `${hash}.${body.format || "mp3"}`);
    if (fs.existsSync(target)) {
      const cached = await fs.promises.readFile(target);
      reply.header("content-type", "audio/mpeg").send(cached);
      return;
    }
    const audio = await textToSpeech(body.text, body.voice || "alloy");
    await fs.promises.writeFile(target, audio);
    reply.header("content-type", "audio/mpeg").send(audio);
  });
};
