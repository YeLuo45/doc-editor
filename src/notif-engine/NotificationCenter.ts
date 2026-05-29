/**
 * V62 Notification Engine - NotificationCenter
 * Handles notification dispatch with send/broadcast/subscribe/unsubscribe/getNotifications
 */

export type NotificationType = 'info' | 'warning' | 'error' | 'success';

export interface NotificationMessage {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  timestamp: number;
  source?: string;
  metadata?: Record<string, unknown>;
}

export type Subscriber = (notification: NotificationMessage) => void;

export interface NotificationCenterConfig {
  maxNotifications: number;
  retentionPeriod: number;
  enablePersistence: boolean;
  deliveryMode: 'immediate' | 'batched';
  batchInterval: number;
}

export class NotificationCenter {
  private _notifications: NotificationMessage[] = [];
  private _subscribers: Map<string, Subscriber> = new Map();
  private _config: NotificationCenterConfig;
  private _metrics = {
    totalSent: 0,
    totalBroadcast: 0,
    totalReceived: 0,
    activeSubscribers: 0,
  };

  constructor(config: NotificationCenterConfig) {
    this._config = { ...config };
  }

  get config(): NotificationCenterConfig {
    return { ...this._config };
  }

  get notifications(): NotificationMessage[] {
    return [...this._notifications];
  }

  private generateId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  send(notification: Omit<NotificationMessage, 'id' | 'timestamp'>): NotificationMessage {
    const fullNotification: NotificationMessage = {
      ...notification,
      id: this.generateId(),
      timestamp: Date.now(),
    };

    this._notifications.push(fullNotification);
    this._metrics.totalSent++;

    if (this._notifications.length > this._config.maxNotifications) {
      this._notifications = this._notifications.slice(-this._config.maxNotifications);
    }

    this._notifySubscribers(fullNotification);

    return fullNotification;
  }

  broadcast(notification: Omit<NotificationMessage, 'id' | 'timestamp'>): NotificationMessage {
    const fullNotification: NotificationMessage = {
      ...notification,
      id: this.generateId(),
      timestamp: Date.now(),
    };

    this._notifications.push(fullNotification);
    this._metrics.totalBroadcast++;

    if (this._notifications.length > this._config.maxNotifications) {
      this._notifications = this._notifications.slice(-this._config.maxNotifications);
    }

    this._notifyAllSubscribers(fullNotification);

    return fullNotification;
  }

  subscribe(id: string, callback: Subscriber): void {
    if (!id || typeof callback !== 'function') {
      throw new Error('Invalid subscriber: id and callback are required');
    }
    this._subscribers.set(id, callback);
    this._metrics.activeSubscribers = this._subscribers.size;
  }

  unsubscribe(id: string): boolean {
    const result = this._subscribers.delete(id);
    if (result) {
      this._metrics.activeSubscribers = this._subscribers.size;
    }
    return result;
  }

  getNotifications(filter?: { type?: NotificationType; source?: string }): NotificationMessage[] {
    if (!filter) {
      return [...this._notifications];
    }
    return this._notifications.filter(n => {
      if (filter.type && n.type !== filter.type) return false;
      if (filter.source && n.source !== filter.source) return false;
      return true;
    });
  }

  private _notifySubscribers(notification: NotificationMessage): void {
    this._subscribers.forEach(callback => {
      try {
        callback(notification);
        this._metrics.totalReceived++;
      } catch {
        // Silently ignore subscriber errors
      }
    });
  }

  private _notifyAllSubscribers(notification: NotificationMessage): void {
    this._notifySubscribers(notification);
  }

  getSnapshot(): { metrics: typeof NotificationCenter.prototype._metrics; config: NotificationCenterConfig; count: number } {
    return {
      metrics: { ...this._metrics },
      config: this.config,
      count: this._notifications.length,
    };
  }

  reset(): void {
    this._notifications = [];
    this._metrics = {
      totalSent: 0,
      totalBroadcast: 0,
      totalReceived: 0,
      activeSubscribers: 0,
    };
  }

  getReport(): string {
    const snapshot = this.getSnapshot();
    return [
      '=== NotificationCenter Report ===',
      `Total Sent: ${snapshot.metrics.totalSent}`,
      `Total Broadcast: ${snapshot.metrics.totalBroadcast}`,
      `Total Received: ${snapshot.metrics.totalReceived}`,
      `Active Subscribers: ${snapshot.metrics.activeSubscribers}`,
      `Stored Notifications: ${snapshot.count}`,
      `Max Notifications: ${snapshot.config.maxNotifications}`,
      `Delivery Mode: ${snapshot.config.deliveryMode}`,
    ].join('\n');
  }

  exportMetrics(): { version: string; metrics: typeof NotificationCenter.prototype._metrics } {
    return {
      version: 'V62',
      metrics: { ...this._metrics },
    };
  }
}

export default NotificationCenter;