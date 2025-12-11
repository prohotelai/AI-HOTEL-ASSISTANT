import OpenAI from "openai";

export const createOpenAIClient = (apiKey?: string) => {
  const key = apiKey || process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
  return new OpenAI({ apiKey: key });
};

export type OpenAIClient = ReturnType<typeof createOpenAIClient>;
