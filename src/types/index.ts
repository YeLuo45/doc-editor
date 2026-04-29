export interface Doc {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

export interface HistoryEntry {
  id: string;
  docId: string;
  content: string;
  timestamp: number;
}
