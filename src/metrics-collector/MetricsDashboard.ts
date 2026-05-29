/**
 * MetricsDashboard.ts
 * V76 Metrics Dashboard - Renders and manages metrics dashboards
 * Provides widget management, configuration, and rendering capabilities
 */

export type MetricsDashboardConfig = {
  name: string;
  refreshInterval: number;
  layout: 'grid' | 'list' | 'chart';
  showHeaders: boolean;
  tags: Record<string, string>;
};

export type WidgetType = 'counter' | 'gauge' | 'chart' | 'table' | 'sparkline';

export interface DashboardWidget {
  id: string;
  type: WidgetType;
  title: string;
  metricName: string;
  config: Record<string, unknown>;
  data?: unknown;
}

export interface DashboardSnapshot {
  widgets: DashboardWidget[];
  renderedAt: number;
  version: string;
}

export class MetricsDashboard {
  private _config: MetricsDashboardConfig;
  private _widgets: DashboardWidget[] = [];
  private _renderCount = 0;

  constructor(config: Partial<MetricsDashboardConfig> = {}) {
    this._config = {
      name: config.name ?? 'default-dashboard',
      refreshInterval: config.refreshInterval ?? 30000,
      layout: config.layout ?? 'grid',
      showHeaders: config.showHeaders ?? true,
      tags: config.tags ?? {},
    };
  }

  get config(): MetricsDashboardConfig {
    return { ...this._config };
  }

  render(widgets?: DashboardWidget[]): string {
    this._renderCount++;
    const toRender = widgets ?? this._widgets;

    const lines: string[] = [
      `=== MetricsDashboard [${this._config.name}] ===`,
      `Layout: ${this._config.layout}`,
      `Refresh Interval: ${this._config.refreshInterval}ms`,
      `Widget Count: ${toRender.length}`,
      '--- Widgets ---',
    ];

    for (const widget of toRender) {
      lines.push(
        `  [${widget.type}] ${widget.title} (${widget.metricName})${widget.data ? `: ${JSON.stringify(widget.data)}` : ''}`
      );
    }

    lines.push('=== End Render ===');
    return lines.join('\n');
  }

  getWidgets(filter?: { type?: WidgetType }): DashboardWidget[] {
    let result = [...this._widgets];

    if (filter?.type) {
      result = result.filter((w) => w.type === filter.type);
    }

    return result;
  }

  update(widgetId: string, updates: Partial<DashboardWidget>): boolean {
    const index = this._widgets.findIndex((w) => w.id === widgetId);

    if (index === -1) return false;

    this._widgets[index] = { ...this._widgets[index], ...updates };
    return true;
  }

  getConfig(): MetricsDashboardConfig {
    return { ...this._config };
  }

  addWidget(widget: DashboardWidget): void {
    this._widgets.push(widget);
  }

  removeWidget(widgetId: string): boolean {
    const index = this._widgets.findIndex((w) => w.id === widgetId);

    if (index === -1) return false;

    this._widgets.splice(index, 1);
    return true;
  }

  reset(): void {
    this._widgets = [];
    this._renderCount = 0;
  }

  getSnapshot(): DashboardSnapshot {
    return {
      widgets: [...this._widgets],
      renderedAt: Date.now(),
      version: 'V76',
    };
  }

  getReport(): string {
    const lines = [
      `=== MetricsDashboard Report [${this._config.name}] ===`,
      `Total Widgets: ${this._widgets.length}`,
      `Render Count: ${this._renderCount}`,
      `Layout: ${this._config.layout}`,
      `Refresh Interval: ${this._config.refreshInterval}ms`,
      '--- Widget Details ---',
    ];

    for (const widget of this._widgets) {
      lines.push(
        `  ${widget.id} [${widget.type}]: ${widget.title} -> ${widget.metricName}`
      );
    }

    lines.push('=== End Report ===');
    return lines.join('\n');
  }

  exportMetrics(): { version: string; config: MetricsDashboardConfig; widgetCount: number } {
    return {
      version: 'V76',
      config: this._config,
      widgetCount: this._widgets.length,
    };
  }

  setLayout(layout: 'grid' | 'list' | 'chart'): void {
    this._config.layout = layout;
  }

  setRefreshInterval(intervalMs: number): void {
    this._config.refreshInterval = intervalMs;
  }

  getRenderCount(): number {
    return this._renderCount;
  }
}