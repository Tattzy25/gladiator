/**
 * Gladiator System Main Orchestrator
 * Connects all components and manages the complete system lifecycle
 */

import { mcpServer, MCPServer } from './mcp-server';
import { judgeOrchestrator, JudgeOrchestrator } from './judge-orchestrator';
import { initializeAllAgents, BaseAgent, AnalysisContext } from './agents';
import { gitHubService, GitHubService, RepositoryAnalysis } from './github-service';

export interface SystemConfiguration {
  githubToken?: string;
  enableEmergencyStop: boolean;
  maxConcurrentAnalyses: number;
  agentTimeoutMinutes: number;
  judgeMonitoringIntervalSeconds: number;
  autoPromotionEnabled: boolean;
  autoDemotionEnabled: boolean;
}

export interface SystemStatus {
  isActive: boolean;
  emergencyStopActive: boolean;
  activeAgents: number;
  disqualifiedAgents: number;
  activeAnalyses: number;
  completedAnalyses: number;
  uptime: number;
  lastError?: string;
}

export interface AnalysisRequest {
  repositoryUrl: string;
  mode: 'normal' | 'urgent';
  priority: 'low' | 'medium' | 'high' | 'critical';
  requestedBy: string;
  maxTimeMinutes?: number;
}

export interface AnalysisResult {
  id: string;
  repositoryUrl: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'emergency_stopped';
  mode: 'normal' | 'urgent';
  startTime: Date;
  endTime?: Date;
  verdict?: any;
  agentReports: any[];
  judgeDecisions: any[];
  emergencyStops: number;
  errors: string[];
}

export class GladiatorSystem {
  private config: SystemConfiguration;
  private agents: BaseAgent[] = [];
  private mcpServer: MCPServer;
  private judge: JudgeOrchestrator;
  private githubService: GitHubService;
  private isInitialized: boolean = false;
  private isActive: boolean = false;
  private startTime: Date = new Date();
  private analysisResults: Map<string, AnalysisResult> = new Map();
  private analysisQueue: AnalysisRequest[] = [];
  private processingQueue: boolean = false;

  constructor(config: SystemConfiguration) {
    this.config = config;
    this.mcpServer = mcpServer;
    this.judge = judgeOrchestrator;
    this.githubService = gitHubService;
  }

  /**
   * Initialize the complete Gladiator System
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      throw new Error('System is already initialized');
    }

    try {
      console.log('🏛️ Initializing AI Gladiator System...');

      // Initialize all agents
      console.log('⚔️ Deploying gladiator agents...');
      this.agents = await initializeAllAgents();
      console.log(`✅ ${this.agents.length} agents deployed and ready for battle`);

      // Verify GitHub access if token provided
      if (this.config.githubToken) {
        console.log('🔗 Verifying GitHub integration...');
        // Test GitHub access with a simple API call
        // await this.githubService.validateRepository('github/github'); // Use a known public repo for testing
        console.log('✅ GitHub integration verified');
      } else {
        console.log('⚠️ GitHub token not provided - repository analysis will be limited');
      }

      // Start the analysis queue processor
      this.startQueueProcessor();

      this.isInitialized = true;
      this.isActive = true;
      this.startTime = new Date();

      console.log('🏟️ AI Gladiator System is ACTIVE and ready to battle!');
      console.log('🧠 Judge is monitoring all agents continuously...');
      console.log('⚡ Emergency stop controls are armed and ready...');

    } catch (error) {
      console.error('❌ Failed to initialize Gladiator System:', error);
      throw error;
    }
  }

  /**
   * Submit a repository for analysis
   */
  async analyzeRepository(request: AnalysisRequest): Promise<string> {
    if (!this.isActive) {
      throw new Error('System is not active');
    }

    // Validate repository URL
    const repoInfo = await this.githubService.validateRepository(request.repositoryUrl);
    if (!repoInfo) {
      throw new Error('Invalid or inaccessible repository');
    }

    // Create analysis ID
    const analysisId = `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create analysis result tracking
    const analysisResult: AnalysisResult = {
      id: analysisId,
      repositoryUrl: request.repositoryUrl,
      status: 'pending',
      mode: request.mode,
      startTime: new Date(),
      agentReports: [],
      judgeDecisions: [],
      emergencyStops: 0,
      errors: []
    };

    this.analysisResults.set(analysisId, analysisResult);

    // Add to queue
    this.analysisQueue.push(request);

    console.log(`📊 Repository queued for analysis: ${request.repositoryUrl} (${request.mode} mode)`);
    
    return analysisId;
  }

  /**
   * Start processing the analysis queue
   */
  private startQueueProcessor(): void {
    setInterval(async () => {
      if (!this.isActive || this.processingQueue || this.analysisQueue.length === 0) {
        return;
      }

      // Check if we're at max concurrent analyses
      const activeAnalyses = Array.from(this.analysisResults.values())
        .filter(r => r.status === 'in_progress').length;

      if (activeAnalyses >= this.config.maxConcurrentAnalyses) {
        return;
      }

      // Process next request
      const request = this.analysisQueue.shift();
      if (request) {
        this.processAnalysisRequest(request).catch(error => {
          console.error('Error processing analysis request:', error);
        });
      }
    }, 5000); // Check every 5 seconds
  }

  /**
   * Process a single analysis request
   */
  private async processAnalysisRequest(request: AnalysisRequest): Promise<void> {
    this.processingQueue = true;

    try {
      console.log(`🏟️ Starting ${request.mode.toUpperCase()} mode analysis: ${request.repositoryUrl}`);

      // Find analysis result
      const analysisResult = Array.from(this.analysisResults.values())
        .find(r => r.repositoryUrl === request.repositoryUrl && r.status === 'pending');

      if (!analysisResult) {
        throw new Error('Analysis result not found');
      }

      analysisResult.status = 'in_progress';

      // Initiate analysis through judge orchestrator
      await this.judge.initiateRepositoryAnalysis(request.repositoryUrl, request.mode);

      // Monitor analysis progress
      await this.monitorAnalysis(analysisResult, request);

    } catch (error) {
      console.error(`❌ Analysis failed for ${request.repositoryUrl}:`, error);
      // Update analysis result with error
      const analysisResult = Array.from(this.analysisResults.values())
        .find(r => r.repositoryUrl === request.repositoryUrl);
      if (analysisResult) {
        analysisResult.status = 'failed';
        analysisResult.errors.push(error instanceof Error ? error.message : 'Unknown error');
        analysisResult.endTime = new Date();
      }
    } finally {
      this.processingQueue = false;
    }
  }

  /**
   * Monitor analysis progress and handle timeouts
   */
  private async monitorAnalysis(analysisResult: AnalysisResult, request: AnalysisRequest): Promise<void> {
    const maxTime = (request.maxTimeMinutes || this.config.agentTimeoutMinutes) * 60 * 1000;
    const startTime = Date.now();

    return new Promise<void>((resolve, reject) => {
      const monitorInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;

        // Check for timeout
        if (elapsed > maxTime) {
          clearInterval(monitorInterval);
          console.log(`⏰ Analysis timeout for ${request.repositoryUrl}`);
          
          // Trigger emergency intervention
          this.handleAnalysisTimeout(analysisResult);
          reject(new Error('Analysis timeout'));
          return;
        }

        // Check if analysis is complete
        const verdict = this.judge.getVerdict(request.repositoryUrl);
        if (verdict) {
          clearInterval(monitorInterval);
          
          // Analysis completed successfully
          analysisResult.status = 'completed';
          analysisResult.endTime = new Date();
          analysisResult.verdict = verdict;
          
          console.log(`✅ Analysis completed for ${request.repositoryUrl}: ${verdict.finalDecision}`);
          resolve();
          return;
        }

        // Check for emergency stop
        if (this.mcpServer.isEmergencyStopActive()) {
          clearInterval(monitorInterval);
          
          analysisResult.status = 'emergency_stopped';
          analysisResult.emergencyStops++;
          analysisResult.endTime = new Date();
          
          console.log(`🚨 Emergency stop activated during analysis of ${request.repositoryUrl}`);
          resolve(); // Don't reject on emergency stop
          return;
        }

      }, 10000); // Check every 10 seconds
    });
  }

  /**
   * Handle analysis timeout by activating emergency procedures
   */
  private handleAnalysisTimeout(analysisResult: AnalysisResult): void {
    console.log(`🚨 Emergency intervention: Analysis timeout for ${analysisResult.repositoryUrl}`);
    
    // Activate emergency stop
    this.activateEmergencyStop();
    
    // Update analysis result
    analysisResult.status = 'emergency_stopped';
    analysisResult.emergencyStops++;
    analysisResult.errors.push('Analysis timeout - emergency stop activated');
    analysisResult.endTime = new Date();
  }

  /**
   * Activate emergency stop - halt all agent activities immediately
   */
  activateEmergencyStop(): void {
    console.log('🚨 EMERGENCY STOP ACTIVATED - All agent activities halted');
    
    this.mcpServer.activateEmergencyStop();
    
    // Stop all agents
    for (const agent of this.agents) {
      agent.stop();
    }

    // Mark all active analyses as emergency stopped
    for (const analysis of this.analysisResults.values()) {
      if (analysis.status === 'in_progress') {
        analysis.status = 'emergency_stopped';
        analysis.emergencyStops++;
        analysis.endTime = new Date();
      }
    }
  }

  /**
   * Deactivate emergency stop and resume operations
   */
  async deactivateEmergencyStop(): Promise<void> {
    console.log('✅ Emergency stop deactivated - Resuming operations');
    
    this.mcpServer.deactivateEmergencyStop();
    
    // Reinitialize agents
    try {
      this.agents = await initializeAllAgents();
      console.log('⚔️ Agents redeployed and ready for battle');
    } catch (error) {
      console.error('Failed to reinitialize agents:', error);
      throw error;
    }
  }

  /**
   * Get system status
   */
  getSystemStatus(): SystemStatus {
    const allAgents = this.mcpServer.getAllAgents();
    const activeAgents = allAgents.filter(a => a.status !== 'disqualified').length;
    const disqualifiedAgents = allAgents.filter(a => a.status === 'disqualified').length;
    
    const activeAnalyses = Array.from(this.analysisResults.values())
      .filter(r => r.status === 'in_progress').length;
    
    const completedAnalyses = Array.from(this.analysisResults.values())
      .filter(r => r.status === 'completed').length;

    return {
      isActive: this.isActive,
      emergencyStopActive: this.mcpServer.isEmergencyStopActive(),
      activeAgents,
      disqualifiedAgents,
      activeAnalyses,
      completedAnalyses,
      uptime: Date.now() - this.startTime.getTime()
    };
  }

  /**
   * Get analysis result by ID
   */
  getAnalysisResult(analysisId: string): AnalysisResult | null {
    return this.analysisResults.get(analysisId) || null;
  }

  /**
   * Get all analysis results
   */
  getAllAnalysisResults(): AnalysisResult[] {
    return Array.from(this.analysisResults.values());
  }

  /**
   * Get recent judge decisions
   */
  getRecentJudgeDecisions(limit: number = 10): any[] {
    return this.judge.getRecentDecisions(limit);
  }

  /**
   * Get active analyses being monitored by the judge
   */
  getActiveAnalyses(): any[] {
    return this.judge.getActiveAnalyses();
  }

  /**
   * Shutdown the system gracefully
   */
  async shutdown(): Promise<void> {
    console.log('🏛️ Shutting down AI Gladiator System...');
    
    this.isActive = false;
    
    // Stop all agents
    for (const agent of this.agents) {
      agent.stop();
    }
    
    // Stop judge monitoring
    this.judge.stop();
    
    console.log('✅ AI Gladiator System shutdown complete');
  }

  /**
   * Get repository analysis statistics
   */
  getAnalysisStatistics(): any {
    const results = Array.from(this.analysisResults.values());
    
    return {
      total: results.length,
      completed: results.filter(r => r.status === 'completed').length,
      failed: results.filter(r => r.status === 'failed').length,
      emergencyStops: results.reduce((sum, r) => sum + r.emergencyStops, 0),
      averageTime: this.calculateAverageAnalysisTime(results),
      verdictBreakdown: this.getVerdictBreakdown(results)
    };
  }

  private calculateAverageAnalysisTime(results: AnalysisResult[]): number {
    const completedResults = results.filter(r => r.status === 'completed' && r.endTime);
    if (completedResults.length === 0) return 0;
    
    const totalTime = completedResults.reduce((sum, r) => {
      return sum + (r.endTime!.getTime() - r.startTime.getTime());
    }, 0);
    
    return totalTime / completedResults.length;
  }

  private getVerdictBreakdown(results: AnalysisResult[]): Record<string, number> {
    const breakdown: Record<string, number> = {
      excellent: 0,
      salvageable: 0,
      needs_fixing: 0,
      trash: 0
    };
    
    results.forEach(r => {
      if (r.verdict && r.verdict.finalDecision) {
        breakdown[r.verdict.finalDecision] = (breakdown[r.verdict.finalDecision] || 0) + 1;
      }
    });
    
    return breakdown;
  }
}

// System factory function
export function createGladiatorSystem(config?: Partial<SystemConfiguration>): GladiatorSystem {
  const defaultConfig: SystemConfiguration = {
    enableEmergencyStop: true,
    maxConcurrentAnalyses: 3,
    agentTimeoutMinutes: 10,
    judgeMonitoringIntervalSeconds: 5,
    autoPromotionEnabled: true,
    autoDemotionEnabled: true
  };

  const finalConfig = { ...defaultConfig, ...config };
  return new GladiatorSystem(finalConfig);
}