import React from 'react';
import { io, Socket } from 'socket.io-client';
import { useGladiatorStore } from './store';

class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  connect(url: string = 'ws://localhost:3001') {
    if (this.socket?.connected) {
      return;
    }

    this.socket = io(url, {
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
    });

    this.setupEventListeners();
  }

  private setupEventListeners() {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('🔗 Connected to Gladiator Arena WebSocket');
      this.reconnectAttempts = 0;
      this.joinArena();
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from Arena:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('🚫 Connection error:', error);
      this.handleReconnect();
    });

    // Battle events
    this.socket.on('battle:started', (data) => {
      console.log('⚔️ Battle started:', data);
      const { startBattle } = useGladiatorStore.getState();
      startBattle(data.mode, data.participants, data.repository);
    });

    this.socket.on('battle:ended', (data) => {
      console.log('🏆 Battle ended:', data);
      const { endBattle } = useGladiatorStore.getState();
      endBattle(data.battleId, data.winner);
    });

    this.socket.on('battle:log', (data) => {
      console.log('📝 Battle log:', data);
      const { addBattleLog } = useGladiatorStore.getState();
      addBattleLog(data.battleId, {
        timestamp: new Date(data.timestamp),
        agentId: data.agentId,
        action: data.action,
        details: data.details,
        points: data.points,
      });
    });

    // Agent events
    this.socket.on('agent:status_update', (data) => {
      console.log('🤖 Agent status update:', data);
      const { updateAgentStatus } = useGladiatorStore.getState();
      updateAgentStatus(data.agentId, data.status);
    });

    this.socket.on('agent:points_update', (data) => {
      console.log('💎 Agent points update:', data);
      const { updateAgentPoints } = useGladiatorStore.getState();
      updateAgentPoints(data.agentId, data.points);
    });

    // Arena events
    this.socket.on('arena:spectator_count', (data) => {
      console.log('👥 Spectator count:', data.count);
      // Could update spectator count in store if needed
    });

    this.socket.on('arena:announcement', (data) => {
      console.log('📢 Arena announcement:', data.message);
      // Could show toast notifications for announcements
    });

    // MCP Protocol events
    this.socket.on('mcp:agent_communication', (data) => {
      console.log('🔄 MCP Communication:', data);
      // Handle inter-agent communication
      this.handleMCPCommunication(data);
    });
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`🔄 Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
      
      setTimeout(() => {
        this.socket?.connect();
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error('❌ Max reconnection attempts reached');
    }
  }

  private handleMCPCommunication(data: any) {
    // Handle Model Context Protocol communication between agents
    const { agents } = useGladiatorStore.getState();
    const targetAgent = agents.find(a => a.id === data.targetAgentId);
    
    if (targetAgent) {
      console.log(`📡 MCP: ${data.fromAgent} → ${targetAgent.name}: ${data.message}`);
      
      // Could trigger UI updates or agent behavior changes
      // This is where the MCP protocol would be implemented
    }
  }

  // Public methods for sending events
  joinArena() {
    if (this.socket?.connected) {
      this.socket.emit('arena:join', {
        timestamp: new Date().toISOString(),
        userType: 'spectator'
      });
    }
  }

  startBattle(mode: 'normal' | 'urgent', participants: string[], repository: string) {
    if (this.socket?.connected) {
      this.socket.emit('battle:request_start', {
        mode,
        participants,
        repository,
        timestamp: new Date().toISOString()
      });
    }
  }

  endBattle(battleId: string, winner?: string) {
    if (this.socket?.connected) {
      this.socket.emit('battle:request_end', {
        battleId,
        winner,
        timestamp: new Date().toISOString()
      });
    }
  }

  sendAgentCommand(agentId: string, command: string, params?: any) {
    if (this.socket?.connected) {
      this.socket.emit('agent:command', {
        agentId,
        command,
        params,
        timestamp: new Date().toISOString()
      });
    }
  }

  sendMCPMessage(fromAgentId: string, targetAgentId: string, message: string, context?: any) {
    if (this.socket?.connected) {
      this.socket.emit('mcp:send_message', {
        fromAgentId,
        targetAgentId,
        message,
        context,
        timestamp: new Date().toISOString()
      });
    }
  }

  requestRepositoryAnalysis(repositoryUrl: string, priority: 'normal' | 'urgent' = 'normal') {
    if (this.socket?.connected) {
      this.socket.emit('repository:analyze_request', {
        repositoryUrl,
        priority,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Utility methods
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getConnectionStatus(): 'connected' | 'disconnected' | 'connecting' {
    if (!this.socket) return 'disconnected';
    if (this.socket.connected) return 'connected';
    return 'connecting';
  }
}

// Singleton instance
export const webSocketService = new WebSocketService();

// React hook for WebSocket connection status
export const useWebSocket = () => {
  const [connectionStatus, setConnectionStatus] = React.useState<'connected' | 'disconnected' | 'connecting'>('disconnected');

  React.useEffect(() => {
    const checkStatus = () => {
      setConnectionStatus(webSocketService.getConnectionStatus());
    };

    // Check status every second
    const interval = setInterval(checkStatus, 1000);
    checkStatus(); // Initial check

    return () => clearInterval(interval);
  }, []);

  return {
    connectionStatus,
    isConnected: connectionStatus === 'connected',
    connect: (url?: string) => webSocketService.connect(url),
    disconnect: () => webSocketService.disconnect(),
    sendMessage: webSocketService.sendMCPMessage.bind(webSocketService),
    startBattle: webSocketService.startBattle.bind(webSocketService),
    endBattle: webSocketService.endBattle.bind(webSocketService),
  };
};

export default webSocketService;