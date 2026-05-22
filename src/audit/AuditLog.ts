import { AuditEvent, AuditEventType } from './AuditEvent';

const STORAGE_KEY = 'doc-editor-audit-log';

export function log(event: AuditEvent): void {
  const events = getLogs();
  events.push(event);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

export function getLogs(filter?: {
  userId?: string;
  eventType?: AuditEventType;
  since?: number;
}): AuditEvent[] {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return [];
  
  let events: AuditEvent[] = JSON.parse(data);
  
  if (filter) {
    if (filter.userId) {
      events = events.filter((e) => e.userId === filter.userId);
    }
    if (filter.eventType) {
      events = events.filter((e) => e.type === filter.eventType);
    }
    if (filter.since) {
      events = events.filter((e) => e.timestamp >= filter.since);
    }
  }
  
  return events;
}

export function clear(): void {
  localStorage.removeItem(STORAGE_KEY);
}
