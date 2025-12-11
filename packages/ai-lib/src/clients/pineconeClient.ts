import { Pinecone } from "@pinecone-database/pinecone";

export const createPineconeClient = (apiKey?: string, environment?: string) => {
  const key = apiKey || process.env.PINECONE_API_KEY;
  const env = environment || process.env.PINECONE_ENV;
  if (!key) {
    throw new Error("PINECONE_API_KEY is not configured");
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
