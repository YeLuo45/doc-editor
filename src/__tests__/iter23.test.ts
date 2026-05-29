import { describe, it, expect } from 'vitest';
import { Router, Middleware, Request, Response } from '../iter23';

describe('iter23 modules', () => {
  describe('Router', () => {
    it('should add and resolve routes', () => {
      const r = new Router();
      r.addRoute('/api/users', 'getUsers');
      expect(r.resolve('/api/users')).toBe('getUsers');
    });
    it('should remove routes', () => {
      const r = new Router();
      r.addRoute('/api/test', 'handler');
      r.removeRoute('/api/test');
      expect(r.resolve('/api/test')).toBeUndefined();
    });
    it('should list routes', () => {
      const r = new Router();
      r.addRoute('/a', 'h1');
      r.addRoute('/b', 'h2');
      expect(r.listRoutes()).toContain('/a');
    });
    it('should get snapshot', () => {
      const r = new Router();
      expect(r.getSnapshot().routes).toBe(0);
    });
    it('should reset', () => {
      const r = new Router();
      r.addRoute('/x', 'h');
      r.reset();
      expect(r.getSnapshot().routes).toBe(0);
    });
    it('should get report', () => {
      const r = new Router();
      expect(typeof r.getReport()).toBe('string');
    });
    it('should export metrics', () => {
      const r = new Router();
      expect(r.exportMetrics()).toBeDefined();
    });
  });

  describe('Middleware', () => {
    it('should add and execute', () => {
      const m = new Middleware();
      m.use(s => s.toUpperCase());
      m.use(s => s + '!');
      expect(m.execute('hello')).toBe('HELLO!');
    });
    it('should get chain size', () => {
      const m = new Middleware();
      m.use(s => s);
      expect(m.getChainSize()).toBe(1);
    });
    it('should get snapshot', () => {
      const m = new Middleware();
      expect(m.getSnapshot().chain).toBe(0);
    });
    it('should reset', () => {
      const m = new Middleware();
      m.use(s => s);
      m.reset();
      expect(m.getChainSize()).toBe(0);
    });
    it('should get report', () => {
      const m = new Middleware();
      expect(typeof m.getReport()).toBe('string');
    });
    it('should export metrics', () => {
      const m = new Middleware();
      expect(m.exportMetrics()).toBeDefined();
    });
  });

  describe('Request', () => {
    it('should have method and url', () => {
      const req = new Request('GET', 'http://example.com');
      expect(req.method).toBe('GET');
      expect(req.url).toBe('http://example.com');
    });
    it('should set and get headers', () => {
      const req = new Request('POST', '/api');
      req.setHeader('Content-Type', 'application/json');
      expect(req.getHeader('Content-Type')).toBe('application/json');
    });
    it('should get all headers', () => {
      const req = new Request('PUT', '/');
      req.setHeader('X-Custom', 'value');
      const headers = req.getHeaders();
      expect(headers['X-Custom']).toBe('value');
    });
    it('should get snapshot', () => {
      const req = new Request('GET', '/test');
      expect(req.getSnapshot().method).toBe('GET');
    });
    it('should reset', () => {
      const req = new Request('DELETE', '/resource');
      req.setHeader('Auth', 'token');
      req.reset();
      expect(req.getHeader('Auth')).toBeUndefined();
    });
    it('should get report', () => {
      const req = new Request('PATCH', '/item');
      expect(typeof req.getReport()).toBe('string');
    });
    it('should export metrics', () => {
      const req = new Request('HEAD', '/');
      expect(req.exportMetrics()).toBeDefined();
    });
  });

  describe('Response', () => {
    it('should set and get body', () => {
      const res = new Response();
      res.setBody('Hello World');
      expect(res.getBody()).toBe('Hello World');
    });
    it('should set and get status', () => {
      const res = new Response(201);
      expect(res.getStatus()).toBe(201);
      res.setStatus(404);
      expect(res.getStatus()).toBe(404);
    });
    it('should get snapshot', () => {
      const res = new Response(200);
      expect(res.getSnapshot().status).toBe(200);
    });
    it('should reset', () => {
      const res = new Response(500);
      res.setBody('error');
      res.reset();
      expect(res.getStatus()).toBe(200);
      expect(res.getBody()).toBe('');
    });
    it('should get report', () => {
      const res = new Response();
      expect(typeof res.getReport()).toBe('string');
    });
    it('should export metrics', () => {
      const res = new Response();
      expect(res.exportMetrics()).toBeDefined();
    });
  });

  it('should have all required methods', () => {
    const r = new Router();
    expect(typeof r.addRoute).toBe('function');
    expect(typeof r.removeRoute).toBe('function');
    expect(typeof r.resolve).toBe('function');
    expect(typeof r.listRoutes).toBe('function');
    expect(typeof r.getSnapshot).toBe('function');
    expect(typeof r.reset).toBe('function');
    expect(typeof r.getReport).toBe('function');
    expect(typeof r.exportMetrics).toBe('function');
  });
});
