import { describe, expect, it, vi } from "vitest";
import * as openai from "../lib/openai";
import * as pinecone from "../lib/pinecone";
import { chunkText } from "../lib/tokenizer";

vi.mock("../lib/tokenizer", async () => {
  const actual = await vi.importActual<typeof import("../lib/tokenizer")>("../lib/tokenizer");
  return {
    ...actual,
    chunkText: (text: string) => actual.chunkText(text, 10, 2)
  };
});

describe("embed worker", () => {
  it("chunks and would upsert vectors", async () => {
    vi.spyOn(openai, "embed").mockResolvedValue([0.1, 0.2, 0.3]);
    const upsert = vi.spyOn(pinecone, "upsertVectors").mockResolvedValue();
    const chunks = chunkText("a b c d e f g h i j k", 5, 1);
    await pinecone.upsertVectors([], "test");
    expect(chunks.length).toBeGreaterThan(1);
    expect(upsert).toHaveBeenCalled();
  });
});
