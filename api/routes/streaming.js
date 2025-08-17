/**
 * REST API Routes for Real-time Streaming and Multi-user Agent System
 */

import express from 'express';

const router = express.Router();

// Mock services for now - in production these would be imported properly
const streamingService = {
  getStreamingMetrics: () => ({
    total_subscribers: 0,
    channels: {},
    events_per_second: 0,
    uptime: process.uptime()
  }),
  getActiveChannels: () => [
    'scout_stream', 'sweeper_stream', 'inspector_stream', 'fixer_stream',
    'judge_stream', 'orchestrator_stream', 'unified_stream', 'battle_stream'
  ],
  getStreamHistory: (channel, limit) => [],
  createBattleStream: (battleId) => `battle_${battleId}`,
  createUserStream: (userId) => `user_${userId}`
};

const multiUserSystem = {
  users: new Map(),
  agents: new Map(),
  createUser: (username, email, tier) => ({
    id: `user_${Date.now()}`,
    username,
    email,
    tier,
    registration_date: new Date(),
    agents: [],
    battle_history: [],
    reputation: 100,
    allowed_agents: tier === 'free' ? 1 : tier === 'premium' ? 4 : 10,
    api_key: `gla_${Math.random().toString(36).substr(2, 32)}`
  }),
  getUserByApiKey: (apiKey) => null,
  deployAgent: async (request) => ({
    id: `agent_${Date.now()}`,
    name: request.agentName,
    userId: request.userId,
    rank: request.agentRank,
    code: request.code,
    status: 'active',
    safety_rating: 85,
    approved: true,
    points: 0,
    wins: 0,
    losses: 0,
    performance: { total_battles: 0, win_rate: 0 }
  }),
  getUserAgents: (userId) => [],
  getUser: (userId) => null,
  createBattleMatch: async (request) => `battle_${Date.now()}`,
  getActiveBattles: () => [],
  getLeaderboard: (limit) => []
};

const router = express.Router();

// Authentication middleware
function authenticateUser(req, res, next) {
  const apiKey = req.headers['x-api-key'] || req.query.api_key;
  
  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }
  
  const user = multiUserSystem.getUserByApiKey(apiKey);
  if (!user) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  
  req.user = user;
  next();
}

/**
 * STREAMING ENDPOINTS
 */

// Get available streaming channels
router.get('/streams', (req, res) => {
  const metrics = streamingService.getStreamingMetrics();
  const channels = streamingService.getActiveChannels();
  
  res.json({
    success: true,
    data: {
      channels: channels.map(channel => ({
        name: channel,
        subscribers: metrics.channels[channel] || 0,
        description: getChannelDescription(channel)
      })),
      total_subscribers: metrics.total_subscribers,
      uptime: metrics.uptime
    }
  });
});

// Get stream history for a specific channel
router.get('/streams/:channel/history', (req, res) => {
  const { channel } = req.params;
  const limit = parseInt(req.query.limit) || 100;
  
  try {
    const history = streamingService.getStreamHistory(channel, limit);
    
    res.json({
      success: true,
      data: {
        channel,
        events: history,
        count: history.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Create a custom stream channel
router.post('/streams/create', authenticateUser, (req, res) => {
  const { channel_name, type } = req.body;
  
  if (!channel_name) {
    return res.status(400).json({ error: 'Channel name required' });
  }
  
  let channelId;
  if (type === 'battle') {
    channelId = streamingService.createBattleStream(channel_name);
  } else if (type === 'user') {
    channelId = streamingService.createUserStream(req.user.id);
  } else {
    return res.status(400).json({ error: 'Invalid channel type' });
  }
  
  res.json({
    success: true,
    data: {
      channel_id: channelId,
      type,
      created_by: req.user.username
    }
  });
});

/**
 * USER MANAGEMENT ENDPOINTS
 */

// Register new user
router.post('/users/register', (req, res) => {
  const { username, email, tier = 'free' } = req.body;
  
  if (!username || !email) {
    return res.status(400).json({ error: 'Username and email required' });
  }
  
  try {
    const user = multiUserSystem.createUser(username, email, tier);
    
    res.json({
      success: true,
      data: {
        user_id: user.id,
        username: user.username,
        tier: user.subscription_tier,
        api_key: user.api_key,
        allowed_agents: user.allowed_agents
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Get user profile
router.get('/users/profile', authenticateUser, (req, res) => {
  const user = req.user;
  const agents = multiUserSystem.getUserAgents(user.id);
  
  res.json({
    success: true,
    data: {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        tier: user.subscription_tier,
        reputation: user.reputation,
        registration_date: user.registration_date
      },
      agents: agents.map(agent => ({
        id: agent.id,
        name: agent.name,
        rank: agent.rank,
        status: agent.status,
        points: agent.points,
        wins: agent.wins,
        losses: agent.losses,
        performance: agent.performance
      })),
      battle_history: user.battle_history.slice(-10) // Last 10 battles
    }
  });
});

// Get all users (public leaderboard)
router.get('/users', (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const users = Array.from(multiUserSystem.users.values())
    .slice(0, limit)
    .map(user => ({
      id: user.id,
      username: user.username,
      tier: user.subscription_tier,
      reputation: user.reputation,
      agents_count: user.agents.length,
      total_battles: user.battle_history.length
    }));
  
  res.json({
    success: true,
    data: { users }
  });
});

/**
 * AGENT DEPLOYMENT ENDPOINTS
 */

// Deploy new agent
router.post('/agents/deploy', authenticateUser, async (req, res) => {
  const { agent_name, agent_rank, code, description } = req.body;
  
  if (!agent_name || !agent_rank) {
    return res.status(400).json({ error: 'Agent name and rank required' });
  }
  
  if (!['scout', 'sweeper', 'inspector', 'fixer'].includes(agent_rank)) {
    return res.status(400).json({ error: 'Invalid agent rank' });
  }
  
  try {
    const deploymentRequest = {
      userId: req.user.id,
      agentName: agent_name,
      agentRank: agent_rank,
      code: code || '// Default agent implementation',
      description: description || ''
    };
    
    const agent = await multiUserSystem.deployAgent(deploymentRequest);
    
    res.json({
      success: true,
      data: {
        agent_id: agent.id,
        name: agent.name,
        rank: agent.rank,
        status: agent.status,
        safety_rating: agent.safety_rating,
        approved: agent.approved
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Get user's agents
router.get('/agents/mine', authenticateUser, (req, res) => {
  const agents = multiUserSystem.getUserAgents(req.user.id);
  
  res.json({
    success: true,
    data: {
      agents: agents.map(agent => ({
        id: agent.id,
        name: agent.name,
        rank: agent.rank,
        status: agent.status,
        points: agent.points,
        wins: agent.wins,
        losses: agent.losses,
        performance: agent.performance,
        deployment_date: agent.deployment_date,
        safety_rating: agent.safety_rating
      }))
    }
  });
});

// Get all active agents (public)
router.get('/agents', (req, res) => {
  const rank = req.query.rank;
  const limit = parseInt(req.query.limit) || 100;
  
  let agents = Array.from(multiUserSystem.agents.values())
    .filter(agent => agent.status === 'active' && agent.approved);
  
  if (rank) {
    agents = agents.filter(agent => agent.rank === rank);
  }
  
  agents = agents.slice(0, limit);
  
  const agentsData = agents.map(agent => {
    const user = multiUserSystem.getUser(agent.userId);
    return {
      id: agent.id,
      name: agent.name,
      rank: agent.rank,
      username: user?.username || 'Unknown',
      points: agent.points,
      wins: agent.wins,
      losses: agent.losses,
      win_rate: agent.performance.win_rate,
      total_battles: agent.performance.total_battles
    };
  });
  
  res.json({
    success: true,
    data: { agents: agentsData }
  });
});

/**
 * BATTLE SYSTEM ENDPOINTS
 */

// Create battle match
router.post('/battles/create', authenticateUser, async (req, res) => {
  const { mode, repository, max_participants, entry_fee, prize_pool } = req.body;
  
  if (!repository) {
    return res.status(400).json({ error: 'Repository URL required' });
  }
  
  try {
    const battleRequest = {
      requesterId: req.user.id,
      mode: mode || 'normal',
      repository,
      max_participants: max_participants || 4,
      entry_fee,
      prize_pool
    };
    
    const battleId = await multiUserSystem.createBattleMatch(battleRequest);
    
    res.json({
      success: true,
      data: {
        battle_id: battleId,
        status: 'created',
        message: 'Battle match created and matchmaking started'
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Get active battles
router.get('/battles/active', (req, res) => {
  const activeBattles = multiUserSystem.getActiveBattles();
  
  res.json({
    success: true,
    data: {
      battles: activeBattles.map(battle => ({
        id: battle.id,
        mode: battle.mode,
        repository: battle.repository,
        participants: battle.participants.length,
        status: battle.status,
        start_time: battle.start_time
      }))
    }
  });
});

// Get battle details
router.get('/battles/:battleId', (req, res) => {
  const { battleId } = req.params;
  const battle = multiUserSystem.getActiveBattles().find(b => b.id === battleId);
  
  if (!battle) {
    return res.status(404).json({ error: 'Battle not found' });
  }
  
  res.json({
    success: true,
    data: { battle }
  });
});

/**
 * LEADERBOARD ENDPOINTS
 */

// Global leaderboard
router.get('/leaderboard', (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  const leaderboard = multiUserSystem.getLeaderboard(limit);
  
  res.json({
    success: true,
    data: { leaderboard }
  });
});

// User-specific leaderboard
router.get('/leaderboard/user/:userId', (req, res) => {
  const { userId } = req.params;
  const user = multiUserSystem.getUser(userId);
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  const userAgents = multiUserSystem.getUserAgents(userId);
  const leaderboard = userAgents.map((agent, index) => ({
    rank: index + 1,
    agent_id: agent.id,
    agent_name: agent.name,
    points: agent.points,
    win_rate: agent.performance.win_rate,
    total_battles: agent.performance.total_battles
  }));
  
  res.json({
    success: true,
    data: {
      username: user.username,
      leaderboard
    }
  });
});

/**
 * REAL-TIME METRICS ENDPOINTS
 */

// System metrics
router.get('/metrics', (req, res) => {
  const streamMetrics = streamingService.getStreamingMetrics();
  const activeBattles = multiUserSystem.getActiveBattles();
  const totalUsers = multiUserSystem.users.size;
  const totalAgents = multiUserSystem.agents.size;
  
  res.json({
    success: true,
    data: {
      system: {
        uptime: process.uptime(),
        memory_usage: process.memoryUsage(),
        timestamp: new Date().toISOString()
      },
      streaming: {
        total_subscribers: streamMetrics.total_subscribers,
        active_channels: streamMetrics.channels,
        events_per_second: streamMetrics.events_per_second
      },
      battles: {
        active_count: activeBattles.length,
        total_participants: activeBattles.reduce((sum, b) => sum + b.participants.length, 0)
      },
      users: {
        total_users: totalUsers,
        total_agents: totalAgents,
        active_agents: Array.from(multiUserSystem.agents.values())
          .filter(a => a.status === 'active').length
      }
    }
  });
});

// Helper function for channel descriptions
function getChannelDescription(channel) {
  const descriptions = {
    scout_stream: 'Real-time feed of Scout agent activities - repository reconnaissance and initial analysis',
    sweeper_stream: 'Live Sweeper agent updates - code validation and error detection in progress',
    inspector_stream: 'Inspector agent stream - final judgment and approval processes',
    fixer_stream: 'Fixer agent activity - code modifications and PR creation attempts',
    judge_stream: 'Judge decisions and verdicts - promotions, demotions, and final rulings',
    orchestrator_stream: 'System orchestrator events - emergency interventions and coordination',
    unified_stream: 'Combined feed of all agent and system activities',
    battle_stream: 'Battle-specific events - starts, completions, and competitive activities'
  };
  
  return descriptions[channel] || 'Custom stream channel';
}

export default router;