import { create } from 'zustand';

interface EditorMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface EditorStore {
  messages: EditorMessage[];
  input: string;
  isLoading: boolean;
  addMessage: (role: 'user' | 'assistant', content: string) => void;
  setInput: (text: string) => void;
  clearMessages: () => void;
}

export const useEditorStore = create<EditorStore>((set) => ({
  messages: [],
  input: '',
  isLoading: false,
  addMessage: (role, content) =>
    set((state) => ({
      messages: [...state.messages, { id: Date.now().toString(36) + Math.random().toString(36).slice(2), role, content, timestamp: Date.now() }],
    })),
  setInput: (text) => set({ input: text }),
  clearMessages: () => set({ messages: [] }),
}));
