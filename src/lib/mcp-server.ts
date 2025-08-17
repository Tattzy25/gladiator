/**
 * MCP (Model Context Protocol) Server Implementation
 * Handles communication between AI agents and the orchestrator
 */

export interface MCPMessage {
  id: string;
  method: string;
  params: Record<string, any>;
  timestamp: Date;
  agentId: string;
}

export interface MCPResponse {
  id: string;
  result?: any;
  error?: {
    code: number;
    message: string;
  };
  timestamp: Date;
}

export interface MCPAgent {
  id: string;
  name: string;
  rank: string;
  status: 'active' | 'idle' | 'analyzing' | 'error' | 'disqualified';
  capabilities: string[];
  lastHeartbeat: Date;
  errorCount: number;
  hallucinationDetected: boolean;
}

export class MCPServer {
  private agents: Map<string, MCPAgent> = new Map();
  private messageQueue: MCPMessage[] = [];
  private handlers: Map<string, (message: MCPMessage) => Promise<MCPResponse>> = new Map();
  private judgeMonitoring: boolean = true;
  private emergencyStop: boolean = false;

  constructor() {
    this.setupDefaultHandlers();
    this.startHeartbeatMonitoring();
  }

  private setupDefaultHandlers() {
    // Agent registration
    this.registerHandler('agent.register', this.handleAgentRegister.bind(this));
    this.registerHandler('agent.heartbeat', this.handleAgentHeartbeat.bind(this));
    this.registerHandler('agent.analyze', this.handleAgentAnalyze.bind(this));
    this.registerHandler('agent.report', this.handleAgentReport.bind(this));
    this.registerHandler('judge.monitor', this.handleJudgeMonitor.bind(this));
    this.registerHandler('emergency.stop', this.handleEmergencyStop.bind(this));
  }

  registerHandler(method: string, handler: (message: MCPMessage) => Promise<MCPResponse>) {
    this.handlers.set(method, handler);
  }

  async processMessage(message: MCPMessage): Promise<MCPResponse> {
    if (this.emergencyStop) {
      return {
        id: message.id,
        error: { code: -1, message: 'Emergency stop activated' },
        timestamp: new Date()
      };
    }

    const handler = this.handlers.get(message.method);
    if (!handler) {
      return {
        id: message.id,
        error: { code: -32601, message: `Method not found: ${message.method}` },
        timestamp: new Date()
      };
    }

    try {
      return await handler(message);
    } catch (error) {
      return {
        id: message.id,
        error: { 
          code: -32603, 
          message: `Internal error: ${error instanceof Error ? error.message : 'Unknown error'}` 
        },
        timestamp: new Date()
      };
    }
  }

  private async handleAgentRegister(message: MCPMessage): Promise<MCPResponse> {
    const { agentId, name, rank, capabilities } = message.params;
    
    const agent: MCPAgent = {
      id: agentId,
      name,
      rank,
      status: 'idle',
      capabilities: capabilities || [],
      lastHeartbeat: new Date(),
      errorCount: 0,
      hallucinationDetected: false
    };

    this.agents.set(agentId, agent);
    
    return {
      id: message.id,
      result: { status: 'registered', agentId },
      timestamp: new Date()
    };
  }

  private async handleAgentHeartbeat(message: MCPMessage): Promise<MCPResponse> {
    const agent = this.agents.get(message.agentId);
    if (!agent) {
      return {
        id: message.id,
        error: { code: -32602, message: 'Agent not registered' },
        timestamp: new Date()
      };
    }

    agent.lastHeartbeat = new Date();
    
    // Check for hallucination indicators in heartbeat
    if (message.params.coherenceScore < 0.7 || message.params.inconsistentResponses > 3) {
      agent.hallucinationDetected = true;
      agent.status = 'disqualified';
      
      return {
        id: message.id,
        result: { status: 'disqualified', reason: 'hallucination_detected' },
        timestamp: new Date()
      };
    }

    return {
      id: message.id,
      result: { status: 'healthy' },
      timestamp: new Date()
    };
  }

  private async handleAgentAnalyze(message: MCPMessage): Promise<MCPResponse> {
    const agent = this.agents.get(message.agentId);
    if (!agent || agent.status === 'disqualified') {
      return {
        id: message.id,
        error: { code: -32602, message: 'Agent not available' },
        timestamp: new Date()
      };
    }

    agent.status = 'analyzing';
    
    return {
      id: message.id,
      result: { 
        status: 'started',
        repository: message.params.repository,
        mode: message.params.mode 
      },
      timestamp: new Date()
    };
  }

  private async handleAgentReport(message: MCPMessage): Promise<MCPResponse> {
    const agent = this.agents.get(message.agentId);
    if (!agent) {
      return {
        id: message.id,
        error: { code: -32602, message: 'Agent not registered' },
        timestamp: new Date()
      };
    }

    agent.status = 'idle';
    
    // Validate report consistency for hallucination detection
    const report = message.params.report;
    if (this.detectHallucination(report)) {
      agent.hallucinationDetected = true;
      agent.status = 'disqualified';
      
      return {
        id: message.id,
        result: { 
          status: 'disqualified', 
          reason: 'hallucination_in_report',
          report: null
        },
        timestamp: new Date()
      };
    }

    return {
      id: message.id,
      result: { 
        status: 'accepted',
        report: report,
        quality_score: this.calculateReportQuality(report)
      },
      timestamp: new Date()
    };
  }

  private async handleJudgeMonitor(message: MCPMessage): Promise<MCPResponse> {
    const activeAgents = Array.from(this.agents.values()).filter(a => a.status !== 'disqualified');
    const suspiciousAgents = activeAgents.filter(a => a.errorCount > 2 || a.hallucinationDetected);
    
    return {
      id: message.id,
      result: {
        activeAgents: activeAgents.length,
        suspiciousAgents: suspiciousAgents.length,
        emergencyStopActive: this.emergencyStop,
        judgeMonitoring: this.judgeMonitoring
      },
      timestamp: new Date()
    };
  }

  private async handleEmergencyStop(message: MCPMessage): Promise<MCPResponse> {
    this.emergencyStop = true;
    
    // Set all agents to idle
    for (const agent of this.agents.values()) {
      if (agent.status === 'analyzing') {
        agent.status = 'idle';
      }
    }

    return {
      id: message.id,
      result: { status: 'emergency_stop_activated' },
      timestamp: new Date()
    };
  }

  private detectHallucination(report: any): boolean {
    // Basic hallucination detection heuristics
    if (!report || typeof report !== 'object') return true;
    
    // Check for nonsensical or contradictory statements
    const text = JSON.stringify(report).toLowerCase();
    const hallucinationIndicators = [
      'impossible',
      'contradictory',
      'makes no sense',
      'undefined behavior in all cases',
      'this file does not exist but also exists'
    ];
    
    return hallucinationIndicators.some(indicator => text.includes(indicator));
  }

  private calculateReportQuality(report: any): number {
    // Simple quality scoring based on report completeness and structure
    let score = 0;
    
    if (report.issues && Array.isArray(report.issues)) score += 0.3;
    if (report.recommendations && Array.isArray(report.recommendations)) score += 0.3;
    if (report.severity && ['low', 'medium', 'high', 'critical'].includes(report.severity)) score += 0.2;
    if (report.confidence && typeof report.confidence === 'number') score += 0.2;
    
    return score;
  }

  private startHeartbeatMonitoring() {
    setInterval(() => {
      const now = new Date();
      for (const [agentId, agent] of this.agents.entries()) {
        const timeSinceHeartbeat = now.getTime() - agent.lastHeartbeat.getTime();
        
        // If no heartbeat for 30 seconds, mark as error
        if (timeSinceHeartbeat > 30000 && agent.status !== 'disqualified') {
          agent.errorCount++;
          
          // Disqualify after 3 consecutive errors
          if (agent.errorCount >= 3) {
            agent.status = 'disqualified';
            console.log(`Agent ${agentId} disqualified due to heartbeat failures`);
          }
        }
      }
    }, 10000); // Check every 10 seconds
  }

  getAgentStatus(agentId: string): MCPAgent | null {
    return this.agents.get(agentId) || null;
  }

  getAllAgents(): MCPAgent[] {
    return Array.from(this.agents.values());
  }

  activateEmergencyStop(): void {
    this.emergencyStop = true;
  }

  deactivateEmergencyStop(): void {
    this.emergencyStop = false;
  }

  isEmergencyStopActive(): boolean {
    return this.emergencyStop;
  }
}

export const mcpServer = new MCPServer();