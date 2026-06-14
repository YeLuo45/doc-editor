import { describe, it, expect } from 'vitest';
import {
  createTrustBusState, sendMessage, subscribeToBus,
  getMessagesByType, getMessagesForDoc, clearTrustBus, getTrustBusReport,
} from '../../trust/V286-TrustBus';

describe('V286 TrustBus', () => {
  it('should create empty bus', () => {
    const s = createTrustBusState();
    expect(s.messages).toHaveLength(0);
  });

  it('should send message', () => {
    let s = createTrustBusState();
    s = sendMessage(s, 'verify', 'sender1', { docId: 'd1' }, 'd1');
    expect(s.totalSent).toBe(1);
  });

  it('should subscribe to bus', () => {
    let s = createTrustBusState();
    s = subscribeToBus(s, 'verify', () => {});
    expect(s.subscribers.size).toBe(1);
  });

  it('should deliver to subscribers', () => {
    let s = createTrustBusState();
    let received = 0;
    s = subscribeToBus(s, 'verify', () => { received++; });
    s = sendMessage(s, 'verify', 's1', {}, 'd1');
    expect(received).toBe(1);
    expect(s.totalDelivered).toBe(1);
  });

  it('should not deliver to wrong type subscribers', () => {
    let s = createTrustBusState();
    let received = 0;
    s = subscribeToBus(s, 'verify', () => { received++; });
    s = sendMessage(s, 'revoke', 's1', {}, 'd1');
    expect(received).toBe(0);
  });

  it('should get messages by type', () => {
    let s = createTrustBusState();
    s = sendMessage(s, 'verify', 's1', {});
    s = sendMessage(s, 'revoke', 's1', {});
    expect(getMessagesByType(s, 'verify')).toHaveLength(1);
  });

  it('should get messages for doc', () => {
    let s = createTrustBusState();
    s = sendMessage(s, 'verify', 's1', {}, 'd1');
    s = sendMessage(s, 'verify', 's1', {}, 'd2');
    expect(getMessagesForDoc(s, 'd1')).toHaveLength(1);
  });

  it('should clear bus', () => {
    let s = createTrustBusState();
    s = sendMessage(s, 'verify', 's1', {});
    s = clearTrustBus(s);
    expect(s.messages).toHaveLength(0);
  });

  it('should cap messages at 1000', () => {
    let s = createTrustBusState();
    for (let i = 0; i < 1500; i++) s = sendMessage(s, 'verify', 's1', {});
    expect(s.messages).toHaveLength(1000);
  });

  it('should deliver to multiple subscribers', () => {
    let s = createTrustBusState();
    let count = 0;
    s = subscribeToBus(s, 'verify', () => { count++; });
    s = subscribeToBus(s, 'verify', () => { count++; });
    s = sendMessage(s, 'verify', 's1', {});
    expect(count).toBe(2);
  });

  it('should produce report', () => {
    let s = createTrustBusState();
    s = sendMessage(s, 'verify', 's1', {});
    s = sendMessage(s, 'revoke', 's1', {});
    const r = getTrustBusReport(s);
    expect(r.byType.verify).toBe(1);
    expect(r.byType.revoke).toBe(1);
  });
});
