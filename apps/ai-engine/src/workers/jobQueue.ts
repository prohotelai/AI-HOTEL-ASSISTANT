import { Queue, Worker, QueueEvents } from "bullmq";
import IORedis from "ioredis";

const isTest = process.env.NODE_ENV === "test";
const connectionString = process.env.REDIS_URL || "redis://localhost:6379";
const connection = isTest
  ? undefined
  : new IORedis(connectionString, {
      enableOfflineQueue: true
    });

const createStubQueue = () =>
  ({
    add: async () => ({ id: "mock" })
  } as unknown as Queue);

export const getRedisConnection = () => connection;

export const embeddingQueue = connection ? new Queue("embeddings", { connection }) : createStubQueue();
export const ttsQueue = connection ? new Queue("tts", { connection }) : createStubQueue();

export const createWorker = <T>(name: string, processor: (jobData: T) => Promise<unknown>) => {
  if (!connection) {
    return { worker: null as unknown as Worker<T>, events: null as unknown as QueueEvents };
  }
  const worker = new Worker<T>(name, async (job) => processor(job.data), {
    connection
  });
  const events = new QueueEvents(name, { connection });
  return { worker, events };
};
