import { describe, expect, it, vi } from "vitest";
import { executeTool, toolsRegistry } from "../lib/tools";
import * as openai from "../lib/openai";
import * as pinecone from "../lib/pinecone";

describe("tools", () => {
  it("validates tool payload", async () => {
    const result = await executeTool("getBooking", { guestId: "123" });
    expect(result).toHaveProperty("booking");
  });

  it("searchKB uses embedding + query", async () => {
    vi.spyOn(openai, "embed").mockResolvedValue([0.1, 0.2]);
    vi.spyOn(pinecone, "queryVectors").mockResolvedValue([]);
    const result = await toolsRegistry.searchKB.handler({ query: "pool", hotelId: "h1", topK: 1 });
    expect(result).toEqual([]);
  });
});
