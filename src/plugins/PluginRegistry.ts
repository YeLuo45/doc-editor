// 插件注册表 - 管理所有已注册插件

import type { PluginMetadata, PluginType } from './types';

export class PluginRegistry {
  private plugins: Map<string, PluginMetadata> = new Map();

  /**
   * 注册新插件
   */
  register(plugin: PluginMetadata): void {
    if (this.plugins.has(plugin.id)) {
      throw new Error(`Plugin ${plugin.id} already registered`);
    }
    this.plugins.set(plugin.id, plugin);
  }

  /**
   * 注销插件
   */
  unregister(pluginId: string): boolean {
    return this.plugins.delete(pluginId);
  }

  /**
   * 获取插件元数据
   */
  get(pluginId: string): PluginMetadata | undefined {
    return this.plugins.get(pluginId);
  }

  /**
   * 列出所有已注册插件
   */
  list(): PluginMetadata[] {
    return Array.from(this.plugins.values());
  }

  /**
   * 按类型查找插件
   */
  findByType(type: PluginType): PluginMetadata[] {
    return this.list().filter(p => p.type === type);
  }

  /**
   * 检查插件是否已注册
   */
  has(pluginId: string): boolean {
    return this.plugins.has(pluginId);
  }

  /**
   * 获取已注册插件数量
   */
  size(): number {
    return this.plugins.size;
  }

  /**
   * 清空所有已注册插件
   */
  clear(): void {
    this.plugins.clear();
  }
}

// 导出单例
export const pluginRegistry = new PluginRegistry();