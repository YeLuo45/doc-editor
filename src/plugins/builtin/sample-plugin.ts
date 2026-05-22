// Sample Plugin - Example plugin demonstrating the plugin system

import { Plugin, PluginContext } from '../types';

export const samplePlugin: Plugin = {
  id: 'sample-plugin',
  name: 'Sample Plugin',
  version: '1.0.0',
  
  onMount(ctx: PluginContext): void {
    const { api, logger } = ctx;
    
    // Insert sample text to demonstrate editor API
    api.editor.insertText('--- Sample Plugin Text ---\n');
    api.editor.insertText('This text was inserted by the Sample Plugin.\n');
    api.editor.insertText('Plugin ID: sample-plugin\n');
    api.editor.insertText('Plugin Version: 1.0.0\n');
    api.editor.insertText('-------------------------\n\n');
    
    // Show notification
    api.ui.showNotification('Sample Plugin mounted successfully');
    
    logger.log('Sample Plugin mounted');
  },
  
  onUnmount(): void {
    console.log('[Sample Plugin] Plugin unmounted');
  },
};
