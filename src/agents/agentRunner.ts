// AgentRunner - Execution engine for running agent tasks

import { AgentType, AgentMessage, MessageType, DocStatus } from './types';
import { messageBus } from './messageBus';
import { contextPool } from './context';
import { toolRegistry } from '../tools/registry';
import { v4 as uuidv4 } from 'uuid';

export interface RunnerConfig {
  maxRetries?: number;
  timeout?: number;
  autoApprove?: boolean;
}

export class AgentRunner {
  private config: RunnerConfig;
  private activeTasks: Map<string, { status: string; result?: any; retries: number }>;

  constructor(config: RunnerConfig = {}) {
    this.config = {
      maxRetries: 3,
      timeout: 30000,
      autoApprove: true,
      ...config,
    };
    this.activeTasks = new Map();
  }

  // Execute a task with an agent
  async executeTask(
    agentType: AgentType,
    taskType: MessageType,
    payload: any,
    conversationId?: string
  ): Promise<any> {
    const taskId = uuidv4();
    const convId = conversationId || uuidv4();

    this.activeTasks.set(taskId, { status: 'pending', retries: 0 });

    // Create the request message
    const message: AgentMessage = {
      id: taskId,
      sender: AgentType.MANAGER, // Runner acts as manager
      receiver: agentType,
      type: taskType,
      payload,
      timestamp: Date.now(),
      conversationId: convId,
      requiresApproval: !this.config.autoApprove,
      retryCount: 0,
    };

    // Execute with retry logic
    let lastError: string | null = null;
    for (let attempt = 0; attempt < (this.config.maxRetries || 3); attempt++) {
      try {
        // Publish message and wait for response
        const response = await this.executeWithTimeout(
          this.sendAndWait(message),
          this.config.timeout
        );

        this.activeTasks.set(taskId, { status: 'completed', result: response, retries: 0 });
        return response;
      } catch (error) {
        lastError = String(error);
        const task = this.activeTasks.get(taskId);
        if (task) {
          task.retries = attempt + 1;
          task.status = 'retrying';
        }

        // Check if should retry
        if (attempt < (this.config.maxRetries || 3) - 1) {
          await this.delay(1000 * (attempt + 1)); // Exponential backoff
        }
      }
    }

    // All retries failed
    this.activeTasks.set(taskId, { status: 'failed', retries: this.config.maxRetries || 3 });

    // Degraded mode: return partial success
    return {
      success: false,
      error: lastError,
      degraded: true,
      payload,
    };
  }

  private async sendAndWait(message: AgentMessage): Promise<any> {
    return new Promise((resolve, reject) => {
      // Set up timeout
      const timeoutId = setTimeout(() => {
        reject(new Error('Agent execution timeout'));
      }, this.config.timeout);

      // Handler for response
      const responseHandler = async (response: AgentMessage) => {
        if (response.parentId === message.id) {
          clearTimeout(timeoutId);
          messageBus.unsubscribe(message.receiver as AgentType, responseHandler);

          if (response.type === MessageType.ERROR) {
            reject(new Error(response.payload.error || 'Unknown error'));
          } else {
            resolve(response.payload);
          }
        }
      };

      // Subscribe to response
      messageBus.subscribe(message.receiver as AgentType, responseHandler);

      // Send the message
      messageBus.publish(message).catch((err) => {
        clearTimeout(timeoutId);
        messageBus.unsubscribe(message.receiver as AgentType, responseHandler);
        reject(err);
      });
    });
  }

  private async executeWithTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Execution timeout')), ms)
      ),
    ]);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Get task status
  getTaskStatus(taskId: string): { status: string; result?: any; retries: number } | null {
    return this.activeTasks.get(taskId) || null;
  }

  // Clear completed tasks
  clearTask(taskId: string): void {
    this.activeTasks.delete(taskId);
  }

  // Run a sequence of tasks (workflow)
  async runWorkflow(
    tasks: Array<{
      agentType: AgentType;
      taskType: MessageType;
      payload: any;
      required?: boolean;
    }>,
    conversationId?: string
  ): Promise<{ results: any[]; success: boolean }> {
    const convId = conversationId || uuidv4();
    const results: any[] = [];
    let success = true;

    for (const task of tasks) {
      try {
        const result = await this.executeTask(
          task.agentType,
          task.taskType,
          task.payload,
          convId
        );

        // Check if result is acceptable
        if (result.success === false && task.required !== false) {
          success = false;
        }

        results.push(result);
      } catch (error) {
        if (task.required !== false) {
          success = false;
        }
        results.push({ success: false, error: String(error) });
      }
    }

    return { results, success };
  }
}

// Singleton instance
export const agentRunner = new AgentRunner({
  maxRetries: 3,
  timeout: 30000,
  autoApprove: true,
});