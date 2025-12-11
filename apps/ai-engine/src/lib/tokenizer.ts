export const countTokens = (text: string) => {
  if (!text) return 0;
  return text.trim().split(/\s+/).length;
};

export interface ChunkResult {
  text: string;
  index: number;
}

export const chunkText = (text: string, maxTokens = 500, overlap = 50): ChunkResult[] => {
  const words = text.split(/\s+/);
  const chunks: ChunkResult[] = [];
  let index = 0;
  for (let i = 0; i < words.length; i += maxTokens - overlap) {
    const slice = words.slice(i, i + maxTokens).join(" ");
    if (slice.trim().length === 0) continue;
    chunks.push({ text: slice, index });
    index += 1;
  }
  return chunks;
};
