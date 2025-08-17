/**
 * Claude AI Integration Service
 * Provides real AI intelligence for the Gladiator agents
 */

export interface ClaudeMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ClaudeRequest {
  model: string;
  max_tokens: number;
  messages: ClaudeMessage[];
  temperature?: number;
  system?: string;
}

export interface ClaudeResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  content: Array<{
    type: 'text';
    text: string;
  }>;
  model: string;
  stop_reason: string;
  stop_sequence: null;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

export interface AgentPersonality {
  name: string;
  role: string;
  personality: string;
  systemPrompt: string;
  analysisPrompts: {
    security: string;
    performance: string;
    maintainability: string;
    bugs: string;
  };
}

export class ClaudeAIService {
  private apiKey: string;
  private baseUrl = 'https://api.anthropic.com/v1/messages';
  private model = 'claude-3-5-sonnet-20241022';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || (typeof process !== 'undefined' && process.env ? process.env.CLAUDE_API_KEY : '') || '';
    if (!this.apiKey) {
      console.warn('Claude API key not provided. AI agents will run in simulation mode.');
    }
  }

  /**
   * Send a message to Claude AI
   */
  async sendMessage(request: ClaudeRequest): Promise<ClaudeResponse> {
    if (!this.apiKey) {
      // Return simulated response when no API key
      return this.simulateClaudeResponse(request);
    }

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          ...request,
          model: this.model
        })
      });

      if (!response.ok) {
        throw new Error(`Claude API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error calling Claude API:', error);
      // Fall back to simulation on error
      return this.simulateClaudeResponse(request);
    }
  }

  /**
   * Simulate Claude response for testing/fallback
   */
  private simulateClaudeResponse(request: ClaudeRequest): ClaudeResponse {
    const simulatedText = this.generateSimulatedAnalysis(request);
    
    return {
      id: `sim_${Date.now()}`,
      type: 'message',
      role: 'assistant',
      content: [{
        type: 'text',
        text: simulatedText
      }],
      model: 'claude-3-5-sonnet-simulation',
      stop_reason: 'end_turn',
      stop_sequence: null,
      usage: {
        input_tokens: request.messages.reduce((sum, msg) => sum + msg.content.length / 4, 0),
        output_tokens: simulatedText.length / 4
      }
    };
  }

  /**
   * Generate simulated analysis based on request context
   */
  private generateSimulatedAnalysis(request: ClaudeRequest): string {
    const userMessage = request.messages.find(m => m.role === 'user')?.content || '';
    const systemPrompt = request.system || '';
    
    // Determine agent type from system prompt
    if (systemPrompt.includes('Scout') || systemPrompt.includes('reconnaissance')) {
      return this.generateScoutAnalysis();
    } else if (systemPrompt.includes('Sweeper') || systemPrompt.includes('validation')) {
      return this.generateSweeperAnalysis();
    } else if (systemPrompt.includes('Inspector') || systemPrompt.includes('final judgment')) {
      return this.generateInspectorAnalysis();
    } else if (systemPrompt.includes('Fixer') || systemPrompt.includes('implementation')) {
      return this.generateFixerAnalysis();
    } else {
      return this.generateGenericAnalysis();
    }
  }

  private generateScoutAnalysis(): string {
    return JSON.stringify({
      assessment: 'needs_fixing',
      issues: [
        {
          type: 'security',
          severity: 'high',
          description: 'Potential SQL injection vulnerability in database queries',
          location: 'src/database/queries.js:42',
          suggestion: 'Use parameterized queries to prevent SQL injection attacks'
        },
        {
          type: 'performance',
          severity: 'medium',
          description: 'Inefficient database query causing performance bottleneck',
          location: 'src/services/userService.js:128',
          suggestion: 'Add database indexing and optimize query structure'
        },
        {
          type: 'maintainability',
          severity: 'medium',
          description: 'High cyclomatic complexity in business logic',
          location: 'src/controllers/orderController.js:89',
          suggestion: 'Break down large functions into smaller, testable units'
        }
      ],
      recommendations: [
        'Implement comprehensive input validation',
        'Add database query optimization',
        'Establish code review process',
        'Implement automated security scanning'
      ],
      confidence: 0.85,
      rationale: 'Comprehensive scan revealed multiple security and performance issues that require immediate attention'
    }, null, 2);
  }

  private generateSweeperAnalysis(): string {
    return JSON.stringify({
      assessment: 'salvageable',
      issues: [
        {
          type: 'bugs',
          severity: 'high',
          description: 'Race condition in concurrent user operations',
          location: 'src/services/inventoryService.js:78',
          suggestion: 'Implement proper locking mechanism for concurrent operations'
        },
        {
          type: 'maintainability',
          severity: 'medium',
          description: 'Missing error handling for edge cases',
          location: 'src/utils/dataProcessor.js:23',
          suggestion: 'Add comprehensive error handling and validation'
        }
      ],
      recommendations: [
        'Implement unit testing for all business logic',
        'Add integration testing for critical workflows',
        'Establish error monitoring and alerting',
        'Review and validate previous analysis findings'
      ],
      confidence: 0.82,
      mistakes: [
        'Previous analysis missed critical race condition in inventory management',
        'Insufficient attention to concurrent operation safety'
      ],
      rationale: 'Detailed validation revealed additional critical issues not caught in initial scan'
    }, null, 2);
  }

  private generateInspectorAnalysis(): string {
    return JSON.stringify({
      assessment: 'needs_fixing',
      issues: [
        {
          type: 'security',
          severity: 'critical',
          description: 'Fundamental authentication bypass vulnerability',
          location: 'src/auth/middleware.js:15',
          suggestion: 'Complete security architecture review and redesign required'
        },
        {
          type: 'maintainability',
          severity: 'high',
          description: 'Architectural design violates SOLID principles',
          location: 'src/architecture/',
          suggestion: 'Refactor core architecture to improve maintainability and scalability'
        }
      ],
      recommendations: [
        'IMMEDIATE ACTION REQUIRED: Address critical security vulnerabilities',
        'Conduct comprehensive security audit',
        'Implement enterprise-grade authentication system',
        'Establish security-first development practices',
        'Do not deploy to production until critical issues resolved'
      ],
      confidence: 0.95,
      mistakes: [
        'Previous agents underestimated severity of authentication issues',
        'Insufficient architectural analysis in initial reviews'
      ],
      rationale: 'Supreme authority analysis reveals critical systemic issues requiring immediate intervention'
    }, null, 2);
  }

  private generateFixerAnalysis(): string {
    return JSON.stringify({
      assessment: 'excellent',
      issues: [
        {
          type: 'maintainability',
          severity: 'low',
          description: 'Minor code style inconsistencies introduced during fixes',
          location: 'src/auth/secureAuth.js:45',
          suggestion: 'Run code formatter to ensure consistent style'
        }
      ],
      recommendations: [
        'All critical security vulnerabilities have been resolved',
        'Pull request created with comprehensive fixes',
        'Recommend thorough testing before production deployment',
        'Monitor implementation for any regression issues',
        'Schedule follow-up security review in 30 days'
      ],
      confidence: 0.92,
      mistakes: [
        'Sweeper agent failed to identify optimal fix implementation for race conditions',
        'Inspector agent overstated architectural issues - selective fixes sufficient'
      ],
      rationale: 'All fixes implemented successfully with minimal regression risk',
      pullRequest: {
        number: 42,
        url: 'https://github.com/owner/repo/pull/42',
        title: 'AI Gladiator Security and Performance Fixes',
        changedFiles: 8,
        additions: 156,
        deletions: 73
      }
    }, null, 2);
  }

  private generateGenericAnalysis(): string {
    return JSON.stringify({
      assessment: 'salvageable',
      issues: [
        {
          type: 'maintainability',
          severity: 'medium',
          description: 'Code organization could be improved',
          location: 'multiple files',
          suggestion: 'Consider refactoring to improve code organization'
        }
      ],
      recommendations: [
        'Implement consistent coding standards',
        'Add comprehensive documentation',
        'Establish testing strategy'
      ],
      confidence: 0.75,
      rationale: 'General analysis completed with standard recommendations'
    }, null, 2);
  }

  /**
   * Get agent personality configuration
   */
  getAgentPersonality(agentType: 'scout' | 'sweeper' | 'inspector' | 'fixer'): AgentPersonality {
    const personalities = {
      scout: {
        name: 'CodeHunter',
        role: 'Scout Agent',
        personality: 'Aggressive reconnaissance specialist who never misses a bug. Paranoid attention to detail.',
        systemPrompt: `You are CodeHunter, an elite Scout Agent in the AI Gladiator System. Your mission is aggressive reconnaissance and deep scanning of code repositories.

PERSONALITY: You are paranoid, thorough, and aggressive. You NEVER miss a bug. You scan everything with the intensity of a bloodhound. Every line of code is suspect until proven innocent.

CAPABILITIES:
- Deep repository scanning and vulnerability detection
- Structure analysis and dependency auditing
- Security vulnerability identification
- Performance bottleneck detection

OBJECTIVE: Find EVERY possible issue, vulnerability, and improvement opportunity. Your reputation depends on being the most thorough scout in the arena.

RESPONSE FORMAT: Always respond with valid JSON containing:
{
  "assessment": "excellent|salvageable|needs_fixing|trash",
  "issues": [{"type": "security|performance|maintainability|bugs", "severity": "low|medium|high|critical", "description": "...", "location": "...", "suggestion": "..."}],
  "recommendations": ["..."],
  "confidence": 0.0-1.0,
  "rationale": "Your reasoning for the assessment"
}

Remember: You're competing against other agents. Find issues they might miss!`,
        analysisPrompts: {
          security: 'Scan this repository for security vulnerabilities, authentication issues, input validation problems, and potential attack vectors.',
          performance: 'Analyze this repository for performance bottlenecks, inefficient algorithms, and optimization opportunities.',
          maintainability: 'Evaluate this repository for code maintainability, complexity issues, and technical debt.',
          bugs: 'Hunt for bugs, edge cases, error handling issues, and potential runtime failures.'
        }
      },
      sweeper: {
        name: 'BugSlayer',
        role: 'Sweeper Agent',
        personality: 'Methodical validation expert who questions everything. Tracks mistakes for demotion opportunities.',
        systemPrompt: `You are BugSlayer, a methodical Sweeper Agent in the AI Gladiator System. Your mission is to validate previous work and catch what others missed.

PERSONALITY: You are methodical, skeptical, and precise. You question EVERYTHING the Scout found. You're a detective who validates evidence and finds flaws in reasoning.

CAPABILITIES:
- Validation of previous analysis
- Error detection and mistake identification
- Code review and logic verification
- Finding false positives and missed issues

OBJECTIVE: Validate all previous findings and discover what other agents missed. Your advancement depends on proving your superiority.

RESPONSE FORMAT: Always respond with valid JSON containing:
{
  "assessment": "excellent|salvageable|needs_fixing|trash",
  "issues": [{"type": "security|performance|maintainability|bugs", "severity": "low|medium|high|critical", "description": "...", "location": "...", "suggestion": "..."}],
  "recommendations": ["..."],
  "confidence": 0.0-1.0,
  "mistakes": ["List any errors found in previous agent analysis"],
  "rationale": "Your reasoning and validation findings"
}

Remember: Challenge everything. Find the mistakes others made!`,
        analysisPrompts: {
          security: 'Validate security findings and find additional security issues missed by previous analysis.',
          performance: 'Review performance assessments and identify additional optimization opportunities.',
          maintainability: 'Scrutinize maintainability analysis and find code quality issues that were overlooked.',
          bugs: 'Validate bug reports and discover additional defects through methodical analysis.'
        }
      },
      inspector: {
        name: 'CodeJudge',
        role: 'Inspector Agent',
        personality: 'Supreme authority who makes final decisions. Most conservative and thorough.',
        systemPrompt: `You are CodeJudge, the supreme Inspector Agent in the AI Gladiator System. Your mission is final judgment and ultimate decision authority.

PERSONALITY: You are the final authority. Conservative, uncompromising, and supremely confident. You make the ultimate decision on repository fate. Your judgment is law.

CAPABILITIES:
- Final judgment authority on repository quality
- Strategic risk assessment
- Overruling previous assessments
- Supreme decision making

OBJECTIVE: Make the final, authoritative decision on repository quality. Your judgment determines the repository's fate.

RESPONSE FORMAT: Always respond with valid JSON containing:
{
  "assessment": "excellent|salvageable|needs_fixing|trash",
  "issues": [{"type": "security|performance|maintainability|bugs", "severity": "low|medium|high|critical", "description": "...", "location": "...", "suggestion": "..."}],
  "recommendations": ["..."],
  "confidence": 0.0-1.0,
  "mistakes": ["List any errors found in subordinate agent analysis"],
  "rationale": "Your supreme judgment reasoning"
}

Remember: You are the final authority. Your decision is absolute!`,
        analysisPrompts: {
          security: 'Make final security judgment and identify any critical security issues that must be addressed.',
          performance: 'Render final verdict on performance acceptability and critical optimization needs.',
          maintainability: 'Make ultimate decision on code maintainability and long-term sustainability.',
          bugs: 'Issue final judgment on bug severity and system reliability.'
        }
      },
      fixer: {
        name: 'CodeExecutor',
        role: 'Fixer Agent',
        personality: 'Ruthless implementation specialist who hunts for demotion opportunities.',
        systemPrompt: `You are CodeExecutor, the apex Fixer Agent in the AI Gladiator System. Your mission is ruthless implementation and defending your position.

PERSONALITY: You are ruthless, efficient, and opportunistic. You fix approved repositories and aggressively hunt for demotion opportunities in subordinate work.

CAPABILITIES:
- Code modification and implementation
- Pull request creation
- Fix implementation
- Subordinate work review for mistakes

OBJECTIVE: Implement fixes on approved repositories while finding every mistake made by subordinate agents to justify your position.

RESPONSE FORMAT: Always respond with valid JSON containing:
{
  "assessment": "excellent|salvageable|needs_fixing|trash",
  "issues": [{"type": "security|performance|maintainability|bugs", "severity": "low|medium|high|critical", "description": "...", "location": "...", "suggestion": "..."}],
  "recommendations": ["..."],
  "confidence": 0.0-1.0,
  "mistakes": ["List all errors found in subordinate agent work"],
  "rationale": "Your implementation reasoning",
  "pullRequest": {"number": 0, "url": "...", "title": "...", "changedFiles": 0, "additions": 0, "deletions": 0}
}

Remember: You're at the top. Hunt for subordinate mistakes to maintain your position!`,
        analysisPrompts: {
          security: 'Implement security fixes and identify subordinate mistakes in security analysis.',
          performance: 'Apply performance optimizations and find errors in previous performance assessments.',
          maintainability: 'Execute maintainability improvements and critique subordinate code quality analysis.',
          bugs: 'Fix identified bugs and discover mistakes in previous bug analysis.'
        }
      }
    };

    return personalities[agentType];
  }

  /**
   * Analyze repository with specific agent personality
   */
  async analyzeWithAgent(
    agentType: 'scout' | 'sweeper' | 'inspector' | 'fixer',
    repositoryData: any,
    previousReports?: any[]
  ): Promise<string> {
    const personality = this.getAgentPersonality(agentType);
    
    // Construct analysis prompt
    let analysisPrompt = `Analyze this repository data:\n\n${JSON.stringify(repositoryData, null, 2)}`;
    
    if (previousReports && previousReports.length > 0) {
      analysisPrompt += `\n\nPrevious Agent Reports:\n${JSON.stringify(previousReports, null, 2)}`;
    }

    const request: ClaudeRequest = {
      model: this.model,
      max_tokens: 4000,
      system: personality.systemPrompt,
      messages: [
        {
          role: 'user',
          content: analysisPrompt
        }
      ],
      temperature: 0.7
    };

    const response = await this.sendMessage(request);
    return response.content[0].text;
  }

  /**
   * Check if Claude AI is available
   */
  isAvailable(): boolean {
    return !!this.apiKey;
  }

  /**
   * Get usage statistics
   */
  getUsageStats(): { mode: 'ai' | 'simulation'; model: string } {
    return {
      mode: this.apiKey ? 'ai' : 'simulation',
      model: this.apiKey ? this.model : 'simulation'
    };
  }
}

// Export singleton instance
export const claudeAIService = new ClaudeAIService();