export interface VectorMetadata {
  hotelId: string;
  docId?: string;
  chunkIndex?: number;
  source?: string;
  url?: string;
  [key: string]: unknown;
}

export interface VectorRecord {
  id: string;
  values: number[];
  metadata: VectorMetadata;
}

export interface VectorQueryResult extends VectorRecord {
  score?: number;
}
