/**
 * Real-time Streaming Service for AI Gladiator Battles
 * Provides live feeds for individual agents and orchestrator activities
 */

import { EventEmitter } from 'events';
import { AgentReport, JudgeDecision, RepositoryVerdict } from './judge-orchestrator';

export interface StreamEvent {
  id: string;
  timestamp: Date;
  type: StreamEventType;
  source: string; // 'scout', 'sweeper', 'inspector', 'fixer', 'judge', 'orchestrator'
  data: any;
  battle_id?: string;
  user_id?: string;
}

export type StreamEventType = 
  | 'agent_started'
  | 'agent_analyzing'
  | 'agent_found_issue'
  | 'agent_completed'
  | 'agent_failed'
  | 'judge_decision'
  | 'judge_verdict'
  | 'battle_started'
  | 'battle_ended'
  | 'orchestrator_intervention'
  | 'mcp_communication'
  | 'points_awarded'
  | 'rank_change';

export interface AgentStreamData {
  agentId: string;
  agentRank: string;
  status: 'idle' | 'analyzing' | 'completed' | 'failed' | 'disqualified';
  currentAction?: string;
  progress?: number;
  issues_found?: number;
  current_file?: string;
  memory_usage?: number;
  cpu_usage?: number;
}

export interface JudgeStreamData {
  decision_type: 'promotion' | 'demotion' | 'disqualification' | 'approval' | 'rejection';
  target_agent: string;
  reason: string;
  confidence: number;
  evidence?: any[];
}

export interface OrchestratorStreamData {
  intervention_type: 'emergency_stop' | 'timeout' | 'conflict_resolution' | 'performance_review';
  affected_agents: string[];
  details: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export class StreamingService extends EventEmitter {
  private subscribers: Map<string, Set<WebSocket>> = new Map();
  private eventHistory: Map<string, StreamEvent[]> = new Map();
  private maxHistorySize = 1000;

  constructor() {
    super();
    this.setupDefaultStreams();
  }

  private setupDefaultStreams(): void {
    // Initialize stream channels
    const streamChannels = [
      'scout_stream',
      'sweeper_stream', 
      'inspector_stream',
      'fixer_stream',
      'judge_stream',
      'orchestrator_stream',
      'unified_stream', // All events combined
      'battle_stream'   // Battle-specific events
    ];

    streamChannels.forEach(channel => {
      this.subscribers.set(channel, new Set());
      this.eventHistory.set(channel, []);
    });
  }

  /**
   * Subscribe to a specific stream channel
   */
  subscribe(channel: string, websocket: WebSocket): void {
    if (!this.subscribers.has(channel)) {
      this.subscribers.set(channel, new Set());
      this.eventHistory.set(channel, []);
    }

    this.subscribers.get(channel)!.add(websocket);

    // Send recent history to new subscriber
    const history = this.eventHistory.get(channel) || [];
    const recentEvents = history.slice(-50); // Last 50 events

    websocket.send(JSON.stringify({
      type: 'stream_history',
      channel,
      events: recentEvents,
      timestamp: new Date().toISOString()
    }));

    console.log(`📡 New subscriber to ${channel}. Total: ${this.subscribers.get(channel)!.size}`);
  }

  /**
   * Unsubscribe from a stream channel
   */
  unsubscribe(channel: string, websocket: WebSocket): void {
    const channelSubs = this.subscribers.get(channel);
    if (channelSubs) {
      channelSubs.delete(websocket);
      console.log(`📡 Unsubscribed from ${channel}. Remaining: ${channelSubs.size}`);
    }
  }

  /**
   * Broadcast event to all subscribers of a channel
   */
  private broadcastToChannel(channel: string, event: StreamEvent): void {
    const subscribers = this.subscribers.get(channel);
    if (!subscribers) return;

    const message = JSON.stringify({
      type: 'stream_event',
      channel,
      event,
      timestamp: new Date().toISOString()
    });

    // Send to all subscribers
    subscribers.forEach(ws => {
      try {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(message);
        } else {
          // Clean up dead connections
          subscribers.delete(ws);
        }
      } catch (error) {
        console.error(`Error sending to subscriber:`, error);
        subscribers.delete(ws);
      }
    });

    // Store in history
    const history = this.eventHistory.get(channel) || [];
    history.push(event);
    
    // Trim history if too long
    if (history.length > this.maxHistorySize) {
      history.splice(0, history.length - this.maxHistorySize);
    }
  }

  /**
   * Emit agent-specific events
   */
  emitAgentEvent(agentRank: string, eventType: StreamEventType, data: AgentStreamData, battleId?: string): void {
    const event: StreamEvent = {
      id: `${agentRank}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      type: eventType,
      source: agentRank,
      data,
      battle_id: battleId
    };

    // Broadcast to agent-specific stream
    this.broadcastToChannel(`${agentRank}_stream`, event);
    
    // Also broadcast to unified stream
    this.broadcastToChannel('unified_stream', event);
    
    // If battle-related, also broadcast to battle stream
    if (battleId) {
      this.broadcastToChannel('battle_stream', event);
    }

    this.emit('agent_event', event);
  }

  /**
   * Emit judge-specific events
   */
  emitJudgeEvent(eventType: StreamEventType, data: JudgeStreamData, battleId?: string): void {
    const event: StreamEvent = {
      id: `judge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      type: eventType,
      source: 'judge',
      data,
      battle_id: battleId
    };

    this.broadcastToChannel('judge_stream', event);
    this.broadcastToChannel('unified_stream', event);
    
    if (battleId) {
      this.broadcastToChannel('battle_stream', event);
    }

    this.emit('judge_event', event);
  }

  /**
   * Emit orchestrator-specific events
   */
  emitOrchestratorEvent(eventType: StreamEventType, data: OrchestratorStreamData, battleId?: string): void {
    const event: StreamEvent = {
      id: `orchestrator_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      type: eventType,
      source: 'orchestrator',
      data,
      battle_id: battleId
    };

    this.broadcastToChannel('orchestrator_stream', event);
    this.broadcastToChannel('unified_stream', event);
    
    if (battleId) {
      this.broadcastToChannel('battle_stream', event);
    }

    this.emit('orchestrator_event', event);
  }

  /**
   * Emit battle-wide events
   */
  emitBattleEvent(eventType: StreamEventType, data: any, battleId: string, userId?: string): void {
    const event: StreamEvent = {
      id: `battle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      type: eventType,
      source: 'battle',
      data,
      battle_id: battleId,
      user_id: userId
    };

    this.broadcastToChannel('battle_stream', event);
    this.broadcastToChannel('unified_stream', event);

    this.emit('battle_event', event);
  }

  /**
   * Get real-time metrics for streaming dashboard
   */
  getStreamingMetrics(): {
    total_subscribers: number;
    channels: { [channel: string]: number };
    events_per_second: number;
    uptime: number;
  } {
    const channels: { [channel: string]: number } = {};
    let totalSubscribers = 0;

    this.subscribers.forEach((subs, channel) => {
      channels[channel] = subs.size;
      totalSubscribers += subs.size;
    });

    return {
      total_subscribers: totalSubscribers,
      channels,
      events_per_second: 0, // TODO: Implement rate tracking
      uptime: process.uptime()
    };
  }

  /**
   * Get stream history for a specific channel
   */
  getStreamHistory(channel: string, limit: number = 100): StreamEvent[] {
    const history = this.eventHistory.get(channel) || [];
    return history.slice(-limit);
  }

  /**
   * Create a battle-specific stream channel
   */
  createBattleStream(battleId: string): string {
    const channelName = `battle_${battleId}`;
    this.subscribers.set(channelName, new Set());
    this.eventHistory.set(channelName, []);
    return channelName;
  }

  /**
   * Create user-specific stream channel
   */
  createUserStream(userId: string): string {
    const channelName = `user_${userId}`;
    this.subscribers.set(channelName, new Set());
    this.eventHistory.set(channelName, []);
    return channelName;
  }

  /**
   * Clean up closed connections
   */
  cleanup(): void {
    this.subscribers.forEach((subscribers, channel) => {
      const deadConnections = Array.from(subscribers).filter(
        ws => ws.readyState !== WebSocket.OPEN
      );
      
      deadConnections.forEach(ws => subscribers.delete(ws));
      
      if (deadConnections.length > 0) {
        console.log(`🧹 Cleaned up ${deadConnections.length} dead connections from ${channel}`);
      }
    });
  }

  /**
   * Get active stream channels
   */
  getActiveChannels(): string[] {
    return Array.from(this.subscribers.keys()).filter(
      channel => this.subscribers.get(channel)!.size > 0
    );
  }
}

// Singleton instance
export const streamingService = new StreamingService();

// Set up periodic cleanup
setInterval(() => {
  streamingService.cleanup();
}, 30000); // Clean up every 30 seconds

export default streamingService;