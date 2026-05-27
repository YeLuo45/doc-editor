/**
 * MCP Server Interface - Type Definitions
 * Centralized type exports for all MCP modules
 */

// Provider types
export type AIProvider = 'openai' | 'anthropic' | 'azure';

export interface ProviderConfig {
  provider: AIProvider;
  apiKey: string;
  baseUrl?: string;
  model?: string;
  extra?: Record<string, string>;
}

export interface AIProviderInterface {
  name: AIProvider;
  apiKey: string;
  baseUrl?: string;
  model?: string;
  extra?: Record<string, string>;
}

// Resource types (doc-editor-L1-index format)
export interface MCPResource {
  id: string;
  type: string;
  name: string;
  description: string;
  uri: string;
  metadata?: Record<string, string>;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ResourceFilter {
  type?: string;
  tags?: string[];
  search?: string;
}

// Tool types
export interface MCPTool {
  id: string;
  name: string;
  description: string;
  version: string;
  inputSchema: Record<string, unknown>;
  handler: unknown;
  metadata?: Record<string, string>;
}

export interface ToolVersion {
  version: string;
  tool: MCPTool;
  deprecated?: boolean;
}

export interface ToolFilter {
  name?: string;
  version?: string;
}

// Server types
export interface MCPServerConfig {
  providers: ProviderConfig[];
  defaultProvider: AIProvider;
  storagePrefix?: string;
}

// Constants
export const STORAGE_PREFIX = 'doc-editor-mcp-';
export const DEFAULT_PROVIDER_KEY = 'openai';
export const ENV_PROVIDER_KEY = 'VITE_AI_PROVIDER';