import { Server } from 'socket.io';
import { createServer } from 'http';
import express from 'express';
import cors from 'cors';
import { WebSocket } from 'ws';

const app = express();
const server = createServer(app);

// Configure CORS for Socket.IO
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // Vite dev server
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Middleware
app.use(cors());
app.use(express.json());

// In-memory storage for active battles and spectators
const activeBattles = new Map();
const spectators = new Set();
const agentConnections = new Map();

// Streaming service for real-time agent feeds
const streamSubscribers = new Map(); // channel -> Set<socket>
const streamHistory = new Map(); // channel -> events[]

// Initialize streaming channels
const streamChannels = [
  'scout_stream',
  'sweeper_stream', 
  'inspector_stream',
  'fixer_stream',
  'judge_stream',
  'orchestrator_stream',
  'unified_stream',
  'battle_stream'
];

streamChannels.forEach(channel => {
  streamSubscribers.set(channel, new Set());
  streamHistory.set(channel, []);
});

// Multi-user system state
const users = new Map();
const userAgents = new Map();
const battleQueue = [];

// Gladiator Arena WebSocket Events
io.on('connection', (socket) => {
  console.log(`🔗 New connection: ${socket.id}`);
  
  // Arena Events
  socket.on('arena:join', (data) => {
    console.log(`👥 ${socket.id} joined arena as ${data.userType}`);
    
    if (data.userType === 'spectator') {
      spectators.add(socket.id);
      socket.join('spectators');
      
      // Send current arena status
      socket.emit('arena:status', {
        activeBattles: Array.from(activeBattles.values()),
        spectatorCount: spectators.size,
        timestamp: new Date().toISOString()
      });
    } else if (data.userType === 'agent') {
      agentConnections.set(data.agentId, socket.id);
      socket.join('agents');
    } else if (data.userType === 'user') {
      // Handle user connections for multi-user system
      socket.join('users');
      if (data.userId) {
        socket.join(`user_${data.userId}`);
      }
    }
    
    // Broadcast spectator count update
    io.to('spectators').emit('arena:spectator_count', {
      count: spectators.size
    });
  });

  // Real-time Streaming Events
  socket.on('stream:subscribe', (data) => {
    const { channel } = data;
    console.log(`📡 ${socket.id} subscribing to ${channel}`);
    
    if (!streamSubscribers.has(channel)) {
      streamSubscribers.set(channel, new Set());
      streamHistory.set(channel, []);
    }
    
    streamSubscribers.get(channel).add(socket);
    socket.join(`stream_${channel}`);
    
    // Send recent history
    const history = streamHistory.get(channel) || [];
    const recentEvents = history.slice(-50);
    
    socket.emit('stream:history', {
      channel,
      events: recentEvents,
      timestamp: new Date().toISOString()
    });
    
    // Broadcast subscriber count
    io.to(`stream_${channel}`).emit('stream:subscriber_count', {
      channel,
      count: streamSubscribers.get(channel).size
    });
  });

  socket.on('stream:unsubscribe', (data) => {
    const { channel } = data;
    console.log(`📡 ${socket.id} unsubscribing from ${channel}`);
    
    const subscribers = streamSubscribers.get(channel);
    if (subscribers) {
      subscribers.delete(socket);
      socket.leave(`stream_${channel}`);
      
      io.to(`stream_${channel}`).emit('stream:subscriber_count', {
        channel,
        count: subscribers.size
      });
    }
  });

  // Multi-user Agent Deployment Events
  socket.on('user:register', (data) => {
    console.log(`👤 User registration request:`, data);
    
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const user = {
      id: userId,
      username: data.username,
      email: data.email,
      registration_date: new Date().toISOString(),
      agents: [],
      battle_history: [],
      reputation: 100,
      subscription_tier: data.tier || 'free',
      api_key: `gla_${Math.random().toString(36).substr(2, 32)}`
    };
    
    users.set(userId, user);
    
    socket.emit('user:registered', {
      success: true,
      user: {
        id: user.id,
        username: user.username,
        tier: user.subscription_tier,
        api_key: user.api_key
      }
    });
    
    console.log(`✅ User registered: ${data.username}`);
  });

  socket.on('agent:deploy', (data) => {
    console.log(`🤖 Agent deployment request:`, data);
    
    const user = users.get(data.userId);
    if (!user) {
      socket.emit('agent:deploy_error', { error: 'User not found' });
      return;
    }
    
    // Basic validation
    if (user.agents.length >= getAgentLimit(user.subscription_tier)) {
      socket.emit('agent:deploy_error', { 
        error: `Agent limit reached for ${user.subscription_tier} tier` 
      });
      return;
    }
    
    const agentId = `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const agent = {
      id: agentId,
      name: data.agentName,
      userId: data.userId,
      rank: data.agentRank,
      code: data.code || '// Default agent code',
      status: 'active',
      deployment_date: new Date().toISOString(),
      wins: 0,
      losses: 0,
      points: 0,
      performance: {
        total_battles: 0,
        win_rate: 0,
        issues_found: 0
      }
    };
    
    user.agents.push(agent);
    userAgents.set(agentId, agent);
    
    socket.emit('agent:deployed', { success: true, agent });
    
    // Broadcast to all users
    io.to('users').emit('agent:new_deployment', {
      agent_id: agentId,
      agent_name: agent.name,
      username: user.username,
      rank: agent.rank
    });
    
    // Stream the deployment
    broadcastStreamEvent('unified_stream', {
      id: `deploy_${agentId}`,
      timestamp: new Date().toISOString(),
      type: 'agent_deployed',
      source: 'system',
      data: {
        agent_id: agentId,
        agent_name: agent.name,
        username: user.username,
        rank: agent.rank
      }
    });
    
    console.log(`✅ Agent deployed: ${agent.name} by ${user.username}`);
  });

  socket.on('battle:create_match', (data) => {
    console.log(`⚔️ Battle match creation request:`, data);
    
    const battleId = `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const battleMatch = {
      id: battleId,
      mode: data.mode || 'normal',
      repository: data.repository,
      requester: data.userId,
      max_participants: data.max_participants || 4,
      participants: [],
      status: 'waiting',
      created: new Date().toISOString()
    };
    
    battleQueue.push(battleMatch);
    
    // Try to find participants
    const availableAgents = Array.from(userAgents.values()).filter(agent => 
      agent.status === 'active' && 
      !battleMatch.participants.includes(agent.id)
    );
    
    // Select participants (simplified selection)
    const participants = availableAgents.slice(0, battleMatch.max_participants);
    battleMatch.participants = participants.map(a => a.id);
    
    if (participants.length >= 2) {
      battleMatch.status = 'ready';
      startUserBattle(battleMatch);
    }
    
    socket.emit('battle:match_created', {
      success: true,
      battle_id: battleId,
      participants: participants.length,
      status: battleMatch.status
    });
  });

  // Battle Management Events
  socket.on('battle:request_start', (data) => {
    console.log(`⚔️ Battle start requested:`, data);
    
    const battleId = `battle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const battle = {
      id: battleId,
      mode: data.mode,
      participants: data.participants,
      repository: data.repository,
      status: 'active',
      startTime: new Date().toISOString(),
      logs: []
    };
    
    activeBattles.set(battleId, battle);
    
    // Notify all spectators and participants
    io.to('spectators').emit('battle:started', battle);
    io.to('agents').emit('battle:started', battle);
    
    // Send arena announcement
    io.to('spectators').emit('arena:announcement', {
      message: `🏟️ New ${data.mode.toUpperCase()} battle has begun! ${data.participants.length} gladiators enter the arena!`,
      type: 'battle_start',
      timestamp: new Date().toISOString()
    });
    
    // Start simulated battle events
    startBattleSimulation(battleId, battle);
  });

  socket.on('battle:request_end', (data) => {
    console.log(`🏆 Battle end requested:`, data);
    
    const battle = activeBattles.get(data.battleId);
    if (battle) {
      battle.status = 'completed';
      battle.endTime = new Date().toISOString();
      battle.winner = data.winner;
      
      // Notify all clients
      io.to('spectators').emit('battle:ended', battle);
      io.to('agents').emit('battle:ended', battle);
      
      // Send victory announcement
      io.to('spectators').emit('arena:announcement', {
        message: `🎉 Victory! The battle has concluded with a champion!`,
        type: 'battle_end',
        timestamp: new Date().toISOString()
      });
      
      // Remove from active battles after a delay
      setTimeout(() => {
        activeBattles.delete(data.battleId);
      }, 30000); // Keep for 30 seconds for final viewing
    }
  });

  // Agent Communication Events
  socket.on('agent:command', (data) => {
    console.log(`🤖 Agent command:`, data);
    
    // Forward command to specific agent if connected
    const targetSocketId = agentConnections.get(data.agentId);
    if (targetSocketId) {
      io.to(targetSocketId).emit('agent:command_received', data);
    }
    
    // Log the command in active battles
    activeBattles.forEach((battle) => {
      if (battle.participants.includes(data.agentId) && battle.status === 'active') {
        const logEntry = {
          timestamp: new Date().toISOString(),
          agentId: data.agentId,
          action: 'command',
          details: `Executed: ${data.command}`,
          points: Math.floor(Math.random() * 5) + 1
        };
        
        battle.logs.push(logEntry);
        io.to('spectators').emit('battle:log', {
          battleId: battle.id,
          ...logEntry
        });
      }
    });
  });

  // MCP Protocol Events
  socket.on('mcp:send_message', (data) => {
    console.log(`📡 MCP Message:`, data);
    
    // Forward MCP message to target agent
    const targetSocketId = agentConnections.get(data.targetAgentId);
    if (targetSocketId) {
      io.to(targetSocketId).emit('mcp:agent_communication', {
        fromAgent: data.fromAgentId,
        targetAgentId: data.targetAgentId,
        message: data.message,
        context: data.context,
        timestamp: data.timestamp
      });
    }
    
    // Broadcast to spectators for entertainment
    io.to('spectators').emit('mcp:agent_communication', {
      fromAgent: data.fromAgentId,
      targetAgentId: data.targetAgentId,
      message: data.message,
      timestamp: data.timestamp
    });
  });

  // Repository Analysis Events
  socket.on('repository:analyze_request', (data) => {
    console.log(`📊 Repository analysis requested:`, data);
    
    // Simulate repository analysis trigger
    io.to('agents').emit('repository:analyze_start', {
      repositoryUrl: data.repositoryUrl,
      priority: data.priority,
      requestId: `req_${Date.now()}`,
      timestamp: data.timestamp
    });
    
    // Notify spectators
    io.to('spectators').emit('arena:announcement', {
      message: `🔍 New repository queued for gladiator analysis: ${data.repositoryUrl}`,
      type: 'analysis_request',
      timestamp: new Date().toISOString()
    });
  });

  // Disconnect handling
  socket.on('disconnect', (reason) => {
    console.log(`❌ ${socket.id} disconnected: ${reason}`);
    
    // Clean up spectators
    if (spectators.has(socket.id)) {
      spectators.delete(socket.id);
      io.to('spectators').emit('arena:spectator_count', {
        count: spectators.size
      });
    }
    
    // Clean up agent connections
    for (const [agentId, socketId] of agentConnections.entries()) {
      if (socketId === socket.id) {
        agentConnections.delete(agentId);
        
        // Notify about agent disconnection
        io.to('spectators').emit('agent:status_update', {
          agentId,
          status: 'offline',
          timestamp: new Date().toISOString()
        });
        break;
      }
    }
    
    // Clean up stream subscriptions
    streamSubscribers.forEach((subscribers, channel) => {
      if (subscribers.has(socket)) {
        subscribers.delete(socket);
        io.to(`stream_${channel}`).emit('stream:subscriber_count', {
          channel,
          count: subscribers.size
        });
      }
    });
  });
});

// Helper Functions
function getAgentLimit(tier) {
  switch (tier) {
    case 'free': return 1;
    case 'premium': return 4;
    case 'pro': return 10;
    default: return 1;
  }
}

function broadcastStreamEvent(channel, event) {
  const subscribers = streamSubscribers.get(channel);
  if (!subscribers) return;
  
  const message = JSON.stringify({
    type: 'stream_event',
    channel,
    event,
    timestamp: new Date().toISOString()
  });
  
  // Send to Socket.IO subscribers
  io.to(`stream_${channel}`).emit('stream:event', event);
  
  // Store in history
  const history = streamHistory.get(channel) || [];
  history.push(event);
  
  // Trim history if too long
  if (history.length > 1000) {
    history.splice(0, history.length - 1000);
  }
}

function startUserBattle(battleMatch) {
  console.log(`🚀 Starting user battle: ${battleMatch.id}`);
  
  activeBattles.set(battleMatch.id, battleMatch);
  
  // Broadcast battle start
  io.to('spectators').emit('battle:started', battleMatch);
  io.to('users').emit('battle:started', battleMatch);
  
  // Stream battle start
  broadcastStreamEvent('battle_stream', {
    id: `battle_start_${battleMatch.id}`,
    timestamp: new Date().toISOString(),
    type: 'battle_started',
    source: 'battle',
    data: {
      battle_id: battleMatch.id,
      mode: battleMatch.mode,
      repository: battleMatch.repository,
      participants: battleMatch.participants.map(agentId => {
        const agent = userAgents.get(agentId);
        const user = agent ? users.get(agent.userId) : null;
        return {
          agent_id: agentId,
          agent_name: agent?.name,
          username: user?.username,
          rank: agent?.rank
        };
      })
    },
    battle_id: battleMatch.id
  });
  
  // Simulate battle execution
  simulateUserBattle(battleMatch);
}

function simulateUserBattle(battleMatch) {
  const battleEvents = [
    'Agents connecting to repository...',
    'Initializing analysis frameworks...',
    'Scanning codebase structure...',
    'Agents competing for issue discovery...',
    'Cross-validating findings...',
    'Judge reviewing agent reports...',
    'Determining winner...'
  ];
  
  let eventIndex = 0;
  const eventInterval = setInterval(() => {
    if (eventIndex >= battleEvents.length) {
      clearInterval(eventInterval);
      completeBattle(battleMatch);
      return;
    }
    
    const randomAgent = battleMatch.participants[Math.floor(Math.random() * battleMatch.participants.length)];
    const agent = userAgents.get(randomAgent);
    const user = agent ? users.get(agent.userId) : null;
    
    // Stream individual agent events
    if (agent) {
      broadcastStreamEvent(`${agent.rank}_stream`, {
        id: `${agent.rank}_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'agent_analyzing',
        source: agent.rank,
        data: {
          agentId: agent.id,
          agentRank: agent.rank,
          status: 'analyzing',
          currentAction: battleEvents[eventIndex],
          progress: ((eventIndex + 1) / battleEvents.length) * 100,
          username: user?.username
        },
        battle_id: battleMatch.id
      });
    }
    
    // Stream to unified feed
    broadcastStreamEvent('unified_stream', {
      id: `unified_${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'battle_progress',
      source: 'battle',
      data: {
        battle_id: battleMatch.id,
        event: battleEvents[eventIndex],
        progress: ((eventIndex + 1) / battleEvents.length) * 100,
        active_agent: agent?.name || 'Unknown'
      },
      battle_id: battleMatch.id
    });
    
    eventIndex++;
  }, 3000); // Event every 3 seconds
}

function completeBattle(battleMatch) {
  // Determine random winner
  const winner = battleMatch.participants[Math.floor(Math.random() * battleMatch.participants.length)];
  const winnerAgent = userAgents.get(winner);
  const winnerUser = winnerAgent ? users.get(winnerAgent.userId) : null;
  
  battleMatch.status = 'completed';
  battleMatch.winner = winner;
  battleMatch.end_time = new Date().toISOString();
  
  // Update agent stats
  battleMatch.participants.forEach(agentId => {
    const agent = userAgents.get(agentId);
    if (agent) {
      agent.performance.total_battles++;
      if (agentId === winner) {
        agent.wins++;
        agent.points += 100;
      } else {
        agent.losses++;
        agent.points += 25;
      }
      agent.performance.win_rate = agent.wins / agent.performance.total_battles;
    }
  });
  
  // Broadcast battle end
  io.to('spectators').emit('battle:ended', battleMatch);
  io.to('users').emit('battle:ended', battleMatch);
  
  // Stream battle completion
  broadcastStreamEvent('battle_stream', {
    id: `battle_end_${battleMatch.id}`,
    timestamp: new Date().toISOString(),
    type: 'battle_ended',
    source: 'battle',
    data: {
      battle_id: battleMatch.id,
      winner_id: winner,
      winner_name: winnerAgent?.name,
      winner_username: winnerUser?.username,
      duration: battleMatch.end_time ? 
        new Date(battleMatch.end_time).getTime() - new Date(battleMatch.created).getTime() : 0
    },
    battle_id: battleMatch.id
  });
  
  // Stream judge verdict
  broadcastStreamEvent('judge_stream', {
    id: `judge_verdict_${battleMatch.id}`,
    timestamp: new Date().toISOString(),
    type: 'judge_verdict',
    source: 'judge',
    data: {
      battle_id: battleMatch.id,
      verdict: 'Battle completed successfully',
      winner: {
        agent_id: winner,
        agent_name: winnerAgent?.name,
        username: winnerUser?.username
      },
      points_awarded: {
        winner: 100,
        participants: 25
      }
    },
    battle_id: battleMatch.id
  });
  
  console.log(`🏆 Battle ${battleMatch.id} completed. Winner: ${winnerAgent?.name} (${winnerUser?.username})`);
}

// Battle Simulation Function
function startBattleSimulation(battleId, battle) {
  const battleEvents = [
    'Scanning repository structure...',
    'Analyzing code quality metrics...',
    'Detecting potential vulnerabilities...',
    'Reviewing architectural patterns...',
    'Checking for code smells...',
    'Validating security practices...',
    'Assessing performance bottlenecks...',
    'Evaluating test coverage...',
    'Proposing optimization strategies...',
    'Challenging implementation approach...',
    'Defending code design decisions...',
    'Escalating critical findings...'
  ];
  
  let eventIndex = 0;
  const eventInterval = setInterval(() => {
    const currentBattle = activeBattles.get(battleId);
    if (!currentBattle || currentBattle.status !== 'active' || eventIndex >= battleEvents.length) {
      clearInterval(eventInterval);
      return;
    }
    
    const randomParticipant = battle.participants[Math.floor(Math.random() * battle.participants.length)];
    const logEntry = {
      timestamp: new Date().toISOString(),
      agentId: randomParticipant,
      action: 'analysis',
      details: battleEvents[eventIndex],
      points: Math.floor(Math.random() * 10) + 1
    };
    
    currentBattle.logs.push(logEntry);
    
    // Broadcast battle log to spectators
    io.to('spectators').emit('battle:log', {
      battleId,
      ...logEntry
    });
    
    eventIndex++;
  }, 2500); // Event every 2.5 seconds
  
  // Auto-end battle after 2 minutes if not manually ended
  setTimeout(() => {
    const currentBattle = activeBattles.get(battleId);
    if (currentBattle && currentBattle.status === 'active') {
      const winner = battle.participants[Math.floor(Math.random() * battle.participants.length)];
      
      currentBattle.status = 'completed';
      currentBattle.endTime = new Date().toISOString();
      currentBattle.winner = winner;
      
      io.to('spectators').emit('battle:ended', currentBattle);
      io.to('agents').emit('battle:ended', currentBattle);
      
      io.to('spectators').emit('arena:announcement', {
        message: `⏰ Battle concluded by time limit! Champion determined!`,
        type: 'battle_timeout',
        timestamp: new Date().toISOString()
      });
    }
    clearInterval(eventInterval);
  }, 120000); // 2 minutes
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    activeBattles: activeBattles.size,
    spectators: spectators.size,
    agents: agentConnections.size,
    timestamp: new Date().toISOString()
  });
});

// Arena stats endpoint
app.get('/arena/stats', (req, res) => {
  res.json({
    activeBattles: Array.from(activeBattles.values()),
    spectatorCount: spectators.size,
    connectedAgents: agentConnections.size,
    timestamp: new Date().toISOString()
  });
});

// Streaming endpoints
app.get('/api/streams/available', (req, res) => {
  res.json({
    streams: Array.from(streamSubscribers.keys()).map(channel => ({
      channel,
      subscribers: streamSubscribers.get(channel).size,
      recent_events: (streamHistory.get(channel) || []).length
    })),
    total_subscribers: Array.from(streamSubscribers.values())
      .reduce((sum, subs) => sum + subs.size, 0)
  });
});

app.get('/api/streams/:channel/history', (req, res) => {
  const { channel } = req.params;
  const limit = parseInt(req.query.limit) || 50;
  
  const history = streamHistory.get(channel) || [];
  const events = history.slice(-limit);
  
  res.json({
    channel,
    events,
    total_events: history.length,
    timestamp: new Date().toISOString()
  });
});

// Multi-user system endpoints
app.get('/api/users', (req, res) => {
  const userList = Array.from(users.values()).map(user => ({
    id: user.id,
    username: user.username,
    tier: user.subscription_tier,
    agents: user.agents.length,
    reputation: user.reputation
  }));
  
  res.json({ users: userList });
});

app.get('/api/agents', (req, res) => {
  const agentList = Array.from(userAgents.values()).map(agent => {
    const user = users.get(agent.userId);
    return {
      id: agent.id,
      name: agent.name,
      rank: agent.rank,
      username: user?.username,
      status: agent.status,
      points: agent.points,
      wins: agent.wins,
      losses: agent.losses,
      win_rate: agent.performance.win_rate
    };
  });
  
  res.json({ agents: agentList });
});

app.get('/api/leaderboard', (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  
  const leaderboard = Array.from(userAgents.values())
    .filter(agent => agent.status === 'active' && agent.performance.total_battles > 0)
    .sort((a, b) => b.points - a.points)
    .slice(0, limit)
    .map((agent, index) => {
      const user = users.get(agent.userId);
      return {
        rank: index + 1,
        agent_id: agent.id,
        agent_name: agent.name,
        username: user?.username || 'Unknown',
        points: agent.points,
        win_rate: agent.performance.win_rate,
        total_battles: agent.performance.total_battles,
        agent_rank: agent.rank
      };
    });
  
  res.json({ leaderboard });
});

app.get('/api/battles/active', (req, res) => {
  const active = Array.from(activeBattles.values())
    .filter(battle => battle.status === 'active' || battle.status === 'ready');
  
  res.json({ active_battles: active });
});

// Battle creation endpoint
app.post('/api/battles/create', (req, res) => {
  const { userId, mode, repository, max_participants } = req.body;
  
  if (!userId || !repository) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  const battleId = `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const battleMatch = {
    id: battleId,
    mode: mode || 'normal',
    repository,
    requester: userId,
    max_participants: max_participants || 4,
    participants: [],
    status: 'waiting',
    created: new Date().toISOString()
  };
  
  battleQueue.push(battleMatch);
  
  res.json({
    success: true,
    battle_id: battleId,
    status: battleMatch.status
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`🏟️ Gladiator Arena WebSocket Server running on port ${PORT}`);
  console.log(`🔗 WebSocket endpoint: ws://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📈 Arena stats: http://localhost:${PORT}/arena/stats`);
});