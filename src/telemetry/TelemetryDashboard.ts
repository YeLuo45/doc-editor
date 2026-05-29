/**
 * TelemetryDashboard - V64 Telemetry System
 * Provides dashboard data and widget management for telemetry visualization
 */

export interface DashboardConfig {
  refreshRate: number;
  maxWidgets: number;
  theme: 'light' | 'dark' | 'auto';
  layout: 'grid' | 'list' | 'custom';
  enabled: boolean;
  serviceName: string;
}

export interface Widget {
  id: string;
  type: 'chart' | 'metric' | 'table' | 'graph';
  title: string;
  dataKey: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
}

export interface DashboardSnapshot {
  widgets: Widget[];
  lastRender: number;
  config: DashboardConfig;
}

export class TelemetryDashboard {
  private widgets: Map<string, Widget> = new Map();
  private config: DashboardConfig;
  private renderCount: number = 0;
  private lastRenderTime?: number;

  constructor(config: DashboardConfig) {
    this.config = { ...config };
    this.widgets = new Map();
    this.renderCount = 0;
  }

  /**
   * Render the dashboard with current widgets
   */
  render(): DashboardSnapshot {
    this.renderCount++;
    this.lastRenderTime = Date.now();

    return {
      widgets: Array.from(this.widgets.values()),
      lastRender: this.lastRenderTime,
      config: { ...this.config }
    };
  }

  /**
   * Get all dashboard widgets
   */
  getWidgets(): Widget[] {
    return Array.from(this.widgets.values());
  }

  /**
   * Update a widget or add a new one
   */
  update(widgetId: string, updates: Partial<Widget>): Widget | null {
    const existing = this.widgets.get(widgetId);

    if (existing) {
      const updated: Widget = {
        ...existing,
        ...updates,
        id: widgetId
      };
      this.widgets.set(widgetId, updated);
      return updated;
    } else {
      if (this.widgets.size >= this.config.maxWidgets) {
        return null;
      }

      const newWidget: Widget = {
        id: widgetId,
        type: updates.type || 'metric',
        title: updates.title || widgetId,
        dataKey: updates.dataKey || '',
        position: updates.position || { x: 0, y: 0 },
        size: updates.size || { width: 100, height: 100 }
      };
      this.widgets.set(widgetId, newWidget);
      return newWidget;
    }
  }

  /**
   * Get current dashboard configuration
   */
  getConfig(): DashboardConfig {
    return { ...this.config };
  }

  /**
   * Get a snapshot of current dashboard state
   */
  getSnapshot(): { widgetCount: number; renderCount: number; lastRender?: number } {
    return {
      widgetCount: this.widgets.size,
      renderCount: this.renderCount,
      lastRender: this.lastRenderTime
    };
  }

  /**
   * Reset the dashboard state
   */
  reset(): void {
    this.widgets.clear();
    this.renderCount = 0;
    this.lastRenderTime = undefined;
  }

  /**
   * Generate a text report of dashboard state
   */
  getReport(): string {
    const lines = [
      `TelemetryDashboard Report`,
      `==========================`,
      `Service: ${this.config.serviceName}`,
      `Enabled: ${this.config.enabled}`,
      `Theme: ${this.config.theme}`,
      `Layout: ${this.config.layout}`,
      `Refresh Rate: ${this.config.refreshRate}ms`,
      `Max Widgets: ${this.config.maxWidgets}`,
      `Render Count: ${this.renderCount}`,
      `Last Render: ${this.lastRenderTime ? new Date(this.lastRenderTime!).toISOString() : 'Never'}`,
      `Widgets: ${this.widgets.size}`
    ];

    this.widgets.forEach((widget, id) => {
      lines.push(`  ${id}: ${widget.type} "${widget.title}" at (${widget.position.x}, ${widget.position.y})`);
    });

    return lines.join('\n');
  }

  /**
   * Export metrics in a standardized format
   */
  exportMetrics(): { version: string; exportedAt: string; widgetCount: number; renderCount: number } {
    return {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      widgetCount: this.widgets.size,
      renderCount: this.renderCount
    };
  }
}