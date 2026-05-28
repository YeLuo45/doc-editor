/**
 * PluginStore - Zustand Store for Plugin State Management
 * Manages plugin registry state with persistence
 */

import { create } from 'zustand';
import type { PluginMetadata, PluginInstance, PluginFeatureFlag } from '../plugins/types';

interface PluginState {
  // Registry state
  plugins: Map<string, PluginInstance>;
  featureFlags: Map<string, PluginFeatureFlag>;
  activeSandboxes: Set<string>;

  // UI state
  selectedPluginId: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions - Registry
  setPlugins: (plugins: Map<string, PluginInstance>) => void;
  addPlugin: (plugin: PluginInstance) => void;
  removePlugin: (pluginId: string) => void;
  updatePluginStatus: (pluginId: string, status: PluginInstance['status'], error?: string) => void;

  // Actions - Feature Flags
  setFeatureFlag: (pluginId: string, flag: PluginFeatureFlag) => void;
  removeFeatureFlag: (pluginId: string) => void;

  // Actions - Sandboxes
  addSandbox: (pluginId: string) => void;
  removeSandbox: (pluginId: string) => void;

  // Actions - UI
  selectPlugin: (pluginId: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Actions - Bulk
  clearAll: () => void;
}

export const usePluginStore = create<PluginState>((set) => ({
  // Initial state
  plugins: new Map(),
  featureFlags: new Map(),
  activeSandboxes: new Set(),
  selectedPluginId: null,
  isLoading: false,
  error: null,

  // Registry actions
  setPlugins: (plugins) => set({ plugins }),

  addPlugin: (plugin) => set((state) => {
    const newPlugins = new Map(state.plugins);
    newPlugins.set(plugin.metadata.id, plugin);
    return { plugins: newPlugins };
  }),

  removePlugin: (pluginId) => set((state) => {
    const newPlugins = new Map(state.plugins);
    const newFeatureFlags = new Map(state.featureFlags);
    const newSandboxes = new Set(state.activeSandboxes);

    newPlugins.delete(pluginId);
    newFeatureFlags.delete(pluginId);
    newSandboxes.delete(pluginId);

    return {
      plugins: newPlugins,
      featureFlags: newFeatureFlags,
      activeSandboxes: newSandboxes,
      selectedPluginId: state.selectedPluginId === pluginId ? null : state.selectedPluginId,
    };
  }),

  updatePluginStatus: (pluginId, status, error) => set((state) => {
    const plugin = state.plugins.get(pluginId);
    if (!plugin) return state;

    const newPlugins = new Map(state.plugins);
    newPlugins.set(pluginId, { ...plugin, status, lastError: error });
    return { plugins: newPlugins };
  }),

  // Feature flag actions
  setFeatureFlag: (pluginId, flag) => set((state) => {
    const newFeatureFlags = new Map(state.featureFlags);
    newFeatureFlags.set(pluginId, flag);
    return { featureFlags: newFeatureFlags };
  }),

  removeFeatureFlag: (pluginId) => set((state) => {
    const newFeatureFlags = new Map(state.featureFlags);
    newFeatureFlags.delete(pluginId);
    return { featureFlags: newFeatureFlags };
  }),

  // Sandbox actions
  addSandbox: (pluginId) => set((state) => {
    const newSandboxes = new Set(state.activeSandboxes);
    newSandboxes.add(pluginId);
    return { activeSandboxes: newSandboxes };
  }),

  removeSandbox: (pluginId) => set((state) => {
    const newSandboxes = new Set(state.activeSandboxes);
    newSandboxes.delete(pluginId);
    return { activeSandboxes: newSandboxes };
  }),

  // UI actions
  selectPlugin: (pluginId) => set({ selectedPluginId: pluginId }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  // Bulk actions
  clearAll: () => set({
    plugins: new Map(),
    featureFlags: new Map(),
    activeSandboxes: new Set(),
    selectedPluginId: null,
    isLoading: false,
    error: null,
  }),
}));

// Selectors
export const selectPluginById = (pluginId: string) => (state: PluginState) =>
  state.plugins.get(pluginId);

export const selectPluginsByStatus = (status: PluginInstance['status']) => (state: PluginState) =>
  Array.from(state.plugins.values()).filter(p => p.status === status);

export const selectPluginsByType = (type: PluginMetadata['type']) => (state: PluginState) =>
  Array.from(state.plugins.values()).filter(p => p.metadata.type === type);

export const selectActivePlugins = (state: PluginState) =>
  selectPluginsByStatus('activated')(state);

export const selectEnabledFeatureFlags = (state: PluginState) =>
  Array.from(state.featureFlags.values()).filter(f => f.enabled);

export const selectPluginCount = (state: PluginState) => state.plugins.size;

export const selectSandboxCount = (state: PluginState) => state.activeSandboxes.size;

// Sync with PluginRegistry
export function syncFromRegistry(registry: Map<string, PluginInstance>): void {
  usePluginStore.getState().setPlugins(registry);
}