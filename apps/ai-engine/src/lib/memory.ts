import { AgentMessage } from "../../../../packages/ai-lib/src/types/agent";

interface ConversationStore {
  [conversationId: string]: AgentMessage[];
}

const shortTermMemory: ConversationStore = {};

export const appendMessage = (conversationId: string, message: AgentMessage) => {
  if (!shortTermMemory[conversationId]) {
    shortTermMemory[conversationId] = [];
  }
  shortTermMemory[conversationId].push(message);
};

export const getRecentMessages = (conversationId: string, limit = 10): AgentMessage[] => {
  const messages = shortTermMemory[conversationId] || [];
  return messages.slice(-limit);
};

export const storeConversation = (conversationId: string, messages: AgentMessage[]) => {
  shortTermMemory[conversationId] = messages;
};
