import { z } from "zod";

export const agentMessageSchema = z.object({
  hotelId: z.string(),
  userId: z.string(),
  message: z.string(),
  sessionId: z.string().optional(),
  modelHint: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().positive().optional()
});

export type AgentMessageInput = z.infer<typeof agentMessageSchema>;

export interface AgentMessage {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  name?: string;
  toolCallId?: string;
}

export interface AgentResponse {
  reply: string;
  toolCalls?: ToolCall[];
}

export interface ToolCall {
  name: string;
  arguments: Record<string, unknown>;
  id?: string;
}
