/**
 * WritingGoals.ts - Goal Tracking Module
 * V24 Self-Evolution Writing Coach (Direction C)
 * Provides setGoal, trackProgress, evaluateGoal methods
 */

export interface WritingGoal {
  id: string;
  type: 'word_count' | 'clarity' | 'structure' | 'tone' | 'time' | 'completion';
  title: string;
  description: string;
  target: number;
  current: number;
  unit: string;
  deadline?: number;
  status: 'active' | 'achieved' | 'expired' | 'abandoned';
  createdAt: number;
  completedAt?: number;
}

export interface GoalProgress {
  goalId: string;
  percentComplete: number;
  remaining: number;
  onTrack: boolean;
  estimatedCompletion?: number;
}

export interface GoalEvaluation {
  goalId: string;
  achieved: boolean;
  score: number;
  feedback: string;
  improvements: string[];
}

export interface GoalsSnapshot {
  totalGoals: number;
  activeGoals: number;
  achievedGoals: number;
  averageProgress: number;
}

export interface GoalsReport {
  totalGoals: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  completionRate: number;
  recommendations: string[];
  generatedAt: number;
}

export interface GoalsMetrics {
  goalsSet: number;
  goalsAchieved: number;
  averageProgress: number;
  activeGoalCount: number;
  timestamp: number;
}

export class WritingGoals {
  private goals: Map<string, WritingGoal> = new Map();
  private goalsSet: number = 0;
  private goalsAchieved: number = 0;

  public setGoal(options: {
    type: WritingGoal['type'];
    title: string;
    description: string;
    target: number;
    unit: string;
    deadline?: number;
  }): WritingGoal {
    const id = `goal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();

    const goal: WritingGoal = {
      id,
      type: options.type,
      title: options.title,
      description: options.description,
      target: options.target,
      current: 0,
      unit: options.unit,
      deadline: options.deadline,
      status: 'active',
      createdAt: now,
    };

    this.goals.set(id, goal);
    this.goalsSet++;

    return goal;
  }

  public trackProgress(goalId: string, increment: number): GoalProgress | null {
    const goal = this.goals.get(goalId);
    if (!goal || goal.status !== 'active') return null;

    goal.current = Math.min(goal.current + increment, goal.target);

    if (goal.current >= goal.target) {
      goal.status = 'achieved';
      goal.completedAt = Date.now();
      this.goalsAchieved++;
    }

    const percentComplete = (goal.current / goal.target) * 100;
    const remaining = goal.target - goal.current;

    let onTrack = true;
    if (goal.deadline) {
      const timeElapsed = Date.now() - goal.createdAt;
      const totalTime = goal.deadline - goal.createdAt;
      const expectedProgress = totalTime > 0 ? (timeElapsed / totalTime) * 100 : 0;
      onTrack = percentComplete >= expectedProgress * 0.8;
    }

    let estimatedCompletion: number | undefined;
    if (remaining > 0 && increment > 0) {
      const remainingTime = (remaining / increment) * (Date.now() - goal.createdAt) / goal.current;
      estimatedCompletion = Date.now() + remainingTime;
    }

    return {
      goalId,
      percentComplete: Math.round(percentComplete * 10) / 10,
      remaining,
      onTrack,
      estimatedCompletion,
    };
  }

  public evaluateGoal(goalId: string): GoalEvaluation | null {
    const goal = this.goals.get(goalId);
    if (!goal) return null;

    const percentComplete = (goal.current / goal.target) * 100;
    const achieved = goal.status === 'achieved' || percentComplete >= 100;

    let score = Math.round(percentComplete);
    if (goal.deadline && goal.completedAt) {
      const timeTaken = goal.completedAt - goal.createdAt;
      const allowedTime = goal.deadline - goal.createdAt;
      if (timeTaken <= allowedTime) {
        score = Math.min(100, score + 10);
      }
    }

    const feedback = achieved
      ? `Goal "${goal.title}" has been achieved!`
      : `Goal "${goal.title}" is at ${Math.round(percentComplete)}% completion`;

    const improvements: string[] = [];
    if (score < 50) {
      improvements.push('Consider adjusting the goal target to be more achievable');
      improvements.push('Break down into smaller milestone goals');
    }
    if (!goal.deadline) {
      improvements.push('Setting a deadline may help improve focus');
    }

    return {
      goalId,
      achieved,
      score: Math.min(100, score),
      feedback,
      improvements,
    };
  }

  public getSnapshot(): GoalsSnapshot {
    const allGoals = Array.from(this.goals.values());
    const activeGoals = allGoals.filter(g => g.status === 'active');
    const achievedGoals = allGoals.filter(g => g.status === 'achieved');

    const averageProgress = allGoals.length > 0
      ? allGoals.reduce((sum, g) => sum + (g.current / g.target) * 100, 0) / allGoals.length
      : 0;

    return {
      totalGoals: allGoals.length,
      activeGoals: activeGoals.length,
      achievedGoals: achievedGoals.length,
      averageProgress: Math.round(averageProgress * 10) / 10,
    };
  }

  public reset(): void {
    this.goals.clear();
    this.goalsSet = 0;
    this.goalsAchieved = 0;
  }

  public getReport(): GoalsReport {
    const allGoals = Array.from(this.goals.values());
    const byStatus: Record<string, number> = {};
    const byType: Record<string, number> = {};

    allGoals.forEach(g => {
      byStatus[g.status] = (byStatus[g.status] || 0) + 1;
      byType[g.type] = (byType[g.type] || 0) + 1;
    });

    const completionRate = this.goalsSet > 0
      ? (this.goalsAchieved / this.goalsSet) * 100
      : 0;

    const recommendations: string[] = [];
    if (completionRate < 50) {
      recommendations.push('Consider setting more realistic goals based on past performance');
    }
    if (byStatus['active'] > 5) {
      recommendations.push('You have many active goals - focus on completing some first');
    }

    return {
      totalGoals: allGoals.length,
      byStatus,
      byType,
      completionRate: Math.round(completionRate * 10) / 10,
      recommendations,
      generatedAt: Date.now(),
    };
  }

  public exportMetrics(): GoalsMetrics {
    const allGoals = Array.from(this.goals.values());
    const activeGoalCount = allGoals.filter(g => g.status === 'active').length;

    const averageProgress = allGoals.length > 0
      ? allGoals.reduce((sum, g) => sum + (g.current / g.target) * 100, 0) / allGoals.length
      : 0;

    return {
      goalsSet: this.goalsSet,
      goalsAchieved: this.goalsAchieved,
      averageProgress: Math.round(averageProgress * 10) / 10,
      activeGoalCount,
      timestamp: Date.now(),
    };
  }
}