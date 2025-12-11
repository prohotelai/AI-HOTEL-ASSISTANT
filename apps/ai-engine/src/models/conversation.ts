export interface ConversationRecord {
  id: string;
  hotelId: string;
  sessionId: string;
  userId: string;
  lastActiveAt: Date;
}

const conversations: ConversationRecord[] = [];

export const saveConversation = (record: ConversationRecord) => {
  const existing = conversations.find((c) => c.id === record.id);
  if (existing) {
    Object.assign(existing, record);
  } else {
    conversations.push(record);
  }
};

export const findConversation = (id: string) => conversations.find((c) => c.id === id);
