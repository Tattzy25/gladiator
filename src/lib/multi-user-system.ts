/**
 * Multi-User Agent Deployment System
 * Allows multiple users to deploy their custom agents and compete in battles
 */

import { EventEmitter } from 'events';
import { streamingService } from './streaming-service';

export interface UserAgent {
  id: string;
  name: string;
  userId: string;
  rank: 'scout' | 'sweeper' | 'inspector' | 'fixer';
  code: string; // User's custom agent code
  status: 'active' | 'inactive' | 'banned' | 'pending_approval';
  performance: AgentPerformance;
  deployment_date: Date;
  last_battle: Date | null;
  wins: number;
  losses: number;
  points: number;
  safety_rating: number; // 0-100, based on code analysis
  approved: boolean;
}

export interface AgentPerformance {
  total_battles: number;
  win_rate: number;
  avg_analysis_time: number;
  issues_found: number;
  false_positives: number;
  crashes: number;
  security_violations: number;
}

export interface User {
  id: string;
  username: string;
  email: string;
  registration_date: Date;
  agents: UserAgent[];
  battle_history: BattleRecord[];
  reputation: number;
  subscription_tier: 'free' | 'premium' | 'pro';
  allowed_agents: number;
  api_key: string;
}

export interface BattleRecord {
  id: string;
  participants: string[]; // Agent IDs
  winner: string | null;
  date: Date;
  mode: 'normal' | 'urgent' | 'tournament';
  repository: string;
  duration: number;
  points_awarded: { [agentId: string]: number };
}

export interface AgentDeploymentRequest {
  userId: string;
  agentName: string;
  agentRank: 'scout' | 'sweeper' | 'inspector' | 'fixer';
  code: string;
  description: string;
}

export interface BattleMatchRequest {
  requesterId: string;
  mode: 'normal' | 'urgent' | 'tournament';
  repository: string;
  max_participants: number;
  entry_fee?: number;
  prize_pool?: number;
}

export class MultiUserAgentSystem extends EventEmitter {
  private users: Map<string, User> = new Map();
  private agents: Map<string, UserAgent> = new Map();
  private battleQueue: BattleMatchRequest[] = [];
  private activeBattles: Map<string, BattleSession> = new Map();
  private codeValidator = new AgentCodeValidator();

  constructor() {
    super();
    this.setupDefaultUsers();
  }

  private setupDefaultUsers(): void {
    // Create some demo users for testing
    const demoUsers = [
      { username: 'codehunter', email: 'hunter@example.com', tier: 'premium' as const },
      { username: 'bugslayer', email: 'slayer@example.com', tier: 'pro' as const },
      { username: 'architech', email: 'architect@example.com', tier: 'free' as const }
    ];

    demoUsers.forEach(demo => {
      const user = this.createUser(demo.username, demo.email, demo.tier);
      console.log(`👤 Created demo user: ${demo.username}`);
    });
  }

  /**
   * User Management
   */
  createUser(username: string, email: string, tier: 'free' | 'premium' | 'pro' = 'free'): User {
    const user: User = {
      id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      username,
      email,
      registration_date: new Date(),
      agents: [],
      battle_history: [],
      reputation: 100, // Starting reputation
      subscription_tier: tier,
      allowed_agents: this.getAgentLimit(tier),
      api_key: this.generateApiKey()
    };

    this.users.set(user.id, user);
    streamingService.createUserStream(user.id);
    
    this.emit('user_registered', user);
    return user;
  }

  private getAgentLimit(tier: 'free' | 'premium' | 'pro'): number {
    switch (tier) {
      case 'free': return 1;
      case 'premium': return 4;
      case 'pro': return 10;
      default: return 1;
    }
  }

  private generateApiKey(): string {
    return `gla_${Math.random().toString(36).substr(2, 32)}`;
  }

  /**
   * Agent Deployment
   */
  async deployAgent(request: AgentDeploymentRequest): Promise<UserAgent> {
    const user = this.users.get(request.userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Check agent limits
    if (user.agents.length >= user.allowed_agents) {
      throw new Error(`Agent limit reached. ${user.subscription_tier} tier allows ${user.allowed_agents} agents.`);
    }

    // Validate agent code
    const validation = await this.codeValidator.validateAgentCode(request.code);
    if (!validation.safe) {
      throw new Error(`Unsafe agent code: ${validation.violations.join(', ')}`);
    }

    // Create new agent
    const agent: UserAgent = {
      id: `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: request.agentName,
      userId: request.userId,
      rank: request.agentRank,
      code: request.code,
      status: validation.requiresApproval ? 'pending_approval' : 'active',
      performance: {
        total_battles: 0,
        win_rate: 0,
        avg_analysis_time: 0,
        issues_found: 0,
        false_positives: 0,
        crashes: 0,
        security_violations: 0
      },
      deployment_date: new Date(),
      last_battle: null,
      wins: 0,
      losses: 0,
      points: 0,
      safety_rating: validation.safetyScore,
      approved: !validation.requiresApproval
    };

    // Add to user and global registry
    user.agents.push(agent);
    this.agents.set(agent.id, agent);

    // Emit deployment event
    this.emit('agent_deployed', { user, agent });
    
    // Stream the deployment
    streamingService.emitBattleEvent('agent_started', {
      agent_id: agent.id,
      agent_name: agent.name,
      user_id: user.id,
      username: user.username,
      rank: agent.rank,
      status: agent.status
    }, 'deployment');

    console.log(`🤖 User ${user.username} deployed agent: ${agent.name} (${agent.rank})`);
    return agent;
  }

  /**
   * Battle Matchmaking
   */
  async createBattleMatch(request: BattleMatchRequest): Promise<string> {
    const requester = this.users.get(request.requesterId);
    if (!requester) {
      throw new Error('User not found');
    }

    // Add to battle queue
    this.battleQueue.push(request);
    
    // Try to find matches
    const battleId = await this.findBattleMatch(request);
    
    this.emit('battle_match_created', { battleId, request });
    return battleId;
  }

  private async findBattleMatch(request: BattleMatchRequest): Promise<string> {
    // Find available agents for battle
    const availableAgents = Array.from(this.agents.values()).filter(agent =>
      agent.status === 'active' &&
      agent.approved &&
      (agent.last_battle === null || 
       new Date().getTime() - agent.last_battle.getTime() > 60000) // 1 minute cooldown
    );

    // Group by rank for fair battles
    const agentsByRank = this.groupAgentsByRank(availableAgents);
    
    // Create battle session
    const battleId = `battle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const participants = this.selectBattleParticipants(agentsByRank, request);

    const battleSession: BattleSession = {
      id: battleId,
      mode: request.mode,
      repository: request.repository,
      participants,
      requester: request.requesterId,
      start_time: new Date(),
      end_time: null,
      status: 'active',
      results: null
    };

    this.activeBattles.set(battleId, battleSession);
    
    // Update agent last battle times
    participants.forEach(agentId => {
      const agent = this.agents.get(agentId);
      if (agent) {
        agent.last_battle = new Date();
      }
    });

    // Start the actual battle
    await this.startUserAgentBattle(battleSession);

    return battleId;
  }

  private groupAgentsByRank(agents: UserAgent[]): { [rank: string]: UserAgent[] } {
    const grouped: { [rank: string]: UserAgent[] } = {
      scout: [],
      sweeper: [],
      inspector: [],
      fixer: []
    };

    agents.forEach(agent => {
      grouped[agent.rank].push(agent);
    });

    return grouped;
  }

  private selectBattleParticipants(agentsByRank: { [rank: string]: UserAgent[] }, request: BattleMatchRequest): string[] {
    const participants: string[] = [];
    
    // Try to get one agent from each rank for balanced battles
    ['scout', 'sweeper', 'inspector', 'fixer'].forEach(rank => {
      const rankAgents = agentsByRank[rank];
      if (rankAgents.length > 0) {
        // Select random agent or use performance-based selection
        const selectedAgent = this.selectBestAvailableAgent(rankAgents);
        if (selectedAgent) {
          participants.push(selectedAgent.id);
        }
      }
    });

    return participants.slice(0, request.max_participants);
  }

  private selectBestAvailableAgent(agents: UserAgent[]): UserAgent | null {
    if (agents.length === 0) return null;
    
    // Sort by performance and select randomly from top performers
    const sortedAgents = agents.sort((a, b) => 
      (b.performance.win_rate * b.points) - (a.performance.win_rate * a.points)
    );

    // Select from top 3 or all if less than 3
    const topAgents = sortedAgents.slice(0, Math.min(3, sortedAgents.length));
    return topAgents[Math.floor(Math.random() * topAgents.length)];
  }

  /**
   * Start a battle between user-deployed agents
   */
  private async startUserAgentBattle(battle: BattleSession): Promise<void> {
    console.log(`⚔️ Starting user agent battle: ${battle.id}`);
    
    // Stream battle start
    streamingService.emitBattleEvent('battle_started', {
      battle_id: battle.id,
      mode: battle.mode,
      repository: battle.repository,
      participants: battle.participants.map(agentId => {
        const agent = this.agents.get(agentId);
        const user = agent ? this.users.get(agent.userId) : null;
        return {
          agent_id: agentId,
          agent_name: agent?.name,
          user_id: agent?.userId,
          username: user?.username,
          rank: agent?.rank
        };
      })
    }, battle.id);

    try {
      // Execute each user agent
      const battleResults = await this.executeUserAgentBattle(battle);
      
      // Process results
      await this.processBattleResults(battle, battleResults);
      
    } catch (error) {
      console.error(`❌ User agent battle failed:`, error);
      this.handleBattleFailure(battle, error);
    }
  }

  private async executeUserAgentBattle(battle: BattleSession): Promise<any[]> {
    const results: any[] = [];

    for (const agentId of battle.participants) {
      const agent = this.agents.get(agentId);
      if (!agent) continue;

      const user = this.users.get(agent.userId);
      if (!user) continue;

      try {
        // Stream agent starting
        streamingService.emitAgentEvent(agent.rank, 'agent_started', {
          agentId: agent.id,
          agentRank: agent.rank,
          status: 'analyzing',
          currentAction: 'Initializing analysis...',
          progress: 0
        }, battle.id);

        // Execute user's custom agent code
        const result = await this.executeUserAgentCode(agent, battle);
        results.push({ agentId, result, status: 'success' });

        // Stream completion
        streamingService.emitAgentEvent(agent.rank, 'agent_completed', {
          agentId: agent.id,
          agentRank: agent.rank,
          status: 'completed',
          progress: 100,
          issues_found: result.issues?.length || 0
        }, battle.id);

      } catch (error) {
        console.error(`Agent ${agent.name} failed:`, error);
        results.push({ agentId, error, status: 'failed' });

        // Update agent performance
        agent.performance.crashes++;
        
        // Stream failure
        streamingService.emitAgentEvent(agent.rank, 'agent_failed', {
          agentId: agent.id,
          agentRank: agent.rank,
          status: 'failed'
        } as any, battle.id);
      }
    }

    return results;
  }

  private async executeUserAgentCode(agent: UserAgent, battle: BattleSession): Promise<any> {
    // This is a simplified execution environment
    // In production, this would run in a secure sandbox
    
    // Simulate agent execution with streaming updates
    const steps = [
      'Connecting to repository...',
      'Analyzing file structure...',
      'Scanning for issues...',
      'Validating findings...',
      'Generating report...'
    ];

    for (let i = 0; i < steps.length; i++) {
      // Stream progress
      streamingService.emitAgentEvent(agent.rank, 'agent_analyzing', {
        agentId: agent.id,
        agentRank: agent.rank,
        status: 'analyzing',
        currentAction: steps[i],
        progress: ((i + 1) / steps.length) * 100
      }, battle.id);

      // Simulate work
      await new Promise(resolve => setTimeout(resolve, Math.random() * 3000 + 1000));
    }

    // Generate mock results based on agent's characteristics
    const mockResult = {
      assessment: ['excellent', 'salvageable', 'needs_fixing', 'trash'][Math.floor(Math.random() * 4)],
      issues: this.generateMockIssues(agent.rank),
      recommendations: [`Fix issue in ${agent.rank} domain`, `Improve ${agent.rank} practices`],
      confidence: Math.random() * 0.4 + 0.6, // 0.6-1.0
      analysis_time: Math.random() * 30000 + 10000 // 10-40 seconds
    };

    return mockResult;
  }

  private generateMockIssues(rank: string): any[] {
    const issueTypes = {
      scout: ['architecture', 'structure', 'dependencies'],
      sweeper: ['code_quality', 'duplication', 'complexity'],
      inspector: ['security', 'performance', 'best_practices'],
      fixer: ['bugs', 'logical_errors', 'edge_cases']
    };

    const types = issueTypes[rank as keyof typeof issueTypes] || ['general'];
    const issueCount = Math.floor(Math.random() * 5) + 1;
    
    return Array.from({ length: issueCount }, (_, i) => ({
      type: types[Math.floor(Math.random() * types.length)],
      severity: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
      description: `Issue ${i + 1} found by ${rank}`,
      location: `file_${i + 1}.js:${Math.floor(Math.random() * 100) + 1}`
    }));
  }

  private async processBattleResults(battle: BattleSession, results: any[]): Promise<void> {
    // Determine winner based on results
    const winner = this.determineBattleWinner(results);
    
    battle.end_time = new Date();
    battle.status = 'completed';
    battle.results = {
      winner,
      results,
      duration: battle.end_time.getTime() - battle.start_time.getTime()
    };

    // Update agent statistics
    results.forEach(({ agentId, result, status }) => {
      const agent = this.agents.get(agentId);
      if (!agent) return;

      agent.performance.total_battles++;
      
      if (status === 'success') {
        if (agentId === winner) {
          agent.wins++;
          agent.points += 100; // Winner bonus
        } else {
          agent.losses++;
          agent.points += 25; // Participation points
        }
        
        agent.performance.issues_found += result.issues?.length || 0;
        agent.performance.avg_analysis_time = 
          (agent.performance.avg_analysis_time + result.analysis_time) / 2;
      } else {
        agent.losses++;
        agent.performance.crashes++;
      }

      agent.performance.win_rate = agent.wins / agent.performance.total_battles;
    });

    // Stream battle end
    streamingService.emitBattleEvent('battle_ended', {
      battle_id: battle.id,
      winner_id: winner,
      duration: battle.results.duration,
      participants_summary: results.map(r => ({
        agent_id: r.agentId,
        status: r.status,
        points_earned: r.agentId === winner ? 100 : 25
      }))
    }, battle.id);

    console.log(`🏆 Battle ${battle.id} completed. Winner: ${winner}`);
  }

  private determineBattleWinner(results: any[]): string | null {
    const successfulResults = results.filter(r => r.status === 'success');
    if (successfulResults.length === 0) return null;

    // Score based on issues found, confidence, and analysis quality
    const scores = successfulResults.map(({ agentId, result }) => ({
      agentId,
      score: (result.issues?.length || 0) * result.confidence * 
             (result.assessment === 'excellent' ? 2 : 
              result.assessment === 'salvageable' ? 1.5 : 
              result.assessment === 'needs_fixing' ? 1 : 0.5)
    }));

    scores.sort((a, b) => b.score - a.score);
    return scores[0]?.agentId || null;
  }

  private handleBattleFailure(battle: BattleSession, error: any): void {
    battle.end_time = new Date();
    battle.status = 'failed';
    
    streamingService.emitBattleEvent('battle_ended', {
      battle_id: battle.id,
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, battle.id);
  }

  /**
   * Public API methods
   */
  getUser(userId: string): User | null {
    return this.users.get(userId) || null;
  }

  getUserByApiKey(apiKey: string): User | null {
    return Array.from(this.users.values()).find(user => user.api_key === apiKey) || null;
  }

  getUserAgents(userId: string): UserAgent[] {
    const user = this.users.get(userId);
    return user ? user.agents : [];
  }

  getActiveBattles(): BattleSession[] {
    return Array.from(this.activeBattles.values());
  }

  getLeaderboard(limit: number = 10): AgentLeaderboardEntry[] {
    const agents = Array.from(this.agents.values())
      .filter(agent => agent.status === 'active' && agent.performance.total_battles > 0)
      .sort((a, b) => b.points - a.points)
      .slice(0, limit);

    return agents.map(agent => {
      const user = this.users.get(agent.userId);
      return {
        rank: 0, // Will be set by index
        agent_id: agent.id,
        agent_name: agent.name,
        user_id: agent.userId,
        username: user?.username || 'Unknown',
        points: agent.points,
        win_rate: agent.performance.win_rate,
        total_battles: agent.performance.total_battles,
        agent_rank: agent.rank
      };
    }).map((entry, index) => ({ ...entry, rank: index + 1 }));
  }
}

/**
 * Agent Code Validator - Security and Safety Checks
 */
class AgentCodeValidator {
  private bannedPatterns = [
    /require\s*\(\s*['"]fs['"]\s*\)/, // File system access
    /require\s*\(\s*['"]child_process['"]\s*\)/, // Process execution
    /require\s*\(\s*['"]net['"]\s*\)/, // Network access
    /eval\s*\(/, // Code evaluation
    /Function\s*\(/, // Dynamic function creation
    /process\.exit/, // Process control
    /while\s*\(\s*true\s*\)/, // Infinite loops
    /setInterval/, // Long-running timers
    /setTimeout.*[0-9]{6,}/, // Very long timeouts
  ];

  async validateAgentCode(code: string): Promise<{
    safe: boolean;
    safetyScore: number;
    violations: string[];
    requiresApproval: boolean;
  }> {
    const violations: string[] = [];
    let safetyScore = 100;

    // Check for banned patterns
    this.bannedPatterns.forEach(pattern => {
      if (pattern.test(code)) {
        violations.push(`Banned pattern detected: ${pattern.source}`);
        safetyScore -= 20;
      }
    });

    // Check code length (prevent extremely long code)
    if (code.length > 50000) {
      violations.push('Code too long (max 50KB)');
      safetyScore -= 10;
    }

    // Check for suspicious strings
    const suspiciousStrings = ['hack', 'exploit', 'backdoor', 'malware'];
    suspiciousStrings.forEach(str => {
      if (code.toLowerCase().includes(str)) {
        violations.push(`Suspicious content: ${str}`);
        safetyScore -= 5;
      }
    });

    const safe = violations.length === 0;
    const requiresApproval = safetyScore < 80;

    return {
      safe,
      safetyScore: Math.max(0, safetyScore),
      violations,
      requiresApproval
    };
  }
}

interface BattleSession {
  id: string;
  mode: 'normal' | 'urgent' | 'tournament';
  repository: string;
  participants: string[]; // Agent IDs
  requester: string; // User ID
  start_time: Date;
  end_time: Date | null;
  status: 'active' | 'completed' | 'failed';
  results: {
    winner: string | null;
    results: any[];
    duration: number;
  } | null;
}

interface AgentLeaderboardEntry {
  rank: number;
  agent_id: string;
  agent_name: string;
  user_id: string;
  username: string;
  points: number;
  win_rate: number;
  total_battles: number;
  agent_rank: string;
}

// Singleton instance
export const multiUserSystem = new MultiUserAgentSystem();

export default multiUserSystem;