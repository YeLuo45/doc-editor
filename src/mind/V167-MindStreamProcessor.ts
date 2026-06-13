/**
 * V167 MindStreamProcessor - Direction A Writing Mind (Iter 13/30)
 * nanobot: event stream processing (transform/filter/route)
 */
export type StreamOp = 'map' | 'filter' | 'reduce' | 'tap';

export interface StreamStep {
  op: StreamOp;
  fn: (value: any, index?: number, acc?: any) => any;
}

export interface StreamProcessor {
  steps: StreamStep[];
  buffer: any[];
}

export function createStreamProcessor(): StreamProcessor {
  return { steps: [], buffer: [] };
}

export function addStep(processor: StreamProcessor, step: StreamStep): StreamProcessor {
  return { ...processor, steps: [...processor.steps, step] };
}

export function processStream(processor: StreamProcessor, input: any[]): any[] {
  let result = [...input];
  for (const step of processor.steps) {
    if (step.op === 'map') {
      result = result.map((v, i) => step.fn(v, i));
    } else if (step.op === 'filter') {
      result = result.filter((v, i) => step.fn(v, i));
    } else if (step.op === 'reduce') {
      result = [result.reduce((acc, v, i) => step.fn(v, i, acc), undefined)];
    } else if (step.op === 'tap') {
      result.forEach((v, i) => step.fn(v, i));
    }
  }
  return result;
}

export function processEvent(processor: StreamProcessor, event: any): { processor: StreamProcessor; outputs: any[] } {
  const buffer = [...processor.buffer, event].slice(-100);
  const outputs = processStream(processor, buffer);
  return { processor: { ...processor, buffer }, outputs };
}

export function clearStream(processor: StreamProcessor): StreamProcessor {
  return createStreamProcessor();
}

export function getStreamStepCount(processor: StreamProcessor): number {
  return processor.steps.length;
}
