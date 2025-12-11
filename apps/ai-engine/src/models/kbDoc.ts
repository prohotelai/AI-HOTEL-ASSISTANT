export interface KnowledgeDocument {
  id: string;
  hotelId: string;
  filename: string;
  sourceUrl?: string;
  status: "queued" | "processed" | "failed";
}

const docs: KnowledgeDocument[] = [];

export const saveDoc = (doc: KnowledgeDocument) => {
  const existing = docs.find((d) => d.id === doc.id);
  if (existing) {
    Object.assign(existing, doc);
  } else {
    docs.push(doc);
  }
};

export const listDocs = (hotelId: string) => docs.filter((d) => d.hotelId === hotelId);
