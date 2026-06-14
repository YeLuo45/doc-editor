/**
 * V245 ContextChunker - Direction D Perf Compression (Iter 1/30)
 * thunderbolt: Split long document into overlapping chunks for AI context
 */
export interface Chunk {
  id: string;
  text: string;
  startPos: number;
  endPos: number;
  overlapWith: string[];   // chunk IDs
  tokens: number;
}

export interface ChunkStrategy {
  type: 'fixed' | 'sentence' | 'paragraph' | 'token_aware';
  maxChunkSize: number;
  overlapSize: number;
  preserveBoundaries: boolean;
}

export interface ChunkerState {
  chunks: Map<string, Chunk>;
  nextId: number;
  totalChunks: number;
  totalTokens: number;
}

export function createChunkerState(): ChunkerState {
  return { chunks: new Map(), nextId: 1, totalChunks: 0, totalTokens: 0 };
}

export function chunkText(state: ChunkerState, text: string, strategy: ChunkStrategy): ChunkerState {
  if (!text || text.length === 0) return state;
  const newChunks: Chunk[] = [];
  const textLen = text.length;
  if (strategy.type === 'fixed') {
    let pos = 0;
    while (pos < textLen) {
      const endPos = Math.min(pos + strategy.maxChunkSize, textLen);
      const chunk: Chunk = { id: `chunk-${state.nextId}`, text: text.slice(pos, endPos), startPos: pos, endPos, overlapWith: [], tokens: estimateTokens(text.slice(pos, endPos)) };
      newChunks.push(chunk);
      pos = endPos - strategy.overlapSize;
      if (pos <= newChunks[newChunks.length - 2]?.startPos) pos = endPos;
    }
  } else if (strategy.type === 'sentence') {
    const sentences = text.split(/[.!?。！？]+\s*/).filter(s => s.length > 0);
    let pos = 0;
    for (const sentence of sentences) {
      const chunk: Chunk = { id: `chunk-${state.nextId}`, text: sentence, startPos: pos, endPos: pos + sentence.length, overlapWith: [], tokens: estimateTokens(sentence) };
      newChunks.push(chunk);
      pos += sentence.length + 1;
    }
  } else {
    // token_aware (default split by max chunk size)
    let pos = 0;
    while (pos < textLen) {
      const endPos = Math.min(pos + strategy.maxChunkSize, textLen);
      const chunk: Chunk = { id: `chunk-${state.nextId}`, text: text.slice(pos, endPos), startPos: pos, endPos, overlapWith: [], tokens: estimateTokens(text.slice(pos, endPos)) };
      newChunks.push(chunk);
      pos = endPos;
    }
  }
  // Compute overlaps (each chunk overlaps with previous if within overlapSize)
  for (let i = 1; i < newChunks.length; i++) {
    if (newChunks[i].startPos - newChunks[i - 1].endPos < strategy.overlapSize) {
      newChunks[i].overlapWith.push(newChunks[i - 1].id);
    }
  }
  // Assign unique IDs to each chunk
  const chunks = new Map(state.chunks);
  let totalTokens = state.totalTokens;
  let nextId = state.nextId;
  for (const chunk of newChunks) {
    chunk.id = `chunk-${nextId}`;
    nextId++;
    chunks.set(chunk.id, chunk);
    totalTokens += chunk.tokens;
  }
  return { ...state, chunks, nextId, totalChunks: state.totalChunks + newChunks.length, totalTokens };
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function getChunk(state: ChunkerState, id: string): Chunk | undefined {
  return state.chunks.get(id);
}

export function getChunksInRange(state: ChunkerState, start: number, end: number): Chunk[] {
  return Array.from(state.chunks.values()).filter(c => c.startPos < end && c.endPos > start);
}

export function clearChunks(state: ChunkerState): ChunkerState {
  return createChunkerState();
}

export function getChunkerReport(state: ChunkerState): { totalChunks: number; totalTokens: number; avgTokens: number } {
  const chunks = Array.from(state.chunks.values());
  const avgTokens = chunks.length > 0 ? chunks.reduce((a, b) => a + b.tokens, 0) / chunks.length : 0;
  return { totalChunks: state.totalChunks, totalTokens: state.totalTokens, avgTokens };
}
