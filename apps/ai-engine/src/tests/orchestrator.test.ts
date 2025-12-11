import { describe, expect, it, vi } from "vitest";
import * as openai from "../lib/openai";
import * as pinecone from "../lib/pinecone";
import { orchestrateAgentMessage } from "../lib/rag";

describe("orchestrator", () => {
  it("composes response with retrieved context", async () => {
    vi.spyOn(openai, "embed").mockResolvedValue(new Array(5).fill(0.1));
    vi.spyOn(pinecone, "queryVectors").mockResolvedValue([
      { id: "1", values: [], metadata: { text: "hotel info", hotelId: "h1" } }
    ]);
    vi.spyOn(openai, "chat").mockResolvedValue({ reply: "Hello", toolCalls: [] });
    const resp = await orchestrateAgentMessage({ hotelId: "h1", userId: "u1", message: "Hi" });
    expect(resp.reply).toBe("Hello");
  });
});
