// Tool Configuration
// Defines which tools are available for each agent type

import { AgentType } from '../types/agent';

export interface ToolConfig {
  name: string;
  agentTypes: AgentType[];
  enabled: boolean;
  description: string;
}

export const toolConfigs: ToolConfig[] = [
  {
    name: 'text_format',
    agentTypes: [AgentType.EDITOR],
    enabled: true,
    description: 'Format and clean up text content',
  },
  {
    name: 'grammar_check',
    agentTypes: [AgentType.REVIEWER],
    enabled: true,
    description: 'Check grammar and spelling errors',
  },
  {
    name: 'style_suggest',
    agentTypes: [AgentType.REVIEWER],
    enabled: true,
    description: 'Suggest writing style improvements',
  },
  {
    name: 'web_search',
    agentTypes: [AgentType.RESEARCHER],
    enabled: true,
    description: 'Search the web for information',
  },
  {
    name: 'web_fetch',
    agentTypes: [AgentType.RESEARCHER],
    enabled: true,
    description: 'Fetch content from a URL',
  },
  {
    name: 'citation_insert',
    agentTypes: [AgentType.RESEARCHER],
    enabled: true,
    description: 'Insert citations and references',
  },
  {
    name: 'doc_export',
    agentTypes: [AgentType.EDITOR],
    enabled: true,
    description: 'Export document to various formats',
  },
  {
    name: 'spell_check',
    agentTypes: [AgentType.REVIEWER],
    enabled: true,
    description: 'Check spelling in text',
  },
  {
    name: 'content_summary',
    agentTypes: [AgentType.RESEARCHER, AgentType.REVIEWER],
    enabled: true,
    description: 'Generate a summary of content',
  },
];

export function getEnabledToolsForAgent(agentType: AgentType): ToolConfig[] {
  return toolConfigs.filter(
    (config) => config.enabled && config.agentTypes.includes(agentType)
  );
}

export function isToolEnabled(toolName: string): boolean {
  const config = toolConfigs.find((c) => c.name === toolName);
  return config?.enabled ?? false;
}
