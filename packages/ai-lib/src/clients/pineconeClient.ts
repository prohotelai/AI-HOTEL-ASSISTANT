import { Pinecone } from "@pinecone-database/pinecone";

export const createPineconeClient = (apiKey?: string, environment?: string) => {
  const key = apiKey || process.env.PINECONE_API_KEY;
  const env = environment || process.env.PINECONE_ENV;
  const host = process.env.PINECONE_HOST;
  if (!key) {
    throw new Error("PINECONE_API_KEY is not configured");
  }
  // Pinecone v1 prefers host; fall back to environment for compatibility.
  if (host) {
    return new Pinecone({ apiKey: key, host } as any);
  }
  if (!env) {
    throw new Error("PINECONE_ENV is not configured");
  }
  return new Pinecone({
    apiKey: key,
    environment: env
  });
};

export type PineconeClient = ReturnType<typeof createPineconeClient>;
