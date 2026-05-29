/**
 * V67 Analytics Engine - AnalyticsDashboard
 * Dashboard for visualizing analytics data
 */

export type DashboardConfig = {
  theme: 'light' | 'dark';
  refreshRate: number;
  layout: 'grid' | 'list' | 'tabs';
  widgets: string[];
  autoRefresh: boolean;
};

export type Widget = {
  id: string;
  type: string;
  title: string;
  data: unknown;
  timestamp: number;
};

export type DashboardState = {
  widgets: Widget[];
  lastRefresh: number;
  filters: Record<string, unknown>;
};

export class AnalyticsDashboard {
  config: DashboardConfig;
  private widgets: Widget[] = [];
  private state: DashboardState;
  private refreshTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(config: DashboardConfig) {
    this.config = config;
    this.state = {
      widgets: [],
      lastRefresh: Date.now(),
      filters: {},
    };
    this.initializeWidgets();
  }

  private initializeWidgets(): void {
    this.config.widgets.forEach((widgetType, index) => {
      const widget: Widget = {
        id: `widget_${index}_${Date.now()}`,
        type: widgetType,
        title: `${widgetType} Widget`,
        data: null,
        timestamp: Date.now(),
      };
      this.widgets.push(widget);
      this.state.widgets.push(widget);
    });
  }

  render(): DashboardState {
    this.state.lastRefresh = Date.now();
    return { ...this.state };
  }

  getWidgets(): Widget[] {
    return [...this.widgets];
  }

  update(widgetId: string, data: unknown): boolean {
    const widget = this.widgets.find(w => w.id === widgetId);
    if (!widget) {
      return false;
    }

    widget.data = data;
    widget.timestamp = Date.now();
    this.state.lastRefresh = Date.now();
    return true;
  }

  getConfig(): DashboardConfig {
    return { ...this.config };
  }

  addWidget(type: string, title?: string): Widget {
    const widget: Widget = {
      id: `widget_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      type,
      title: title || `${type} Widget`,
      data: null,
      timestamp: Date.now(),
    };

    this.widgets.push(widget);
    this.state.widgets.push(widget);
    return widget;
  }

  removeWidget(widgetId: string): boolean {
    const index = this.widgets.findIndex(w => w.id === widgetId);
    if (index === -1) {
      return false;
    }

    this.widgets.splice(index, 1);
    this.state.widgets = [...this.widgets];
    return true;
  }

  setFilter(key: string, value: unknown): void {
    this.state.filters[key] = value;
  }

  getFilters(): Record<string, unknown> {
    return { ...this.state.filters };
  }

  refresh(): void {
    this.state.lastRefresh = Date.now();
    this.widgets.forEach(widget => {
      widget.timestamp = Date.now();
    });
  }

  getSnapshot(): { widgetCount: number; config: DashboardConfig } {
    return {
      widgetCount: this.widgets.length,
      config: this.getConfig(),
    };
  }

  reset(): void {
    this.widgets = [];
    this.state.widgets = [];
    this.state.filters = {};
    this.state.lastRefresh = Date.now();
    
    this.refreshTimers.forEach(timer => clearTimeout(timer));
    this.refreshTimers.clear();
    
    this.initializeWidgets();
  }

  getReport(): string {
    return JSON.stringify({
      config: this.config,
      state: this.state,
      widgetCount: this.widgets.length,
      widgetTypes: this.widgets.map(w => w.type),
    }, null, 2);
  }

  exportMetrics(): { version: string } {
    return {
      version: 'v67.0.0',
    };
  }
}