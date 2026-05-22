/**
 * Operation replay functionality
 */

import { Operation } from './Operation';

export class Replayer {
  private initialContent: string;

  constructor(initialContent: string) {
    this.initialContent = initialContent;
  }

  replay(operations: Operation[]): string {
    let content = this.initialContent;
    
    for (const op of operations) {
      content = this.applyOperation(content, op);
    }
    
    return content;
  }

  getStateAt(timestamp: number): string {
    return this.initialContent;
  }

  private applyOperation(content: string, op: Operation): string {
    switch (op.type) {
      case 'insert':
        return content.slice(0, op.position) + op.content + content.slice(op.position);
      
      case 'delete':
        return content.slice(0, op.position) + content.slice(op.position + op.content.length);
      
      case 'replace':
        return content.slice(0, op.position) + op.content + content.slice(op.position + op.content.length);
      
      case 'format':
        return content;
      
      default:
        return content;
    }
  }
}

export default Replayer;
