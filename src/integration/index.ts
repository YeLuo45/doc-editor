/**
 * Integration Hub - Index
 * V30 Integration Hub for doc-editor
 */

export { IntegrationHub } from './IntegrationHub';
export type { HubStatus, HubConfig, AdapterInterface, PipelineResult } from './IntegrationHub';

export { IntegrationAdapter } from './IntegrationAdapter';
export type { AdapterInterface as AdapterExport, AdapterMetrics } from './IntegrationAdapter';

export { IntegrationPipeline } from './IntegrationPipeline';
export type {
  PipelineStep,
  PipelineExecution,
  PipelineResult as PipelineExecutionResult,
  PipeTransformer,
} from './IntegrationPipeline';

export { IntegrationMetrics } from './IntegrationMetrics';
export type { MetricEntry, MetricSummary } from './IntegrationMetrics';

export { IntegrationConfigManager } from './IntegrationConfig';
export type { IntegrationConfig } from './IntegrationConfig';

export { IntegrationUtils } from './IntegrationUtils';
export type { ValidationResult, TransformOptions } from './IntegrationUtils';