import { describe, expect, it } from "vitest";
import { chunkText, countTokens } from "../lib/tokenizer";

describe("tokenizer", () => {
  it("counts tokens", () => {
    expect(countTokens("one two three")).toBe(3);
  });

  it("chunks text with overlap", () => {
    const text = Array.from({ length: 1200 })
      .map((_, i) => `word${i}`)
      .join(" ");
    const chunks = chunkText(text, 300, 50);
    expect(chunks.length).toBeGreaterThan(3);
    expect(chunks[0].text.split(" ").length).toBeLessThanOrEqual(300);
  });
});
