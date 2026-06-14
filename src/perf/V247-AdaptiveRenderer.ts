/**
 * V247 AdaptiveRenderer - Direction D Perf Compression (Iter 3/30)
 * thunderbolt: Virtual scroll + lazy render for long documents
 */
export interface RenderWindow {
  startIndex: number;
  endIndex: number;
  totalItems: number;
  itemHeight: number;
  bufferSize: number;
}

export interface RenderState {
  window: RenderWindow;
  visibleItems: number[];
  renderedAt: number;
  renderCount: number;
  skippedCount: number;
}

export interface AdaptiveRendererState {
  history: RenderState[];
  currentWindow: RenderWindow;
  totalRenders: number;
  totalSkipped: number;
}

export function createAdaptiveRendererState(itemHeight: number = 50, bufferSize: number = 5): AdaptiveRendererState {
  return {
    history: [],
    currentWindow: { startIndex: 0, endIndex: 0, totalItems: 0, itemHeight, bufferSize },
    totalRenders: 0,
    totalSkipped: 0,
  };
}

export function updateRenderWindow(state: AdaptiveRendererState, scrollTop: number, viewportHeight: number, totalItems: number): AdaptiveRendererState {
  const { itemHeight, bufferSize } = state.currentWindow;
  const firstVisible = Math.floor(scrollTop / itemHeight);
  const lastVisible = Math.ceil((scrollTop + viewportHeight) / itemHeight);
  const startIndex = Math.max(0, firstVisible - bufferSize);
  const endIndex = Math.min(totalItems, lastVisible + bufferSize);
  const visibleCount = endIndex - startIndex;
  const skippedCount = totalItems - visibleCount;
  const renderState: RenderState = { window: { startIndex, endIndex, totalItems, itemHeight, bufferSize }, visibleItems: Array.from({ length: visibleCount }, (_, i) => startIndex + i), renderedAt: Date.now(), renderCount: visibleCount, skippedCount };
  return { ...state, history: [...state.history, renderState].slice(-100), currentWindow: renderState.window, totalRenders: state.totalRenders + 1, totalSkipped: state.totalSkipped + skippedCount };
}

export function getVisibleRange(state: AdaptiveRendererState): { start: number; end: number } {
  return { start: state.currentWindow.startIndex, end: state.currentWindow.endIndex };
}

export function getSkippedRatio(state: AdaptiveRendererState): number {
  if (state.totalRenders === 0) return 0;
  return state.totalSkipped / (state.totalSkipped + state.history.reduce((a, b) => a + b.renderCount, 0));
}

export function clearRenderHistory(state: AdaptiveRendererState): AdaptiveRendererState {
  return { ...state, history: [], totalRenders: 0, totalSkipped: 0 };
}

export function getAdaptiveRendererReport(state: AdaptiveRendererState): { totalRenders: number; currentVisible: number; currentTotal: number; skippedRatio: number } {
  return { totalRenders: state.totalRenders, currentVisible: state.currentWindow.endIndex - state.currentWindow.startIndex, currentTotal: state.currentWindow.totalItems, skippedRatio: getSkippedRatio(state) };
}
