// 插件系统类型定义

export type PluginType = 'formatter' | 'ai' | 'collaboration' | 'tool';

export interface PluginMetadata {
  id: string;
  name: string;
  version: string;
  type: PluginType;
  description: string;
  permissions: string[];
  author?: string;
  homepage?: string;
}

export interface PluginContext {
  pluginId: string;
  getStorage(): PluginStorage;
  getConfig(): PluginConfig;
  log(level: 'info' | 'warn' | 'error', msg: string): void;
}

export interface PluginStorage {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface PluginConfig {
  [key: string]: unknown;
}

export type PluginStatus = 'registered' | 'activated' | 'deactivated' | 'error';

export interface PluginInstance {
  metadata: PluginMetadata;
  status: PluginStatus;
  lastError?: string;
}

export interface PluginInput {
  type: string;
  data: unknown;
  config?: Record<string, unknown>;
}

export interface PluginOutput {
  success: boolean;
  data?: unknown;
  error?: string;
  duration?: number;
}

export interface PluginFeatureFlag {
  pluginId: string;
  enabled: boolean;
  rollout: number; // 0-100
  config: Record<string, unknown>;
}

export interface SandboxMessage {
  id: string;
  type: 'init' | 'execute' | 'terminate';
  pluginId: string;
  payload?: unknown;
}

export interface SandboxResponse {
  id: string;
  type: 'result' | 'error' | 'log';
  pluginId: string;
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface PluginHostState {
  plugins: Map<string, PluginInstance>;
  featureFlags: Map<string, PluginFeatureFlag>;
  activeSandboxes: Set<string>;
}