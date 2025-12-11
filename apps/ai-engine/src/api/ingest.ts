import { FastifyInstance } from "fastify";
import { ensureAuth } from "../lib/auth";
import { enqueueEmbeddingJob } from "../workers/embedWorker";
import fs from "node:fs";
import path from "node:path";
import { v4 as uuid } from "uuid";

const uploadDir = path.join(process.cwd(), "uploads");

const ensureUploadDir = async () => {
  await fs.promises.mkdir(uploadDir, { recursive: true });
};

export const registerIngestRoutes = (server: FastifyInstance) => {
  server.post("/api/ingest/file", async (request, reply) => {
    const authed = await ensureAuth(request, reply);
    if (!authed) return;
    const file = await request.file();
    if (!file) {
      reply.code(400).send({ message: "file required" });
      return;
    }
    await ensureUploadDir();
    const id = uuid();
    const filename = `${id}-${file.filename}`;
    const target = path.join(uploadDir, filename);
    const buffer = await file.toBuffer();
    await fs.promises.writeFile(target, buffer);
    await enqueueEmbeddingJob({
      hotelId: (request.headers["x-hotel-id"] as string) || "default",
      filePath: target,
      docId: id,
      source: file.filename
    });
    reply.send({ status: "queued", docId: id });
  });
};
