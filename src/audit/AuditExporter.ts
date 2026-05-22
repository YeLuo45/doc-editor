import { AuditEvent } from './AuditEvent';
import { getLogs } from './AuditLog';

export function exportToJSON(): string {
  const events = getLogs();
  return JSON.stringify(events, null, 2);
}

export function exportToCSV(): string {
  const events = getLogs();
  const headers = ['type', 'userId', 'timestamp', 'metadata'];
  const rows = events.map((event: AuditEvent) => [
    event.type,
    event.userId,
    event.timestamp,
    event.metadata ? JSON.stringify(event.metadata) : '',
  ]);
  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}
