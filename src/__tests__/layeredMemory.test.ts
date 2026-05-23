import { describe, it, expect } from 'vitest';
import { createEmptyMemory, getLayerPriority, L0_META_RULES } from '../utils/layeredMemory';

describe('LayeredMemory', () => {
  it('should create empty memory with L0 meta rules', () => {
    const mem = createEmptyMemory();
    expect(mem.l0MetaRules.length).toBeGreaterThan(0);
    expect(mem.l0MetaRules).toContain('禁止删除文档核心结构');
    expect(mem.l1Insights).toEqual([]);
    expect(mem.l2GlobalFacts).toEqual([]);
    expect(mem.l3Skills).toEqual([]);
    expect(mem.l4Archives).toEqual([]);
  });

  it('should have correct L0_META_RULES', () => {
    expect(L0_META_RULES).toContain('禁止删除文档核心结构');
    expect(L0_META_RULES).toContain('每项操作必须有独立完成判据');
    expect(L0_META_RULES).toContain('禁止凭记忆执行——必须从存储加载');
  });

  it('should return correct layer priorities', () => {
    expect(getLayerPriority('L0')).toBe(0);
    expect(getLayerPriority('L1')).toBe(1);
    expect(getLayerPriority('L2')).toBe(2);
    expect(getLayerPriority('L3')).toBe(3);
    expect(getLayerPriority('L4')).toBe(4);
    expect(getLayerPriority('L0')).toBeLessThan(getLayerPriority('L4'));
  });

  it('should have priority order L0 < L1 < L2 < L3 < L4', () => {
    const priorities = ['L0', 'L1', 'L2', 'L3', 'L4'].map(l => getLayerPriority(l as any));
    for (let i = 1; i < priorities.length; i++) {
      expect(priorities[i]).toBeGreaterThan(priorities[i - 1]);
    }
  });
});
