/**
 * V66 Data Pipeline - PipelineBuilder
 * Builds data pipelines with create/addStage/compile/getPipeline
 */

export type PipelineConfig = {
  id?: string;
  name?: string;
  timeout?: number;
  retries?: number;
  onError?: 'continue' | 'stop';
};

export type PipelineStageConfig = {
  id: string;
  name: string;
  handler: (input: unknown) => unknown;
  timeout?: number;
  retry?: number;
};

export type CompiledPipeline = {
  id: string;
  name: string;
  stages: PipelineStageConfig[];
  config: PipelineConfig;
};

export class PipelineBuilder {
  config: PipelineConfig;
  private stages: PipelineStageConfig[] = [];
  private pipelineId: string;
  private pipelineName: string;

  constructor(config: PipelineConfig = {}) {
    this.config = config;
    this.pipelineId = config.id || `pipeline-${Date.now()}`;
    this.pipelineName = config.name || 'Unnamed Pipeline';
  }

  create(name?: string): PipelineBuilder {
    this.stages = [];
    this.pipelineName = name || 'New Pipeline';
    this.pipelineId = `pipeline-${Date.now()}`;
    return this;
  }

  addStage(config: PipelineStageConfig): PipelineBuilder {
    this.stages.push({
      id: config.id,
      name: config.name,
      handler: config.handler,
      timeout: config.timeout || 5000,
      retry: config.retry || 0,
    });
    return this;
  }

  compile(): CompiledPipeline {
    if (this.stages.length === 0) {
      throw new Error('Cannot compile empty pipeline');
    }
    return {
      id: this.pipelineId,
      name: this.pipelineName,
      stages: [...this.stages],
      config: { ...this.config },
    };
  }

  getPipeline(): CompiledPipeline {
    return {
      id: this.pipelineId,
      name: this.pipelineName,
      stages: [...this.stages],
      config: { ...this.config },
    };
  }

  getSnapshot(): { metrics: { stageCount: number; pipelineId: string; name: string } } {
    return {
      metrics: {
        stageCount: this.stages.length,
        pipelineId: this.pipelineId,
        name: this.pipelineName,
      },
    };
  }

  reset(): void {
    this.stages = [];
    this.pipelineId = `pipeline-${Date.now()}`;
    this.pipelineName = 'Unnamed Pipeline';
    this.config = {};
  }

  getReport(): string {
    return `PipelineBuilder Report
========================
ID: ${this.pipelineId}
Name: ${this.pipelineName}
Stages: ${this.stages.length}
Config: ${JSON.stringify(this.config)}`;
  }

  exportMetrics(): { version: string; stageCount: number; pipelineId: string } {
    return {
      version: 'v66',
      stageCount: this.stages.length,
      pipelineId: this.pipelineId,
    };
  }
}

export default PipelineBuilder;