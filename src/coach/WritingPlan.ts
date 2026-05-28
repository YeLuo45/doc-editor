/**
 * WritingPlan.ts - Writing Plan Module
 * V24 Self-Evolution Writing Coach (Direction C)
 * Provides createPlan, updatePlan, getPlanSummary methods
 */

export interface WritingPlanItem {
  id: string;
  phase: 'outline' | 'draft' | 'revise' | 'edit' | 'finalize';
  title: string;
  description: string;
  targetWords?: number;
  estimatedMinutes?: number;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  order: number;
  startedAt?: number;
  completedAt?: number;
}

export interface WritingPlan {
  id: string;
  name: string;
  description: string;
  items: WritingPlanItem[];
  totalWords: number;
  createdAt: number;
  updatedAt: number;
  targetCompletionDate?: number;
}

export interface PlanSummary {
  planId: string;
  totalItems: number;
  completedItems: number;
  progress: number;
  currentPhase: string;
  estimatedTimeRemaining: number;
}

export interface PlanSnapshot {
  plansCreated: number;
  totalItems: number;
  completedItems: number;
  lastUpdatedAt: number;
}

export interface PlanReport {
  totalPlans: number;
  activePlans: number;
  completionRate: number;
  phasesCompleted: Record<string, number>;
  generatedAt: number;
}

export interface PlanMetrics {
  plansCreated: number;
  itemsCompleted: number;
  totalTimeSpent: number;
  averageItemsPerPlan: number;
  timestamp: number;
}

export class WritingPlan {
  private plans: Map<string, WritingPlan> = new Map();
  private plansCreated: number = 0;
  private totalItems: number = 0;
  private completedItems: number = 0;
  private lastUpdatedAt: number = 0;

  public createPlan(options: {
    name: string;
    description: string;
    items: Array<{
      phase: WritingPlanItem['phase'];
      title: string;
      description: string;
      targetWords?: number;
      estimatedMinutes?: number;
    }>;
    targetCompletionDate?: number;
  }): WritingPlan {
    const id = `plan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();

    const items: WritingPlanItem[] = options.items.map((item, index) => ({
      id: `item-${now}-${index}`,
      phase: item.phase,
      title: item.title,
      description: item.description,
      targetWords: item.targetWords,
      estimatedMinutes: item.estimatedMinutes,
      status: 'pending' as const,
      order: index,
    }));

    const plan: WritingPlan = {
      id,
      name: options.name,
      description: options.description,
      items,
      totalWords: items.reduce((sum, item) => sum + (item.targetWords || 0), 0),
      createdAt: now,
      updatedAt: now,
      targetCompletionDate: options.targetCompletionDate,
    };

    this.plans.set(id, plan);
    this.plansCreated++;
    this.totalItems += items.length;
    this.lastUpdatedAt = now;

    return plan;
  }

  public updatePlan(planId: string, updates: {
    itemId?: string;
    status?: WritingPlanItem['status'];
    name?: string;
  }): WritingPlan | null {
    const plan = this.plans.get(planId);
    if (!plan) return null;

    this.lastUpdatedAt = Date.now();

    if (updates.name) {
      plan.name = updates.name;
    }

    if (updates.itemId) {
      const item = plan.items.find(i => i.id === updates.itemId);
      if (item) {
        item.status = updates.status || item.status;

        if (updates.status === 'completed') {
          item.completedAt = Date.now();
          this.completedItems++;
        } else if (updates.status === 'in_progress') {
          item.startedAt = Date.now();
        }
      }
    }

    plan.updatedAt = Date.now();
    return plan;
  }

  public getPlanSummary(planId: string): PlanSummary | null {
    const plan = this.plans.get(planId);
    if (!plan) return null;

    const completedItems = plan.items.filter(i => i.status === 'completed').length;
    const progress = (completedItems / plan.items.length) * 100;

    const inProgressItem = plan.items.find(i => i.status === 'in_progress');
    const currentPhase = inProgressItem?.phase ||
      plan.items.find(i => i.status === 'pending')?.phase ||
      'finalize';

    let estimatedTimeRemaining = 0;
    plan.items.forEach(item => {
      if (item.status !== 'completed' && item.estimatedMinutes) {
        estimatedTimeRemaining += item.estimatedMinutes;
      }
    });

    return {
      planId,
      totalItems: plan.items.length,
      completedItems,
      progress: Math.round(progress * 10) / 10,
      currentPhase,
      estimatedTimeRemaining,
    };
  }

  public getPlan(planId: string): WritingPlan | null {
    return this.plans.get(planId) || null;
  }

  public getSnapshot(): PlanSnapshot {
    return {
      plansCreated: this.plansCreated,
      totalItems: this.totalItems,
      completedItems: this.completedItems,
      lastUpdatedAt: this.lastUpdatedAt,
    };
  }

  public reset(): void {
    this.plans.clear();
    this.plansCreated = 0;
    this.totalItems = 0;
    this.completedItems = 0;
    this.lastUpdatedAt = 0;
  }

  public getReport(): PlanReport {
    const allPlans = Array.from(this.plans.values());
    const activePlans = allPlans.filter(p =>
      p.items.some(i => i.status !== 'completed' && i.status !== 'skipped')
    ).length;

    const allItems = allPlans.flatMap(p => p.items);
    const completedItems = allItems.filter(i => i.status === 'completed').length;
    const completionRate = allItems.length > 0
      ? (completedItems / allItems.length) * 100
      : 0;

    const phasesCompleted: Record<string, number> = {};
    allItems.filter(i => i.status === 'completed').forEach(item => {
      phasesCompleted[item.phase] = (phasesCompleted[item.phase] || 0) + 1;
    });

    return {
      totalPlans: allPlans.length,
      activePlans,
      completionRate: Math.round(completionRate * 10) / 10,
      phasesCompleted,
      generatedAt: Date.now(),
    };
  }

  public exportMetrics(): PlanMetrics {
    const allPlans = Array.from(this.plans.values());

    return {
      plansCreated: this.plansCreated,
      itemsCompleted: this.completedItems,
      totalTimeSpent: allPlans.reduce((sum, p) => {
        return sum + p.items.reduce((itemSum, item) => {
          if (item.startedAt && item.completedAt) {
            return itemSum + (item.completedAt - item.startedAt);
          }
          return itemSum;
        }, 0);
      }, 0),
      averageItemsPerPlan: allPlans.length > 0
        ? this.totalItems / allPlans.length
        : 0,
      timestamp: Date.now(),
    };
  }
}