import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MessageBus } from '../agents/MessageBus';
import type { AgentMessage, AgentId } from '../agents/types';
import { vi } from 'vitest';

describe('MessageBus', () => {
  let messageBus: MessageBus;

  beforeEach(() => {
    messageBus = new MessageBus();
  });

  afterEach(() => {
    messageBus.clearQueue();
  });

  describe('publish and subscribe', () => {
    it('should publish and receive message on channel', async () => {
      const received: AgentMessage[] = [];
      const agentId: AgentId = 'test-agent';

      messageBus.subscribe(agentId, 'test-channel', (msg) => {
        received.push(msg);
      });

      const message: AgentMessage = {
        id: 'msg-1',
        from: 'sender',
        to: 'test-agent',
        type: 'request',
        payload: { data: 'test' },
        timestamp: Date.now(),
      };

      await messageBus.publish('test-channel', message);

      expect(received.length).toBe(1);
      expect(received[0].id).toBe('msg-1');
      expect(received[0].payload).toEqual({ data: 'test' });
    });

    it('should support multiple subscribers on same channel', async () => {
      const received1: AgentMessage[] = [];
      const received2: AgentMessage[] = [];

      messageBus.subscribe('agent-1', 'shared-channel', (msg) => { received1.push(msg); });
      messageBus.subscribe('agent-2', 'shared-channel', (msg) => { received2.push(msg); });

      const message: AgentMessage = {
        id: 'msg-1',
        from: 'sender',
        to: 'broadcast',
        type: 'event',
        payload: { data: 'shared' },
        timestamp: Date.now(),
      };

      await messageBus.publish('shared-channel', message);

      expect(received1.length).toBe(1);
      expect(received2.length).toBe(1);
    });

    it('should deliver to pattern subscribers', async () => {
      const received: AgentMessage[] = [];
      const pattern = /^agent\..*/;

      messageBus.subscribePattern('agent-watcher', pattern, (msg) => { received.push(msg); });

      const message: AgentMessage = {
        id: 'msg-1',
        from: 'sender',
        to: 'broadcast',
        type: 'event',
        payload: { data: 'pattern test' },
        timestamp: Date.now(),
      };

      await messageBus.publish('agent.updates', message);

      expect(received.length).toBe(1);
    });
  });

  describe('send and broadcast', () => {
    it('should send direct message to recipient', async () => {
      const received: AgentMessage[] = [];
      const targetAgent: AgentId = 'target-agent';

      messageBus.subscribe(targetAgent, `direct:${targetAgent}`, (msg) => { received.push(msg); });

      const message: AgentMessage = {
        id: 'direct-msg',
        from: 'sender',
        to: targetAgent,
        type: 'request',
        payload: { direct: true },
        timestamp: Date.now(),
      };

      await messageBus.send(targetAgent, message);

      expect(received.length).toBe(1);
      expect(received[0].to).toBe(targetAgent);
    });

    it('should broadcast to all subscribers', async () => {
      const received1: AgentMessage[] = [];
      const received2: AgentMessage[] = [];

      messageBus.subscribe('agent-1', 'broadcast', (msg) => { received1.push(msg); });
      messageBus.subscribe('agent-2', 'broadcast', (msg) => { received2.push(msg); });

      const message: AgentMessage = {
        id: 'broadcast-msg',
        from: 'sender',
        to: 'broadcast',
        type: 'event',
        payload: { announcement: 'hello' },
        timestamp: Date.now(),
      };

      await messageBus.broadcast(message);

      expect(received1.length).toBe(1);
      expect(received2.length).toBe(1);
      expect(received1[0].payload).toEqual({ announcement: 'hello' });
    });
  });

  describe('unsubscribe', () => {
    it('should unsubscribe by subscription ID', async () => {
      const received: AgentMessage[] = [];
      const agentId: AgentId = 'test-agent';

      const subId = messageBus.subscribe(agentId, 'channel', (msg) => { received.push(msg); });

      const message: AgentMessage = {
        id: 'msg-1',
        from: 'sender',
        to: agentId,
        type: 'request',
        payload: {},
        timestamp: Date.now(),
      };

      await messageBus.publish('channel', message);
      expect(received.length).toBe(1);

      messageBus.unsubscribe(subId);

      await messageBus.publish('channel', message);
      expect(received.length).toBe(1); // No new message
    });

    it('should unsubscribe all for agent', async () => {
      const received: AgentMessage[] = [];
      const agentId: AgentId = 'multi-sub-agent';

      messageBus.subscribe(agentId, 'channel1', (msg) => { received.push(msg); });
      messageBus.subscribe(agentId, 'channel2', (msg) => { received.push(msg); });
      messageBus.subscribe(agentId, 'channel3', (msg) => { received.push(msg); });

      const count = messageBus.unsubscribeAll(agentId);
      expect(count).toBe(3);
    });
  });

  describe('channel management', () => {
    it('should list all channels', () => {
      messageBus.subscribe('agent-1', 'channel-a', () => {});
      messageBus.subscribe('agent-2', 'channel-b', () => {});
      messageBus.subscribe('agent-3', 'channel-c', () => {});

      const channels = messageBus.getChannels();
      expect(channels.length).toBeGreaterThanOrEqual(3);
      expect(channels).toContain('channel-a');
      expect(channels).toContain('channel-b');
      expect(channels).toContain('channel-c');
    });

    it('should get subscription count per channel', () => {
      messageBus.subscribe('agent-1', 'popular', () => {});
      messageBus.subscribe('agent-2', 'popular', () => {});
      messageBus.subscribe('agent-3', 'popular', () => {});

      const subs = messageBus.getChannelSubscriptions('popular');
      expect(subs.length).toBe(3);
    });
  });

  describe('queue management', () => {
    it('should track queue depth', () => {
      const depth = messageBus.getQueueDepth();
      expect(depth).toBeGreaterThanOrEqual(0);
    });

    it('should clear queue', () => {
      const message: AgentMessage = {
        id: 'msg-1',
        from: 'sender',
        to: 'receiver',
        type: 'request',
        payload: {},
        timestamp: Date.now(),
      };

      messageBus.publish('channel', message);
      expect(messageBus.getQueueDepth()).toBeGreaterThan(0);

      messageBus.clearQueue();
      expect(messageBus.getQueueDepth()).toBe(0);
    });
  });

  describe('message ordering', () => {
    it('should deliver messages in order', async () => {
      const received: string[] = [];
      const order: string[] = [];

      messageBus.subscribe('agent', 'ordered-channel', (msg) => {
        received.push(msg.id);
        order.push(msg.id);
      });

      for (let i = 0; i < 5; i++) {
        await messageBus.publish('ordered-channel', {
          id: `msg-${i}`,
          from: 'sender',
          to: 'agent',
          type: 'request',
          payload: {},
          timestamp: Date.now(),
        });
      }

      expect(received.length).toBe(5);
      expect(order).toEqual(['msg-0', 'msg-1', 'msg-2', 'msg-3', 'msg-4']);
    });
  });

  describe('async handling', () => {
    it('should handle async callback', async () => {
      const received: AgentMessage[] = [];
      const delay = 50;

      messageBus.subscribe('agent', 'async-channel', async (msg) => {
        await new Promise((resolve) => setTimeout(resolve, delay));
        received.push(msg);
      });

      await messageBus.publish('async-channel', {
        id: 'async-msg',
        from: 'sender',
        to: 'agent',
        type: 'request',
        payload: {},
        timestamp: Date.now(),
      });

      // Wait for async callback
      await new Promise((resolve) => setTimeout(resolve, delay * 2));

      expect(received.length).toBe(1);
    });
  });

  describe('error handling', () => {
    it('should handle throwing callback gracefully', async () => {
      const errorHandler = vi.fn();

      messageBus.subscribe('agent', 'error-channel', () => {
        throw new Error('Callback error');
      });

      const originalError = console.error;
      console.error = errorHandler;

      await messageBus.publish('error-channel', {
        id: 'error-msg',
        from: 'sender',
        to: 'agent',
        type: 'request',
        payload: {},
        timestamp: Date.now(),
      });

      console.error = originalError;
      expect(errorHandler).toHaveBeenCalled();
    });
  });
});
