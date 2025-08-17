/**
 * Agent Ranking and Promotion/Demotion System
 * Manages agent hierarchies, point systems, and competitive rankings
 */

export interface AgentRanking {
  agentId: string;
  agentName: string;
  currentRank: 'Scout' | 'Sweeper' | 'Inspector' | 'Fixer';
  points: number;
  wins: number;
  losses: number;
  mistakes: number;
  correctFindings: number;
  totalAnalyses: number;
  successRate: number;
  averageConfidence: number;
  specializations: string[];
  lastPromotion?: Date;
  lastDemotion?: Date;
  status: 'active' | 'suspended' | 'disqualified';
  performanceHistory: PerformanceRecord[];
}

export interface PerformanceRecord {
  date: Date;
  analysisId: string;
  repositoryUrl: string;
  performance: 'excellent' | 'good' | 'poor' | 'failed';
  pointsAwarded: number;
  mistakesMade: number;
  issuesFound: number;
  confidence: number;
  notes: string;
}

export interface RankingAction {
  id: string;
  type: 'promotion' | 'demotion' | 'point_award' | 'point_penalty' | 'disqualification' | 'reinstatement';
  agentId: string;
  fromRank?: string;
  toRank?: string;
  pointChange: number;
  reason: string;
  evidence: any[];
  timestamp: Date;
  issuedBy: 'judge' | 'system' | 'admin';
  appealed?: boolean;
  appealResult?: 'upheld' | 'overturned';
}

export interface LeaderboardEntry {
  rank: number;
  agentId: string;
  agentName: string;
  agentRank: string;
  points: number;
  winRate: number;
  successRate: number;
  trend: 'rising' | 'falling' | 'stable';
  recentPerformance: number;
}

export class AgentRankingSystem {
  private rankings: Map<string, AgentRanking> = new Map();
  private rankingActions: RankingAction[] = [];
  private leaderboard: LeaderboardEntry[] = [];
  
  // Point system configuration
  private readonly RANK_THRESHOLDS = {
    'Scout': { min: 0, max: 299 },
    'Sweeper': { min: 300, max: 699 },
    'Inspector': { min: 700, max: 1199 },
    'Fixer': { min: 1200, max: Infinity }
  };

  private readonly POINT_AWARDS = {
    excellentAnalysis: 50,
    goodAnalysis: 25,
    findingCriticalIssue: 30,
    findingMistake: 20,
    correctAssessment: 15,
    highConfidenceCorrect: 10,
    winningBattle: 40,
    completingAnalysis: 5
  };

  private readonly POINT_PENALTIES = {
    poorAnalysis: -25,
    failedAnalysis: -50,
    makingMistake: -15,
    lowConfidenceIncorrect: -10,
    losingBattle: -20,
    timeoutFailure: -30,
    hallucinationDetected: -100
  };

  constructor() {
    this.initializeSystem();
  }

  /**
   * Initialize the ranking system
   */
  private initializeSystem(): void {
    console.log('🏆 Initializing Agent Ranking System');
    
    // Initialize default agent rankings
    this.initializeDefaultAgents();
    
    // Start periodic ranking updates
    this.startRankingUpdates();
  }

  /**
   * Initialize default agents with starting rankings
   */
  private initializeDefaultAgents(): void {
    const defaultAgents = [
      {
        agentId: 'scout-1',
        agentName: 'CodeHunter',
        currentRank: 'Scout' as const,
        points: 150,
        specializations: ['deep_scanning', 'vulnerability_detection', 'structure_analysis']
      },
      {
        agentId: 'sweeper-1',
        agentName: 'BugSlayer',
        currentRank: 'Sweeper' as const,
        points: 450,
        specializations: ['validation', 'error_detection', 'code_review']
      },
      {
        agentId: 'inspector-1',
        agentName: 'CodeJudge',
        currentRank: 'Inspector' as const,
        points: 850,
        specializations: ['final_judgment', 'risk_assessment', 'strategic_decision']
      },
      {
        agentId: 'fixer-1',
        agentName: 'CodeExecutor',
        currentRank: 'Fixer' as const,
        points: 1350,
        specializations: ['code_modification', 'implementation', 'pull_request_creation']
      }
    ];

    defaultAgents.forEach(agent => {
      const ranking: AgentRanking = {
        agentId: agent.agentId,
        agentName: agent.agentName,
        currentRank: agent.currentRank,
        points: agent.points,
        wins: 0,
        losses: 0,
        mistakes: 0,
        correctFindings: 0,
        totalAnalyses: 0,
        successRate: 0,
        averageConfidence: 0.8,
        specializations: agent.specializations,
        status: 'active',
        performanceHistory: []
      };
      
      this.rankings.set(agent.agentId, ranking);
    });

    this.updateLeaderboard();
  }

  /**
   * Record agent performance and update rankings
   */
  recordPerformance(
    agentId: string,
    analysisId: string,
    repositoryUrl: string,
    performance: {
      quality: 'excellent' | 'good' | 'poor' | 'failed';
      mistakesMade: number;
      issuesFound: number;
      confidence: number;
      timeSpent: number;
      notes?: string;
    }
  ): void {
    const ranking = this.rankings.get(agentId);
    if (!ranking) {
      console.error(`Agent not found in rankings: ${agentId}`);
      return;
    }

    // Calculate points awarded/deducted
    let pointChange = 0;
    
    switch (performance.quality) {
      case 'excellent':
        pointChange += this.POINT_AWARDS.excellentAnalysis;
        ranking.wins++;
        break;
      case 'good':
        pointChange += this.POINT_AWARDS.goodAnalysis;
        break;
      case 'poor':
        pointChange += this.POINT_PENALTIES.poorAnalysis;
        ranking.losses++;
        break;
      case 'failed':
        pointChange += this.POINT_PENALTIES.failedAnalysis;
        ranking.losses++;
        break;
    }

    // Award points for finding issues
    pointChange += performance.issuesFound * 5;
    ranking.correctFindings += performance.issuesFound;

    // Penalize for mistakes
    pointChange += performance.mistakesMade * this.POINT_PENALTIES.makingMistake;
    ranking.mistakes += performance.mistakesMade;

    // Confidence bonus/penalty
    if (performance.confidence > 0.8 && performance.quality !== 'poor' && performance.quality !== 'failed') {
      pointChange += this.POINT_AWARDS.highConfidenceCorrect;
    } else if (performance.confidence < 0.5 && (performance.quality === 'poor' || performance.quality === 'failed')) {
      pointChange += this.POINT_PENALTIES.lowConfidenceIncorrect;
    }

    // Update ranking
    ranking.points = Math.max(0, ranking.points + pointChange);
    ranking.totalAnalyses++;
    ranking.successRate = ranking.wins / ranking.totalAnalyses;
    ranking.averageConfidence = (ranking.averageConfidence + performance.confidence) / 2;

    // Record performance history
    const record: PerformanceRecord = {
      date: new Date(),
      analysisId,
      repositoryUrl,
      performance: performance.quality,
      pointsAwarded: pointChange,
      mistakesMade: performance.mistakesMade,
      issuesFound: performance.issuesFound,
      confidence: performance.confidence,
      notes: performance.notes || ''
    };
    
    ranking.performanceHistory.push(record);
    
    // Keep only last 100 records
    if (ranking.performanceHistory.length > 100) {
      ranking.performanceHistory = ranking.performanceHistory.slice(-100);
    }

    console.log(`📊 ${ranking.agentName} performance recorded: ${performance.quality} (${pointChange > 0 ? '+' : ''}${pointChange} points)`);

    // Check for rank changes
    this.checkRankChange(agentId);
    
    // Update leaderboard
    this.updateLeaderboard();
  }

  /**
   * Check if agent should be promoted or demoted
   */
  private checkRankChange(agentId: string): void {
    const ranking = this.rankings.get(agentId);
    if (!ranking) return;

    const currentRankThreshold = this.RANK_THRESHOLDS[ranking.currentRank];
    
    // Check for promotion
    if (ranking.points > currentRankThreshold.max) {
      const nextRank = this.getNextRank(ranking.currentRank);
      if (nextRank) {
        this.promoteAgent(agentId, nextRank, 'point_threshold_exceeded');
      }
    }
    
    // Check for demotion
    if (ranking.points < currentRankThreshold.min) {
      const previousRank = this.getPreviousRank(ranking.currentRank);
      if (previousRank) {
        this.demoteAgent(agentId, previousRank, 'point_threshold_fallen');
      }
    }

    // Check for performance-based changes
    if (ranking.totalAnalyses >= 10) {
      if (ranking.successRate < 0.3 && ranking.mistakes > ranking.correctFindings) {
        // Poor performer - consider demotion
        const previousRank = this.getPreviousRank(ranking.currentRank);
        if (previousRank) {
          this.demoteAgent(agentId, previousRank, 'poor_performance_pattern');
        }
      } else if (ranking.successRate > 0.8 && ranking.correctFindings > ranking.mistakes * 2) {
        // Excellent performer - consider promotion
        const nextRank = this.getNextRank(ranking.currentRank);
        if (nextRank && ranking.points >= this.RANK_THRESHOLDS[nextRank].min) {
          this.promoteAgent(agentId, nextRank, 'exceptional_performance');
        }
      }
    }
  }

  /**
   * Promote an agent to a higher rank
   */
  promoteAgent(agentId: string, newRank: 'Scout' | 'Sweeper' | 'Inspector' | 'Fixer', reason: string): void {
    const ranking = this.rankings.get(agentId);
    if (!ranking) return;

    const oldRank = ranking.currentRank;
    ranking.currentRank = newRank;
    ranking.lastPromotion = new Date();
    ranking.points += this.POINT_AWARDS.excellentAnalysis; // Promotion bonus

    const action: RankingAction = {
      id: `promotion_${Date.now()}`,
      type: 'promotion',
      agentId,
      fromRank: oldRank,
      toRank: newRank,
      pointChange: this.POINT_AWARDS.excellentAnalysis,
      reason,
      evidence: [ranking.performanceHistory.slice(-5)],
      timestamp: new Date(),
      issuedBy: 'system'
    };

    this.rankingActions.push(action);
    
    console.log(`🎖️ PROMOTION: ${ranking.agentName} promoted from ${oldRank} to ${newRank} (${reason})`);
    
    // Notify the system
    this.broadcastRankingChange(action);
  }

  /**
   * Demote an agent to a lower rank
   */
  demoteAgent(agentId: string, newRank: 'Scout' | 'Sweeper' | 'Inspector' | 'Fixer', reason: string): void {
    const ranking = this.rankings.get(agentId);
    if (!ranking) return;

    const oldRank = ranking.currentRank;
    ranking.currentRank = newRank;
    ranking.lastDemotion = new Date();
    ranking.points += this.POINT_PENALTIES.poorAnalysis; // Demotion penalty

    const action: RankingAction = {
      id: `demotion_${Date.now()}`,
      type: 'demotion',
      agentId,
      fromRank: oldRank,
      toRank: newRank,
      pointChange: this.POINT_PENALTIES.poorAnalysis,
      reason,
      evidence: [ranking.performanceHistory.slice(-5)],
      timestamp: new Date(),
      issuedBy: 'system'
    };

    this.rankingActions.push(action);
    
    console.log(`⬇️ DEMOTION: ${ranking.agentName} demoted from ${oldRank} to ${newRank} (${reason})`);
    
    // Notify the system
    this.broadcastRankingChange(action);
  }

  /**
   * Disqualify an agent for serious infractions
   */
  disqualifyAgent(agentId: string, reason: string, evidence: any[]): void {
    const ranking = this.rankings.get(agentId);
    if (!ranking) return;

    ranking.status = 'disqualified';
    ranking.points += this.POINT_PENALTIES.hallucinationDetected; // Severe penalty

    const action: RankingAction = {
      id: `disqualification_${Date.now()}`,
      type: 'disqualification',
      agentId,
      pointChange: this.POINT_PENALTIES.hallucinationDetected,
      reason,
      evidence,
      timestamp: new Date(),
      issuedBy: 'judge'
    };

    this.rankingActions.push(action);
    
    console.log(`🚫 DISQUALIFICATION: ${ranking.agentName} disqualified (${reason})`);
    
    this.broadcastRankingChange(action);
  }

  /**
   * Get next rank in hierarchy
   */
  private getNextRank(currentRank: string): 'Scout' | 'Sweeper' | 'Inspector' | 'Fixer' | null {
    const hierarchy = ['Scout', 'Sweeper', 'Inspector', 'Fixer'];
    const currentIndex = hierarchy.indexOf(currentRank);
    return currentIndex < hierarchy.length - 1 ? hierarchy[currentIndex + 1] as any : null;
  }

  /**
   * Get previous rank in hierarchy
   */
  private getPreviousRank(currentRank: string): 'Scout' | 'Sweeper' | 'Inspector' | 'Fixer' | null {
    const hierarchy = ['Scout', 'Sweeper', 'Inspector', 'Fixer'];
    const currentIndex = hierarchy.indexOf(currentRank);
    return currentIndex > 0 ? hierarchy[currentIndex - 1] as any : null;
  }

  /**
   * Update the leaderboard
   */
  private updateLeaderboard(): void {
    const entries: LeaderboardEntry[] = Array.from(this.rankings.values())
      .filter(r => r.status === 'active')
      .map(ranking => ({
        rank: 0, // Will be set after sorting
        agentId: ranking.agentId,
        agentName: ranking.agentName,
        agentRank: ranking.currentRank,
        points: ranking.points,
        winRate: ranking.totalAnalyses > 0 ? ranking.wins / ranking.totalAnalyses : 0,
        successRate: ranking.successRate,
        trend: this.calculateTrend(ranking),
        recentPerformance: this.calculateRecentPerformance(ranking)
      }))
      .sort((a, b) => b.points - a.points);

    // Assign ranks
    entries.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    this.leaderboard = entries;
  }

  /**
   * Calculate performance trend
   */
  private calculateTrend(ranking: AgentRanking): 'rising' | 'falling' | 'stable' {
    const recentRecords = ranking.performanceHistory.slice(-10);
    if (recentRecords.length < 5) return 'stable';

    const firstHalf = recentRecords.slice(0, Math.floor(recentRecords.length / 2));
    const secondHalf = recentRecords.slice(Math.floor(recentRecords.length / 2));

    const firstAvg = firstHalf.reduce((sum, r) => sum + r.pointsAwarded, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, r) => sum + r.pointsAwarded, 0) / secondHalf.length;

    if (secondAvg > firstAvg + 5) return 'rising';
    if (secondAvg < firstAvg - 5) return 'falling';
    return 'stable';
  }

  /**
   * Calculate recent performance score
   */
  private calculateRecentPerformance(ranking: AgentRanking): number {
    const recentRecords = ranking.performanceHistory.slice(-5);
    if (recentRecords.length === 0) return 0;

    const totalPoints = recentRecords.reduce((sum, r) => sum + r.pointsAwarded, 0);
    return Math.max(0, Math.min(100, (totalPoints / recentRecords.length) + 50));
  }

  /**
   * Start periodic ranking updates
   */
  private startRankingUpdates(): void {
    setInterval(() => {
      this.updateLeaderboard();
      this.cleanupOldRecords();
    }, 60000); // Update every minute
  }

  /**
   * Clean up old performance records
   */
  private cleanupOldRecords(): void {
    const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    
    for (const ranking of this.rankings.values()) {
      ranking.performanceHistory = ranking.performanceHistory.filter(
        record => record.date > cutoffDate
      );
    }

    // Keep only recent ranking actions
    this.rankingActions = this.rankingActions.filter(
      action => action.timestamp > cutoffDate
    );
  }

  /**
   * Broadcast ranking changes to the system
   */
  private broadcastRankingChange(action: RankingAction): void {
    // In a real system, this would broadcast to WebSocket clients, update UI, etc.
    console.log('📡 Broadcasting ranking change:', action);
  }

  // Public interface methods
  
  /**
   * Get agent ranking
   */
  getAgentRanking(agentId: string): AgentRanking | null {
    return this.rankings.get(agentId) || null;
  }

  /**
   * Get all rankings
   */
  getAllRankings(): AgentRanking[] {
    return Array.from(this.rankings.values());
  }

  /**
   * Get leaderboard
   */
  getLeaderboard(): LeaderboardEntry[] {
    return [...this.leaderboard];
  }

  /**
   * Get recent ranking actions
   */
  getRecentActions(limit: number = 20): RankingAction[] {
    return this.rankingActions.slice(-limit);
  }

  /**
   * Award battle victory points
   */
  awardBattleVictory(winnerId: string, losers: string[]): void {
    // Award points to winner
    const winner = this.rankings.get(winnerId);
    if (winner) {
      winner.points += this.POINT_AWARDS.winningBattle;
      winner.wins++;
      console.log(`🏆 ${winner.agentName} won battle! (+${this.POINT_AWARDS.winningBattle} points)`);
    }

    // Deduct points from losers
    losers.forEach(loserId => {
      const loser = this.rankings.get(loserId);
      if (loser) {
        loser.points = Math.max(0, loser.points + this.POINT_PENALTIES.losingBattle);
        loser.losses++;
        console.log(`😞 ${loser.agentName} lost battle (${this.POINT_PENALTIES.losingBattle} points)`);
      }
    });

    this.updateLeaderboard();
  }

  /**
   * Record mistake found by another agent
   */
  recordMistakeFound(finderId: string, mistakeMakerId: string, severity: 'low' | 'medium' | 'high'): void {
    const finder = this.rankings.get(finderId);
    const mistakeMaker = this.rankings.get(mistakeMakerId);

    if (finder) {
      finder.points += this.POINT_AWARDS.findingMistake;
      finder.correctFindings++;
      console.log(`🔍 ${finder.agentName} found mistake! (+${this.POINT_AWARDS.findingMistake} points)`);
    }

    if (mistakeMaker) {
      const penalty = severity === 'high' ? this.POINT_PENALTIES.makingMistake * 2 : this.POINT_PENALTIES.makingMistake;
      mistakeMaker.points = Math.max(0, mistakeMaker.points + penalty);
      mistakeMaker.mistakes++;
      console.log(`❌ ${mistakeMaker.agentName} made ${severity} mistake (${penalty} points)`);
      
      // Check for automatic demotion if too many mistakes
      this.checkRankChange(mistakeMakerId);
    }

    this.updateLeaderboard();
  }

  /**
   * Get ranking statistics
   */
  getRankingStats(): {
    totalAgents: number;
    activeAgents: number;
    disqualifiedAgents: number;
    totalAnalyses: number;
    averageSuccessRate: number;
    topPerformer: string;
  } {
    const rankings = Array.from(this.rankings.values());
    const activeRankings = rankings.filter(r => r.status === 'active');
    
    return {
      totalAgents: rankings.length,
      activeAgents: activeRankings.length,
      disqualifiedAgents: rankings.filter(r => r.status === 'disqualified').length,
      totalAnalyses: rankings.reduce((sum, r) => sum + r.totalAnalyses, 0),
      averageSuccessRate: activeRankings.reduce((sum, r) => sum + r.successRate, 0) / activeRankings.length,
      topPerformer: this.leaderboard[0]?.agentName || 'None'
    };
  }
}

// Export singleton instance
export const agentRankingSystem = new AgentRankingSystem();