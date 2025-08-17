/**
 * Judge/Orchestrator System
 * The supreme authority that monitors all agents and makes final decisions
 */

import { MCPAgent, MCPMessage, MCPResponse, mcpServer } from './mcp-server';

export interface JudgeDecision {
  id: string;
  type: 'promotion' | 'demotion' | 'disqualification' | 'approval' | 'rejection';
  agentId: string;
  reason: string;
  evidence: any[];
  timestamp: Date;
  confidence: number;
}

export interface RepositoryVerdict {
  repositoryUrl: string;
  status: 'green' | 'red' | 'yellow';
  finalDecision: 'salvageable' | 'trash' | 'needs_fixing' | 'excellent';
  confidence: number;
  agentReports: AgentReport[];
  judgeNotes: string;
  timestamp: Date;
}

export interface AgentReport {
  agentId: string;
  agentRank: string;
  assessment: 'salvageable' | 'trash' | 'needs_fixing' | 'excellent';
  issues: Issue[];
  recommendations: string[];
  confidence: number;
  timeSpent: number;
  mistakes?: string[];
}

export interface Issue {
  type: 'security' | 'performance' | 'maintainability' | 'bugs' | 'style';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  location: string;
  suggestion: string;
}

export class JudgeOrchestrator {
  private active: boolean = true;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private activeAnalysis: Map<string, RepositoryAnalysis> = new Map();
  private decisions: JudgeDecision[] = [];
  private verdicts: RepositoryVerdict[] = [];

  constructor() {
    this.startContinuousMonitoring();
  }

  /**
   * Starts continuous monitoring of all agents
   * Judge is ALWAYS watching, even during reports
   */
  private startContinuousMonitoring() {
    this.monitoringInterval = setInterval(() => {
      if (!this.active) return;

      const agents = mcpServer.getAllAgents();
      
      // Monitor each agent for problems
      for (const agent of agents) {
        this.monitorAgent(agent);
      }

      // Check for stalled analyses
      this.checkForStalledAnalyses();
      
    }, 5000); // Monitor every 5 seconds
  }

  private monitorAgent(agent: MCPAgent) {
    // Check for hallucination indicators
    if (agent.hallucinationDetected) {
      this.issueDisqualification(agent.id, 'hallucination_detected', {
        errorCount: agent.errorCount,
        lastHeartbeat: agent.lastHeartbeat
      });
      return;
    }

    // Check for stalling (analyzing too long)
    if (agent.status === 'analyzing') {
      const timeSinceStart = new Date().getTime() - agent.lastHeartbeat.getTime();
      if (timeSinceStart > 300000) { // 5 minutes
        this.issueDisqualification(agent.id, 'analysis_timeout', {
          timeSpent: timeSinceStart
        });
      }
    }

    // Check error patterns
    if (agent.errorCount > 3) {
      this.issueDisqualification(agent.id, 'excessive_errors', {
        errorCount: agent.errorCount
      });
    }
  }

  private checkForStalledAnalyses() {
    const now = new Date().getTime();
    
    for (const [repoUrl, analysis] of this.activeAnalysis.entries()) {
      const elapsed = now - analysis.startTime.getTime();
      
      // If analysis is taking too long, intervene
      if (elapsed > 600000) { // 10 minutes
        this.emergencyIntervention(repoUrl, 'analysis_timeout');
      }
    }
  }

  /**
   * Initiates repository analysis with agent chain
   */
  async initiateRepositoryAnalysis(repositoryUrl: string, mode: 'normal' | 'urgent'): Promise<string> {
    const analysisId = `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const analysis: RepositoryAnalysis = {
      id: analysisId,
      repositoryUrl,
      mode,
      status: 'active',
      startTime: new Date(),
      currentAgent: 'scout',
      agentReports: [],
      mistakes: []
    };

    this.activeAnalysis.set(repositoryUrl, analysis);

    if (mode === 'normal') {
      await this.startSequentialAnalysis(analysis);
    } else {
      await this.startBattleRoyaleAnalysis(analysis);
    }

    return analysisId;
  }

  private async startSequentialAnalysis(analysis: RepositoryAnalysis) {
    // Sequential: Scout -> Sweeper -> Inspector -> Fixer
    const agentChain = ['scout', 'sweeper', 'inspector', 'fixer'];
    
    for (const agentRank of agentChain) {
      const agent = this.findAgentByRank(agentRank);
      if (!agent) {
        this.emergencyIntervention(analysis.repositoryUrl, `no_${agentRank}_available`);
        return;
      }

      analysis.currentAgent = agentRank;
      
      // Send analysis request to agent
      const message: MCPMessage = {
        id: `msg_${Date.now()}`,
        method: 'agent.analyze',
        params: {
          repository: analysis.repositoryUrl,
          mode: analysis.mode,
          previousReports: analysis.agentReports
        },
        timestamp: new Date(),
        agentId: agent.id
      };

      const response = await mcpServer.processMessage(message);
      
      if (response.error) {
        this.handleAgentFailure(agent.id, response.error.message);
        continue;
      }

      // Wait for agent report
      await this.waitForAgentReport(agent.id, analysis);
      
      // Judge reviews the report immediately
      this.reviewAgentWork(agent.id, analysis);
    }

    // Issue final verdict
    this.issueFinalVerdict(analysis);
  }

  private async startBattleRoyaleAnalysis(analysis: RepositoryAnalysis) {
    // Battle Royale: All agents work simultaneously
    const agents = mcpServer.getAllAgents().filter(a => a.status !== 'disqualified');
    
    const analysisPromises = agents.map(async (agent) => {
      const message: MCPMessage = {
        id: `msg_${Date.now()}_${agent.id}`,
        method: 'agent.analyze',
        params: {
          repository: analysis.repositoryUrl,
          mode: analysis.mode,
          specialty: agent.rank
        },
        timestamp: new Date(),
        agentId: agent.id
      };

      return mcpServer.processMessage(message);
    });

    // Wait for all agents to complete or timeout
    const responses = await Promise.allSettled(analysisPromises);
    
    // Judge resolves conflicts and makes decisions
    this.resolveConflicts(analysis, responses);
    this.issueFinalVerdict(analysis);
  }

  private async waitForAgentReport(agentId: string, analysis: RepositoryAnalysis): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Agent report timeout'));
      }, 300000); // 5 minutes

      // In a real implementation, this would listen for the agent's report
      // For now, simulate report reception
      setTimeout(() => {
        clearTimeout(timeout);
        resolve();
      }, Math.random() * 30000 + 10000); // 10-40 seconds
    });
  }

  private reviewAgentWork(agentId: string, analysis: RepositoryAnalysis) {
    // Judge reviews work looking for mistakes
    const agent = mcpServer.getAgentStatus(agentId);
    if (!agent) return;

    // Simulate finding mistakes in subordinate work
    const mistakeChance = Math.random();
    if (mistakeChance < 0.3) { // 30% chance of finding mistake
      const mistake = `Missed critical ${['security', 'performance', 'logic'][Math.floor(Math.random() * 3)]} issue`;
      analysis.mistakes.push({
        agentId,
        mistake,
        severity: 'high',
        discoveredBy: 'judge'
      });

      // Issue demotion for significant mistakes
      if (analysis.mistakes.filter(m => m.agentId === agentId).length >= 2) {
        this.issueDemotion(agentId, 'repeated_mistakes', analysis.mistakes.filter(m => m.agentId === agentId));
      }
    }
  }

  private resolveConflicts(analysis: RepositoryAnalysis, responses: PromiseSettledResult<MCPResponse>[]) {
    // Judge resolves conflicts between agents in battle royale mode
    const successfulResponses = responses
      .filter((r): r is PromiseFulfilledResult<MCPResponse> => r.status === 'fulfilled')
      .map(r => r.value);

    // Analyze contradictions and make decisions
    for (let i = 0; i < successfulResponses.length; i++) {
      for (let j = i + 1; j < successfulResponses.length; j++) {
        const contradiction = this.detectContradiction(successfulResponses[i], successfulResponses[j]);
        if (contradiction) {
          // Award points to agent with more evidence
          this.resolveContradiction(contradiction, analysis);
        }
      }
    }
  }

  private detectContradiction(response1: MCPResponse, response2: MCPResponse): any {
    // Simplified contradiction detection
    // In real implementation, this would analyze semantic conflicts
    return Math.random() < 0.2 ? { response1, response2, type: 'assessment_conflict' } : null;
  }

  private resolveContradiction(contradiction: any, analysis: RepositoryAnalysis) {
    // Judge makes the final call on contradictions
    console.log('Judge resolving contradiction in analysis:', analysis.id);
    // Implementation would involve detailed analysis and point awards
  }

  private issueFinalVerdict(analysis: RepositoryAnalysis) {
    // Judge issues final verdict on repository
    const verdict: RepositoryVerdict = {
      repositoryUrl: analysis.repositoryUrl,
      status: this.determineRepositoryStatus(analysis),
      finalDecision: this.determineFinalDecision(analysis),
      confidence: this.calculateConfidence(analysis),
      agentReports: analysis.agentReports,
      judgeNotes: this.generateJudgeNotes(analysis),
      timestamp: new Date()
    };

    this.verdicts.push(verdict);
    this.activeAnalysis.delete(analysis.repositoryUrl);

    // Broadcast verdict to all interested parties
    this.broadcastVerdict(verdict);
  }

  private determineRepositoryStatus(analysis: RepositoryAnalysis): 'green' | 'red' | 'yellow' {
    // Judge's final status determination logic
    const criticalIssues = analysis.agentReports.flatMap(r => r.issues).filter(i => i.severity === 'critical').length;
    const highIssues = analysis.agentReports.flatMap(r => r.issues).filter(i => i.severity === 'high').length;

    if (criticalIssues > 0 || highIssues > 5) return 'red';
    if (highIssues > 2) return 'yellow';
    return 'green';
  }

  private determineFinalDecision(analysis: RepositoryAnalysis): 'salvageable' | 'trash' | 'needs_fixing' | 'excellent' {
    const reports = analysis.agentReports;
    const assessments = reports.map(r => r.assessment);

    // Judge weighs all assessments
    const trashCount = assessments.filter(a => a === 'trash').length;
    const excellentCount = assessments.filter(a => a === 'excellent').length;
    const needsFixingCount = assessments.filter(a => a === 'needs_fixing').length;

    if (trashCount > reports.length / 2) return 'trash';
    if (excellentCount > reports.length / 2) return 'excellent';
    if (needsFixingCount > 0) return 'needs_fixing';
    return 'salvageable';
  }

  private calculateConfidence(analysis: RepositoryAnalysis): number {
    // Judge calculates confidence based on agent agreement
    const reports = analysis.agentReports;
    if (reports.length === 0) return 0;

    const avgConfidence = reports.reduce((sum, r) => sum + r.confidence, 0) / reports.length;
    const mistakePenalty = analysis.mistakes.length * 0.1;
    
    return Math.max(0, Math.min(1, avgConfidence - mistakePenalty));
  }

  private generateJudgeNotes(analysis: RepositoryAnalysis): string {
    const notes = [`Repository analysis completed with ${analysis.agentReports.length} agent reports.`];
    
    if (analysis.mistakes.length > 0) {
      notes.push(`${analysis.mistakes.length} mistakes identified and corrected.`);
    }
    
    return notes.join(' ');
  }

  private broadcastVerdict(verdict: RepositoryVerdict) {
    // Broadcast to UI and any connected systems
    console.log('Judge issued verdict:', verdict);
  }

  private findAgentByRank(rank: string): MCPAgent | null {
    return mcpServer.getAllAgents().find(a => a.rank.toLowerCase() === rank.toLowerCase()) || null;
  }

  private issueDisqualification(agentId: string, reason: string, evidence: any) {
    const decision: JudgeDecision = {
      id: `decision_${Date.now()}`,
      type: 'disqualification',
      agentId,
      reason,
      evidence: [evidence],
      timestamp: new Date(),
      confidence: 1.0
    };

    this.decisions.push(decision);
    console.log(`Judge disqualified agent ${agentId}: ${reason}`);
  }

  private issueDemotion(agentId: string, reason: string, evidence: any) {
    const decision: JudgeDecision = {
      id: `decision_${Date.now()}`,
      type: 'demotion',
      agentId,
      reason,
      evidence: [evidence],
      timestamp: new Date(),
      confidence: 0.9
    };

    this.decisions.push(decision);
    console.log(`Judge demoted agent ${agentId}: ${reason}`);
  }

  private handleAgentFailure(agentId: string, error: string) {
    console.log(`Agent ${agentId} failed: ${error}`);
    // Handle agent failures appropriately
  }

  private emergencyIntervention(repositoryUrl: string, reason: string) {
    console.log(`Judge emergency intervention for ${repositoryUrl}: ${reason}`);
    
    // Activate emergency stop
    mcpServer.activateEmergencyStop();
    
    // Clean up stalled analysis
    this.activeAnalysis.delete(repositoryUrl);
  }

  // Public interface methods
  getActiveAnalyses(): RepositoryAnalysis[] {
    return Array.from(this.activeAnalysis.values());
  }

  getRecentDecisions(limit: number = 10): JudgeDecision[] {
    return this.decisions.slice(-limit);
  }

  getVerdict(repositoryUrl: string): RepositoryVerdict | null {
    return this.verdicts.find(v => v.repositoryUrl === repositoryUrl) || null;
  }

  activateEmergencyStop(): void {
    mcpServer.activateEmergencyStop();
  }

  deactivateEmergencyStop(): void {
    mcpServer.deactivateEmergencyStop();
  }

  stop(): void {
    this.active = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
  }
}

interface RepositoryAnalysis {
  id: string;
  repositoryUrl: string;
  mode: 'normal' | 'urgent';
  status: 'active' | 'completed' | 'failed';
  startTime: Date;
  currentAgent: string;
  agentReports: AgentReport[];
  mistakes: {
    agentId: string;
    mistake: string;
    severity: string;
    discoveredBy: string;
  }[];
}

export const judgeOrchestrator = new JudgeOrchestrator();