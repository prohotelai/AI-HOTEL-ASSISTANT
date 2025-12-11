import { createPineconeClient } from "../../../../packages/ai-lib/src/clients/pineconeClient";
import { VectorQueryResult, VectorRecord } from "../../../../packages/ai-lib/src/types/vector";

const indexName = process.env.PINECONE_INDEX || "ai-hotel-assistant";

export const getIndex = () => {
  const client = createPineconeClient();
  return client.index(indexName);
};

export const upsertVectors = async (items: VectorRecord[], namespace?: string) => {
  const index = getIndex();
  const target = namespace ? index.namespace(namespace) : index;
  await target.upsert(items as any);
};

export const queryVectors = async (
  vector: number[],
  topK: number,
  namespace?: string,
  filter?: Record<string, unknown>
): Promise<VectorQueryResult[]> => {
  const index = getIndex();
  const target = namespace ? index.namespace(namespace) : index;
  const result = await target.query({
    vector,
    topK,
    includeValues: true,
    includeMetadata: true,
    filter
  });
  return (result.matches || []).map((m: any): VectorQueryResult => {
    const meta = (m.metadata as Record<string, unknown>) || {};
    const metadata = {
      hotelId: (meta.hotelId as string) || (namespace || "unknown"),
      ...meta
    };
    return {
      id: m.id,
      values: m.values || [],
      metadata,
      score: m.score
    };
  });
};
