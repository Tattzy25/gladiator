import { Server } from 'socket.io';
import { createServer } from 'http';
import express from 'express';
import cors from 'cors';

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
    }
    
    // Broadcast spectator count update
    io.to('spectators').emit('arena:spectator_count', {
      count: spectators.size
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
  });
});

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

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`🏟️ Gladiator Arena WebSocket Server running on port ${PORT}`);
  console.log(`🔗 WebSocket endpoint: ws://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📈 Arena stats: http://localhost:${PORT}/arena/stats`);
});