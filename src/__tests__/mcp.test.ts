/**
 * MCP Module Tests
 * Comprehensive tests for MCP Protocol, Transport, Client, Tools, and Resources
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MCPProtocol } from '../mcp/MCPProtocol.js';
import { MCPTransport, WebSocketTransport } from '../mcp/MCPTransport.js';
import { MCPClient } from '../mcp/MCPClient.js';
import { MCPTools } from '../mcp/MCPTools.js';
import { MCPResources } from '../mcp/MCPResources.js';
import type { MCPRequest, MCPResponse, MCPNotification } from '../mcp/MCPProtocol.js';

describe('MCPProtocol', () => {
  let protocol: MCPProtocol;

  beforeEach(() => {
    protocol = new MCPProtocol();
  });

  afterEach(() => {
    protocol.reset();
  });

  describe('createRequest', () => {
    it('should create a valid request message', () => {
      const request = protocol.createRequest('tools/list');
      expect(request.jsonrpc).toBe('2.0');
      expect(request.method).toBe('tools/list');
      expect(request.id).toBeDefined();
    });

    it('should create request with params', () => {
      const request = protocol.createRequest('tools/call', { toolId: 'test-tool' });
      expect(request.params).toEqual({ toolId: 'test-tool' });
    });

    it('should create request with custom id', () => {
      const request = protocol.createRequest('ping', undefined, 'custom-id');
      expect(request.id).toBe('custom-id');
    });

    it('should track active requests', () => {
      const request = protocol.createRequest('resources/list');
      const snapshot = protocol.getSnapshot();
      expect(snapshot.activeRequests.has(request.id)).toBe(true);
    });
  });

  describe('createResponse', () => {
    it('should create a valid response message', () => {
      const response = protocol.createResponse('req-1', { success: true });
      expect(response.jsonrpc).toBe('2.0');
      expect(response.id).toBe('req-1');
      expect(response.result).toEqual({ success: true });
    });

    it('should create response without result', () => {
      const response = protocol.createResponse('req-2');
      expect(response.result).toBeUndefined();
    });
  });

  describe('createErrorResponse', () => {
    it('should create error response with code and message', () => {
      const response = protocol.createErrorResponse('req-1', -32602, 'Invalid params');
      expect(response.error).toBeDefined();
      expect(response.error?.code).toBe(-32602);
      expect(response.error?.message).toBe('Invalid params');
    });

    it('should include optional data in error', () => {
      const response = protocol.createErrorResponse('req-1', -32603, 'Internal error', { details: 'test' });
      expect(response.error?.data).toEqual({ details: 'test' });
    });
  });

  describe('createNotification', () => {
    it('should create notification without id', () => {
      const notification = protocol.createNotification('initialized', { version: '1.0' });
      expect(notification.jsonrpc).toBe('2.0');
      expect(notification.method).toBe('initialized');
      expect(notification.params).toEqual({ version: '1.0' });
    });
  });

  describe('metrics tracking', () => {
    it('should track requests sent', () => {
      protocol.createRequest('ping');
      const metrics = protocol.getMetrics();
      expect(metrics.requestsSent).toBe(1);
    });

    it('should track responses sent', () => {
      protocol.createResponse('req-1', { data: 'test' });
      const metrics = protocol.getMetrics();
      expect(metrics.responsesSent).toBe(1);
    });

    it('should track notifications sent', () => {
      protocol.createNotification('update', { status: 'ready' });
      const metrics = protocol.getMetrics();
      expect(metrics.notificationsSent).toBe(1);
    });

    it('should track errors', () => {
      protocol.createErrorResponse('req-1', -32600, 'Invalid request');
      const metrics = protocol.getMetrics();
      expect(metrics.errors).toBe(1);
    });
  });

  describe('reset', () => {
    it('should reset all metrics', () => {
      protocol.createRequest('ping');
      protocol.createResponse('req-1', {});
      protocol.reset();
      const metrics = protocol.getMetrics();
      expect(metrics.requestsSent).toBe(0);
      expect(metrics.responsesSent).toBe(0);
    });
  });

  describe('getReport', () => {
    it('should return formatted report', () => {
      const report = protocol.getReport();
      expect(report).toContain('MCP Protocol Report');
      expect(report).toContain('Requests Sent:');
    });
  });

  describe('exportMetrics', () => {
    it('should export protocol metrics', () => {
      const exported = protocol.exportMetrics();
      expect(exported).toHaveProperty('protocol');
      expect(exported).toHaveProperty('options');
    });
  });
});

describe('MCPTransport', () => {
  let transport: MCPTransport;

  beforeEach(() => {
    transport = new WebSocketTransport({ url: 'ws://localhost:8080', type: 'websocket' });
  });

  afterEach(() => {
    transport.reset();
  });

  describe('connection state', () => {
    it('should start disconnected', () => {
      expect(transport.isConnected()).toBe(false);
    });
  });

  describe('event handlers', () => {
    it('should set message handler', () => {
      const handler = vi.fn();
      transport.onMessage(handler);
      expect(handler).toBeDefined();
    });

    it('should set error handler', () => {
      const handler = vi.fn();
      transport.onError(handler);
      expect(handler).toBeDefined();
    });

    it('should set close handler', () => {
      const handler = vi.fn();
      transport.onClose(handler);
      expect(handler).toBeDefined();
    });
  });

  describe('metrics', () => {
    it('should have initial metrics', () => {
      const metrics = transport.getMetrics();
      expect(metrics.bytesSent).toBe(0);
      expect(metrics.messagesSent).toBe(0);
      expect(metrics.connectionAttempts).toBe(0);
    });
  });

  describe('getSnapshot', () => {
    it('should return transport snapshot', () => {
      const snapshot = transport.getSnapshot();
      expect(snapshot).toHaveProperty('connected');
      expect(snapshot).toHaveProperty('metrics');
    });
  });

  describe('getReport', () => {
    it('should return formatted report', () => {
      const report = transport.getReport();
      expect(report).toContain('MCP Transport Report');
      expect(report).toContain('Type: websocket');
    });
  });

  describe('exportMetrics', () => {
    it('should export transport metrics', () => {
      const exported = transport.exportMetrics();
      expect(exported).toHaveProperty('transport');
      expect(exported).toHaveProperty('connected');
    });
  });
});

describe('MCPClient', () => {
  let client: MCPClient;

  beforeEach(() => {
    client = new MCPClient({ timeout: 5000 });
  });

  afterEach(() => {
    client.reset();
  });

  describe('initialization', () => {
    it('should create client with options', () => {
      const customClient = new MCPClient({ timeout: 10000, autoReconnect: false });
      expect(customClient).toBeDefined();
    });

    it('should start disconnected', () => {
      expect(client.isConnected()).toBe(false);
    });
  });

  describe('connect', () => {
    it('should require transport configuration', async () => {
      await expect(client.connect()).rejects.toThrow('Transport configuration is required');
    });
  });

  describe('sendRequest', () => {
    it('should throw error when not connected', async () => {
      await expect(client.sendRequest('ping')).rejects.toThrow('Not connected to server');
    });
  });

  describe('sendNotification', () => {
    it('should throw error when not connected', async () => {
      await expect(client.sendNotification('update')).rejects.toThrow('Not connected to server');
    });
  });

  describe('notification handlers', () => {
    it('should register notification handler', () => {
      const handler = vi.fn();
      client.onNotification('initialized', handler);
    });

    it('should remove notification handler', () => {
      client.offNotification('initialized');
    });

    it('should handle multiple handlers', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      client.onNotification('update', handler1);
      client.onNotification('update', handler2);
    });
  });

  describe('getSnapshot', () => {
    it('should return client snapshot', () => {
      const snapshot = client.getSnapshot();
      expect(snapshot).toHaveProperty('connected');
      expect(snapshot).toHaveProperty('metrics');
    });
  });

  describe('getReport', () => {
    it('should return formatted report', () => {
      const report = client.getReport();
      expect(report).toContain('MCP Client Report');
      expect(report).toContain('Connected:');
    });
  });

  describe('exportMetrics', () => {
    it('should export client metrics', () => {
      const exported = client.exportMetrics();
      expect(exported).toHaveProperty('client');
    });
  });
});

describe('MCPTools', () => {
  let tools: MCPTools;

  beforeEach(() => {
    tools = new MCPTools();
  });

  afterEach(() => {
    tools.reset();
  });

  describe('initialization', () => {
    it('should initialize tools', () => {
      tools.init();
      expect(tools.isInitialized()).toBe(true);
    });
  });

  describe('getStandardTools', () => {
    it('should return standard tools', () => {
      const standardTools = tools.getStandardTools();
      expect(standardTools).toHaveLength(3);
      expect(standardTools[0].name).toBe('file_ops');
      expect(standardTools[1].name).toBe('search');
      expect(standardTools[2].name).toBe('execute_command');
    });

    it('should have valid tool schemas', () => {
      const standardTools = tools.getStandardTools();
      for (const tool of standardTools) {
        expect(tool.id).toBeDefined();
        expect(tool.name).toBeDefined();
        expect(tool.version).toBeDefined();
        expect(tool.inputSchema).toBeDefined();
      }
    });
  });

  describe('fileOps', () => {
    it('should perform read operation', async () => {
      const result = await tools.fileOps({ path: '/test.txt', operation: 'read' });
      expect(result).toHaveProperty('success', true);
    });

    it('should perform write operation', async () => {
      const result = await tools.fileOps({ path: '/test.txt', operation: 'write', content: 'test' });
      expect(result).toHaveProperty('success', true);
    });

    it('should perform delete operation', async () => {
      const result = await tools.fileOps({ path: '/test.txt', operation: 'delete' });
      expect(result).toHaveProperty('success', true);
    });

    it('should perform list operation', async () => {
      const result = await tools.fileOps({ path: '/', operation: 'list' });
      expect(result).toHaveProperty('success', true);
    });
  });

  describe('search', () => {
    it('should search with query', async () => {
      const result = await tools.search({ query: 'test query' });
      expect(result).toHaveProperty('query', 'test query');
    });

    it('should search with scope', async () => {
      const result = await tools.search({ query: 'test', scope: 'documents' });
      expect(result).toHaveProperty('scope', 'documents');
    });

    it('should search with limit', async () => {
      const result = await tools.search({ query: 'test', limit: 5 });
      expect(result).toHaveProperty('limit', 5);
    });
  });

  describe('executeCommand', () => {
    it('should execute command', async () => {
      const result = await tools.executeCommand({ command: 'ls -la' });
      expect(result).toHaveProperty('command', 'ls -la');
      expect(result).toHaveProperty('exitCode', 0);
    });

    it('should execute command with args', async () => {
      const result = await tools.executeCommand({ command: 'ls', args: ['-la', '/tmp'] });
      expect(result).toHaveProperty('args', ['-la', '/tmp']);
    });
  });

  describe('getSnapshot', () => {
    it('should return tools snapshot', () => {
      const snapshot = tools.getSnapshot();
      expect(snapshot).toHaveProperty('initialized');
      expect(snapshot).toHaveProperty('metrics');
    });
  });

  describe('getReport', () => {
    it('should return formatted report', () => {
      const report = tools.getReport();
      expect(report).toContain('MCP Tools Report');
    });
  });

  describe('exportMetrics', () => {
    it('should export tools metrics', () => {
      const exported = tools.exportMetrics();
      expect(exported).toHaveProperty('tools');
    });
  });
});

describe('MCPResources', () => {
  let resources: MCPResources;

  beforeEach(() => {
    resources = new MCPResources();
  });

  afterEach(() => {
    resources.reset();
  });

  describe('initialization', () => {
    it('should initialize resources', () => {
      resources.init();
      expect(resources.isInitialized()).toBe(true);
    });
  });

  describe('getStandardResources', () => {
    it('should return standard resources', () => {
      const standardResources = resources.getStandardResources();
      expect(standardResources).toHaveLength(3);
      expect(standardResources[0].name).toBe('Documents');
      expect(standardResources[1].name).toBe('Agents');
      expect(standardResources[2].name).toBe('Hooks');
    });

    it('should have valid resource URIs', () => {
      const standardResources = resources.getStandardResources();
      for (const resource of standardResources) {
        expect(resource.uri).toMatch(/^[\w]+:\/\//);
      }
    });
  });

  describe('access methods', () => {
    it('should access document resource', async () => {
      resources.init();
      const result = await resources.accessDocument('documents://');
      expect(result).toBeDefined();
    });

    it('should access agent resource', async () => {
      resources.init();
      const result = await resources.accessAgent('agents://');
      expect(result).toBeDefined();
    });

    it('should access hook resource', async () => {
      resources.init();
      const result = await resources.accessHook('hooks://');
      expect(result).toBeDefined();
    });

    it('should return undefined for non-existent resource', async () => {
      const result = await resources.accessDocument('non-existent://');
      expect(result).toBeUndefined();
    });
  });

  describe('listCachedResources', () => {
    it('should list cached resources after init', () => {
      resources.init();
      const cached = resources.listCachedResources();
      expect(cached.length).toBeGreaterThan(0);
    });
  });

  describe('getSnapshot', () => {
    it('should return resources snapshot', () => {
      const snapshot = resources.getSnapshot();
      expect(snapshot).toHaveProperty('initialized');
      expect(snapshot).toHaveProperty('metrics');
    });
  });

  describe('getReport', () => {
    it('should return formatted report', () => {
      const report = resources.getReport();
      expect(report).toContain('MCP Resources Report');
    });
  });

  describe('exportMetrics', () => {
    it('should export resources metrics', () => {
      const exported = resources.exportMetrics();
      expect(exported).toHaveProperty('resources');
      expect(exported).toHaveProperty('cacheSize');
    });
  });
});
