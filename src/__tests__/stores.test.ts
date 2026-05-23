import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from '../stores';

describe('EditorStore', () => {
  beforeEach(() => {
    useEditorStore.getState().clearMessages();
    useEditorStore.getState().setInput('');
  });

  it('should start with empty messages', () => {
    const state = useEditorStore.getState();
    expect(state.messages).toEqual([]);
    expect(state.input).toBe('');
    expect(state.isLoading).toBe(false);
  });

  it('should add user message', () => {
    const { addMessage } = useEditorStore.getState();
    addMessage('user', 'Hello');
    const state = useEditorStore.getState();
    expect(state.messages.length).toBe(1);
    expect(state.messages[0].role).toBe('user');
    expect(state.messages[0].content).toBe('Hello');
  });

  it('should add assistant message', () => {
    const { addMessage } = useEditorStore.getState();
    addMessage('assistant', 'Hi there');
    const state = useEditorStore.getState();
    expect(state.messages.length).toBe(1);
    expect(state.messages[0].role).toBe('assistant');
  });

  it('should set input', () => {
    const { setInput } = useEditorStore.getState();
    setInput('test input');
    const state = useEditorStore.getState();
    expect(state.input).toBe('test input');
  });

  it('should clear messages', () => {
    const { addMessage, clearMessages } = useEditorStore.getState();
    addMessage('user', 'test');
    clearMessages();
    const state = useEditorStore.getState();
    expect(state.messages).toEqual([]);
  });

  it('should have unique message ids', () => {
    const { addMessage } = useEditorStore.getState();
    addMessage('user', 'msg1');
    addMessage('user', 'msg2');
    const state = useEditorStore.getState();
    expect(state.messages[0].id).not.toBe(state.messages[1].id);
  });
});
