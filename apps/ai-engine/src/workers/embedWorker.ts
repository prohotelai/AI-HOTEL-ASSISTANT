import fs from "node:fs";
import path from "node:path";
import pdf from "pdf-parse";
import mammoth from "mammoth";
import { embeddingQueue, createWorker } from "./jobQueue";
import { chunkText } from "../lib/tokenizer";
import { embed } from "../lib/openai";
import { upsertVectors } from "../lib/pinecone";
import { v4 as uuid } from "uuid";

export interface EmbedJob {
  hotelId: string;
  filePath: string;
  docId?: string;
  source?: string;
}

const extractText = async (filePath: string): Promise<string> => {
  const buffer = await fs.promises.readFile(filePath);
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".pdf") {
    const data = await pdf(buffer);
    return data.text;
  }
  if (ext === ".docx") {
    const { value } = await mammoth.extractRawText({ buffer });
    return value;
  }
  return buffer.toString("utf8");
};

const processJob = async (data: EmbedJob) => {
  const text = await extractText(data.filePath);
  const chunks = chunkText(text, Number(process.env.MAX_EMBEDDING_CHUNK_TOKENS) || 800, 80);
  const vectors = [];
  for (const chunk of chunks) {
    const values = await embed(chunk.text);
    vectors.push({
      id: `${data.docId || uuid()}-${chunk.index}`,
      values,
      metadata: {
        hotelId: data.hotelId,
        docId: data.docId,
        chunkIndex: chunk.index,
        source: data.source,
        text: chunk.text
      }
    });
  }
  await upsertVectors(vectors, data.hotelId);
  return { upserted: vectors.length };
};

export const startEmbedWorker = () => {
  const { worker } = createWorker<EmbedJob>("embeddings", processJob);
  return worker;
};

if (process.env.START_WORKER === "true") {
  startEmbedWorker();
}

export const enqueueEmbeddingJob = async (job: EmbedJob) => {
  await embeddingQueue.add("embed", job, { removeOnComplete: true });
};
