import { describe, it, expect } from 'vitest';
import { Warehouse, Shelf, Bin, Catalog } from '../iter13';

describe('iter13 modules', () => {
  describe('Warehouse', () => {
    it('should add and remove shelves', () => {
      const wh = new Warehouse();
      wh.addShelf('S1');
      expect(wh.getShelves()).toContain('S1');
      wh.removeShelf('S1');
      expect(wh.getShelves()).not.toContain('S1');
    });
    it('should add items to shelf', () => {
      const wh = new Warehouse();
      wh.addShelf('S2');
      expect(wh.addItem('S2', 'item1')).toBe(true);
    });
    it('should get snapshot', () => {
      const wh = new Warehouse();
      expect(wh.getSnapshot().shelves).toBe(0);
    });
    it('should reset', () => {
      const wh = new Warehouse();
      wh.addShelf('S3');
      wh.reset();
      expect(wh.getShelves().length).toBe(0);
    });
    it('should get report', () => {
      const wh = new Warehouse();
      expect(typeof wh.getReport()).toBe('string');
    });
    it('should export metrics', () => {
      const wh = new Warehouse();
      expect(wh.exportMetrics()).toBeDefined();
    });
  });

  describe('Shelf', () => {
    it('should add and remove items', () => {
      const shelf = new Shelf('SH1');
      expect(shelf.addItem('item1')).toBe(true);
      expect(shelf.getItems()).toContain('item1');
      shelf.removeItem('item1');
      expect(shelf.getItems()).not.toContain('item1');
    });
    it('should respect capacity', () => {
      const shelf = new Shelf('SH2', { capacity: 2 });
      shelf.addItem('a');
      shelf.addItem('b');
      expect(shelf.addItem('c')).toBe(false);
    });
    it('should get snapshot', () => {
      const shelf = new Shelf('SH3');
      expect(shelf.getSnapshot().items).toBe(0);
    });
    it('should reset', () => {
      const shelf = new Shelf('SH4');
      shelf.addItem('x');
      shelf.reset();
      expect(shelf.getItems().length).toBe(0);
    });
    it('should get report', () => {
      const shelf = new Shelf('SH5');
      expect(typeof shelf.getReport()).toBe('string');
    });
    it('should export metrics', () => {
      const shelf = new Shelf('SH6');
      expect(shelf.exportMetrics()).toBeDefined();
    });
  });

  describe('Bin', () => {
    it('should add and remove items', () => {
      const bin = new Bin('B1');
      expect(bin.addItem('item1', 10)).toBe(true);
      expect(bin.getWeight()).toBe(10);
    });
    it('should respect weight limit', () => {
      const bin = new Bin('B2', { weightLimit: 15 });
      bin.addItem('a', 10);
      expect(bin.addItem('b', 10)).toBe(false);
    });
    it('should get snapshot', () => {
      const bin = new Bin('B3');
      expect(bin.getSnapshot().weight).toBe(0);
    });
    it('should reset', () => {
      const bin = new Bin('B4');
      bin.addItem('x', 5);
      bin.reset();
      expect(bin.getWeight()).toBe(0);
    });
    it('should get report', () => {
      const bin = new Bin('B5');
      expect(typeof bin.getReport()).toBe('string');
    });
    it('should export metrics', () => {
      const bin = new Bin('B6');
      expect(bin.exportMetrics()).toBeDefined();
    });
  });

  describe('Catalog', () => {
    it('should add and remove entries', () => {
      const cat = new Catalog();
      cat.addEntry('id1', 'description');
      expect(cat.getEntry('id1')).toBe('description');
      cat.removeEntry('id1');
      expect(cat.getEntry('id1')).toBeUndefined();
    });
    it('should search', () => {
      const cat = new Catalog();
      cat.addEntry('1', 'blue widget');
      cat.addEntry('2', 'red widget');
      const results = cat.search('blue');
      expect(results).toContain('1');
      expect(results).not.toContain('2');
    });
    it('should get snapshot', () => {
      const cat = new Catalog();
      expect(cat.getSnapshot().entries).toBe(0);
    });
    it('should reset', () => {
      const cat = new Catalog();
      cat.addEntry('x', 'y');
      cat.reset();
      expect(cat.getSnapshot().entries).toBe(0);
    });
    it('should get report', () => {
      const cat = new Catalog();
      expect(typeof cat.getReport()).toBe('string');
    });
    it('should export metrics', () => {
      const cat = new Catalog();
      expect(cat.exportMetrics()).toBeDefined();
    });
  });

  it('should have all required methods', () => {
    const wh = new Warehouse();
    expect(typeof wh.addShelf).toBe('function');
    expect(typeof wh.removeShelf).toBe('function');
    expect(typeof wh.addItem).toBe('function');
    expect(typeof wh.getShelves).toBe('function');
    expect(typeof wh.getSnapshot).toBe('function');
    expect(typeof wh.reset).toBe('function');
    expect(typeof wh.getReport).toBe('function');
    expect(typeof wh.exportMetrics).toBe('function');
  });
});
