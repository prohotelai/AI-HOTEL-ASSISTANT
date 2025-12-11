import { AgentMessage, AgentResponse } from "../../../../packages/ai-lib/src/types/agent";
import { queryVectors } from "./pinecone";
import { embed, chat } from "./openai";
import { getRecentMessages, appendMessage } from "./memory";

const defaultSystemPrompt = `You are the AI concierge for a hotel. Always be concise, polite, and helpful. Use provided knowledge base context and tools when available.`;

export interface OrchestratorInput {
  hotelId: string;
  userId: string;
  sessionId?: string;
  message: string;
  modelHint?: string;
  temperature?: number;
  maxTokens?: number;
}

export const composePrompt = (context: string[], history: AgentMessage[]): AgentMessage[] => {
  const system = defaultSystemPrompt + (context.length ? `\nContext:\n${context.join("\n")}` : "");
  return [
    { role: "system", content: system },
    ...history,
    { role: "user", content: history.length ? history[history.length - 1].content : "" }
  ];
};

export const orchestrateAgentMessage = async (input: OrchestratorInput): Promise<AgentResponse> => {
  const conversationId = input.sessionId || `${input.hotelId}-${input.userId}`;
  const history = getRecentMessages(conversationId, 8);
  const vector = await embed(input.message);
  const retrieved = await queryVectors(vector, 4, input.hotelId);
  const context = retrieved.map((item) => (item.metadata?.text as string) || "");

  const messages: AgentMessage[] = [
    { role: "system", content: defaultSystemPrompt + (context.length ? `\nContext:\n${context.join("\n")}` : "") },
    ...history,
    { role: "user", content: input.message }
  ];

  const response = await chat(messages, { temperature: input.temperature, maxTokens: input.maxTokens });

  appendMessage(conversationId, { role: "user", content: input.message });
  appendMessage(conversationId, { role: "assistant", content: response.reply });
  return response;
};
