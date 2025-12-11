import { createOpenAIClient } from "../../../../packages/ai-lib/src/clients/openaiClient";
import { AgentMessage, AgentResponse, ToolCall } from "../../../../packages/ai-lib/src/types/agent";
import { File } from "node:buffer";

const defaultModel = process.env.OPENAI_MODEL || "gpt-4o-mini";

export const chat = async (messages: AgentMessage[], options?: { temperature?: number; maxTokens?: number }) => {
  const client = createOpenAIClient();
  const completion = await client.chat.completions.create({
    model: defaultModel,
    temperature: options?.temperature ?? 0.3,
    max_tokens: options?.maxTokens ?? 512,
    messages: messages as any
  });

  const choice = completion.choices[0];
  const reply: AgentResponse = {
    reply: typeof choice.message.content === "string" ? choice.message.content : JSON.stringify(choice.message.content),
    toolCalls: (choice.message.tool_calls || []).map<ToolCall>((toolCall: any) => ({
      id: toolCall.id,
      name: toolCall.function.name,
      arguments: JSON.parse(toolCall.function.arguments || "{}")
    }))
  };
  return reply;
};

export const embed = async (input: string) => {
  const client = createOpenAIClient();
  const embeddingModel = process.env.OPENAI_EMBED_MODEL || "text-embedding-3-small";
  const { data } = await client.embeddings.create({
    input,
    model: embeddingModel
  });
  return data[0].embedding;
};

export const speechToText = async (buffer: Buffer, mimetype: string) => {
  const client = createOpenAIClient();
  const file = new File([buffer], "audio", { type: mimetype });
  const { text } = await client.audio.transcriptions.create({
    file,
    model: "gpt-4o-mini-tts",
    temperature: 0.2
  });
  return { text, language: "unknown" };
};

export const textToSpeech = async (text: string, voice: string) => {
  const client = createOpenAIClient();
  const model = process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts";
  const audio = await client.audio.speech.create({
    model,
    voice: (voice as "alloy") || "alloy",
    input: text
  });
  const buffer = Buffer.from(await audio.arrayBuffer());
  return buffer;
};
