export type AuditEventType = 
  | 'document_created' 
  | 'document_opened' 
  | 'document_edited' 
  | 'permission_changed' 
  | 'document_exported' 
  | 'document_deleted';

export interface AuditEvent {
  type: AuditEventType;
  userId: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}
