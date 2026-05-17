// Manager Agent - Orchestration, state machine, and workflow coordination

import { AgentLoop } from '../agentLoop';
import { AgentType, AgentMessage, MessageType, DocStatus, StateTransition } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { messageBus } from '../messageBus';
import { contextPool } from '../context';
import { agentRunner } from '../agentRunner';
import { editorAgent } from '../editor';
import { reviewerAgent } from '../reviewer';
import { researcherAgent } from '../researcher';

// State transition table
const STATE_TRANSITIONS: Record<DocStatus, Record<string, DocStatus>> = {
  [DocStatus.DRAFT]: { submit: DocStatus.IN_REVIEW },
  [DocStatus.IN_REVIEW]: { 
    approve: DocStatus.APPROVED,  // Direct approve (skip revision cycle)
    reject: DocStatus.REJECTED,
    revise: DocStatus.REVISED,
  },
  [DocStatus.REVISED]: { 
    confirm: DocStatus.APPROVED, 
    revise: DocStatus.DRAFT 
  },
  [DocStatus.APPROVED]: { publish: DocStatus.PUBLISHED },
  [DocStatus.PUBLISHED]: {},
  [DocStatus.REJECTED]: { revise: DocStatus.DRAFT },
};

export class ManagerAgent {
  private loop: AgentLoop;
  private static instance: ManagerAgent;
  private maxIterations = 10;
  private iterationCounts: Map<string, number> = new Map();

  private constructor() {
    this.loop = new AgentLoop({
      type: AgentType.MANAGER,
      systemPrompt: 'You are the workflow manager coordinating document editing, review, and publishing.',
    });
  }

  static getInstance(): ManagerAgent {
    if (!ManagerAgent.instance) {
      ManagerAgent.instance = new ManagerAgent();
    }
    return ManagerAgent.instance;
  }

  async start(conversationId?: string): Promise<string> {
    const convId = conversationId || uuidv4();
    await this.loop.start();
    
    // Initialize context
    contextPool.createContext(convId, '', DocStatus.DRAFT);
    
    return convId;
  }

  stop(): void {
    this.loop.stop();
  }

  // Transition document state
  async transitionState(
    conversationId: string,
    event: string
  ): Promise<{ success: boolean; from: DocStatus; to: DocStatus }> {
    const context = contextPool.getContext(conversationId);
    if (!context) {
      return { success: false, from: DocStatus.DRAFT, to: DocStatus.DRAFT };
    }

    const currentState = context.currentStatus;
    const nextState = STATE_TRANSITIONS[currentState]?.[event];

    if (!nextState) {
      return { success: false, from: currentState, to: currentState };
    }

    // Update state
    contextPool.setStatus(conversationId, nextState);

    return { success: true, from: currentState, to: nextState };
  }

  // Orchestrate document workflow
  async orchestrateWorkflow(
    docId: string,
    conversationId?: string
  ): Promise<{ success: boolean; status: DocStatus; results?: any }> {
    const convId = conversationId || uuidv4();

    // Initialize or get context
    let context = contextPool.getContext(convId);
    if (!context) {
      contextPool.createContext(convId, docId, DocStatus.DRAFT);
      context = contextPool.getContext(convId);
    }

    // Reset iteration count for this document
    this.iterationCounts.set(docId, 0);

    // Full workflow: DRAFT -> IN_REVIEW -> REVISED -> APPROVED -> PUBLISHED
    const results: any = {};

    // Step 1: Submit for review (DRAFT -> IN_REVIEW)
    const submitResult = await this.transitionState(convId, 'submit');
    if (!submitResult.success) {
      return { success: false, status: context!.currentStatus };
    }
    results.submit = submitResult;

    // Step 2: Run review (parallel: editor + reviewer + researcher)
    const workflowResult = await agentRunner.runWorkflow(
      [
        {
          agentType: AgentType.EDITOR,
          taskType: MessageType.EDIT_REQUEST,
          payload: { docId, action: 'format' },
        },
        {
          agentType: AgentType.REVIEWER,
          taskType: MessageType.REVIEW_REQUEST,
          payload: { docId },
        },
        {
          agentType: AgentType.RESEARCHER,
          taskType: MessageType.RESEARCH_REQUEST,
          payload: { query: 'document', action: 'search' },
        },
      ],
      convId
    );
    results.review = workflowResult;

    // Check review score
    const reviewResult = workflowResult.results[1]; // Reviewer is second
    if (reviewResult?.score >= 0.8) {
      // Auto-approve
      const approveResult = await this.transitionState(convId, 'approve');
      results.approve = approveResult;
    } else {
      // Reject and need revision
      const rejectResult = await this.transitionState(convId, 'reject');
      results.reject = rejectResult;
      return { success: false, status: DocStatus.REJECTED, results };
    }

    // Step 3: Author confirmation (REVISED -> APPROVED)
    const confirmResult = await this.transitionState(convId, 'confirm');
    if (!confirmResult.success) {
      return { success: false, status: DocStatus.REVISED, results };
    }
    results.confirm = confirmResult;

    // Step 4: Publish (APPROVED -> PUBLISHED)
    const publishResult = await this.transitionState(convId, 'publish');
    if (!publishResult.success) {
      return { success: false, status: DocStatus.APPROVED, results };
    }
    results.publish = publishResult;

    return { success: true, status: DocStatus.PUBLISHED, results };
  }

  // Handle iterative revision workflow
  async runIteration(
    docId: string,
    content: string,
    conversationId: string
  ): Promise<{ done: boolean; status: DocStatus; reviewResult?: any }> {
    const iterations = this.iterationCounts.get(docId) || 0;

    // Check iteration limit
    if (iterations >= this.maxIterations) {
      return { done: false, status: DocStatus.REJECTED };
    }

    this.iterationCounts.set(docId, iterations + 1);

    // Run review
    const reviewResult = await reviewerAgent.runAutomatedReview(content);

    // Check if passes threshold
    if (reviewResult.score >= 0.8) {
      // Auto-transition to approved
      await this.transitionState(conversationId, 'approve');
      await this.transitionState(conversationId, 'confirm');
      await this.transitionState(conversationId, 'publish');
      return { done: true, status: DocStatus.PUBLISHED, reviewResult };
    }

    // Need revision
    const rejectResult = await this.transitionState(conversationId, 'reject');
    if (rejectResult.success) {
      // Auto-revise and retry
      await this.transitionState(conversationId, 'revise');
      return { done: false, status: DocStatus.DRAFT, reviewResult };
    }

    return { done: false, status: DocStatus.REJECTED, reviewResult };
  }

  // Get current workflow status
  getWorkflowStatus(conversationId: string): DocStatus | null {
    const context = contextPool.getContext(conversationId);
    return context?.currentStatus || null;
  }

  // Check if document is in terminal state
  isTerminalState(status: DocStatus): boolean {
    return status === DocStatus.PUBLISHED || status === DocStatus.REJECTED;
  }

  getConversationId(): string {
    return this.loop.getConversationId();
  }

  isActive(): boolean {
    return this.loop.isActive();
  }
}

export const managerAgent = ManagerAgent.getInstance();