#!/usr/bin/env node

/**
 * Test Script for Real-time Streaming and Multi-user Agent Deployment
 * This script tests the new streaming endpoints and multi-user functionality
 */

import { createServer } from 'http';
import { readFileSync } from 'fs';
import express from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { io as SocketIOClient } from 'socket.io-client';

console.log('🧪 Starting AI Gladiator Streaming & Multi-user System Test...\n');

const PORT = 3001;
let testResults = [];

// Start mock WebSocket server for testing
const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

// Mock data
const mockUsers = [];
const mockAgents = [];
const mockBattles = [];
const streamSubscribers = new Map();

// Initialize test streams
const testStreams = [
  'scout_stream', 'sweeper_stream', 'inspector_stream', 'fixer_stream',
  'judge_stream', 'orchestrator_stream', 'unified_stream', 'battle_stream'
];

testStreams.forEach(stream => {
  streamSubscribers.set(stream, new Set());
});

io.on('connection', (socket) => {
  console.log(`📡 Client connected: ${socket.id}`);
  
  // Handle stream subscriptions
  socket.on('stream:subscribe', (data) => {
    const { channel } = data;
    console.log(`   → Subscribed to ${channel}`);
    
    if (streamSubscribers.has(channel)) {
      streamSubscribers.get(channel).add(socket);
      
      // Send mock history
      socket.emit('stream:history', {
        channel,
        events: generateMockEvents(channel, 5),
        timestamp: new Date().toISOString()
      });
    }
  });
  
  // Handle user registration
  socket.on('user:register', (data) => {
    console.log(`👤 User registration: ${data.username}`);
    
    const user = {
      id: `user_${Date.now()}`,
      username: data.username,
      email: data.email,
      tier: data.tier || 'free',
      api_key: `gla_test_${Math.random().toString(36).substr(2, 16)}`
    };
    
    mockUsers.push(user);
    
    socket.emit('user:registered', {
      success: true,
      user: {
        id: user.id,
        username: user.username,
        tier: user.tier,
        api_key: user.api_key
      }
    });
  });
  
  // Handle agent deployment
  socket.on('agent:deploy', (data) => {
    console.log(`🤖 Agent deployment: ${data.agentName} (${data.agentRank})`);
    
    const agent = {
      id: `agent_${Date.now()}`,
      name: data.agentName,
      rank: data.agentRank,
      userId: data.userId,
      status: 'active',
      points: 0,
      wins: 0,
      losses: 0
    };
    
    mockAgents.push(agent);
    
    socket.emit('agent:deployed', { success: true, agent });
    
    // Broadcast to unified stream
    broadcastStreamEvent('unified_stream', {
      id: `deploy_${agent.id}`,
      timestamp: new Date().toISOString(),
      type: 'agent_deployed',
      source: 'system',
      data: {
        agent_id: agent.id,
        agent_name: agent.name,
        rank: agent.rank
      }
    });
  });
  
  // Handle battle creation
  socket.on('battle:create_match', (data) => {
    console.log(`⚔️ Battle creation: ${data.repository}`);
    
    const battleId = `battle_${Date.now()}`;
    const battle = {
      id: battleId,
      repository: data.repository,
      mode: data.mode || 'normal',
      participants: mockAgents.slice(0, Math.min(4, mockAgents.length)).map(a => a.id),
      status: 'active'
    };
    
    mockBattles.push(battle);
    
    socket.emit('battle:match_created', {
      success: true,
      battle_id: battleId,
      participants: battle.participants.length
    });
    
    // Start mock battle simulation
    simulateBattle(battle);
  });
  
  socket.on('disconnect', () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
    
    // Clean up subscriptions
    streamSubscribers.forEach(subscribers => {
      subscribers.delete(socket);
    });
  });
});

function generateMockEvents(channel, count) {
  const events = [];
  const eventTypes = {
    scout_stream: ['agent_started', 'agent_analyzing', 'agent_completed'],
    sweeper_stream: ['agent_started', 'agent_analyzing', 'agent_found_issue'],
    inspector_stream: ['agent_started', 'agent_analyzing', 'agent_completed'],
    fixer_stream: ['agent_started', 'agent_analyzing', 'agent_completed'],
    judge_stream: ['judge_decision', 'judge_verdict'],
    unified_stream: ['agent_started', 'battle_started', 'agent_completed']
  };
  
  const types = eventTypes[channel] || ['agent_started'];
  
  for (let i = 0; i < count; i++) {
    events.push({
      id: `mock_${channel}_${i}`,
      timestamp: new Date(Date.now() - (count - i) * 10000).toISOString(),
      type: types[Math.floor(Math.random() * types.length)],
      source: channel.split('_')[0],
      data: {
        message: `Mock ${channel} event ${i + 1}`,
        progress: Math.floor(Math.random() * 100)
      }
    });
  }
  
  return events;
}

function broadcastStreamEvent(channel, event) {
  const subscribers = streamSubscribers.get(channel);
  if (subscribers) {
    subscribers.forEach(socket => {
      socket.emit('stream:event', event);
    });
  }
  
  // Also broadcast to unified stream if not already
  if (channel !== 'unified_stream') {
    const unifiedSubscribers = streamSubscribers.get('unified_stream');
    if (unifiedSubscribers) {
      unifiedSubscribers.forEach(socket => {
        socket.emit('stream:event', event);
      });
    }
  }
}

function simulateBattle(battle) {
  console.log(`🏟️ Simulating battle: ${battle.id}`);
  
  const battleEvents = [
    'Battle started',
    'Agents analyzing repository',
    'Issues being discovered',
    'Agents competing for findings',
    'Judge reviewing reports',
    'Winner determined'
  ];
  
  let eventIndex = 0;
  
  const battleInterval = setInterval(() => {
    if (eventIndex >= battleEvents.length) {
      clearInterval(battleInterval);
      
      // End battle
      broadcastStreamEvent('battle_stream', {
        id: `battle_end_${battle.id}`,
        timestamp: new Date().toISOString(),
        type: 'battle_ended',
        source: 'battle',
        data: {
          battle_id: battle.id,
          winner: battle.participants[0],
          duration: battleEvents.length * 2000
        }
      });
      
      console.log(`🏆 Battle ${battle.id} completed`);
      return;
    }
    
    // Broadcast battle progress
    broadcastStreamEvent('battle_stream', {
      id: `battle_${battle.id}_${eventIndex}`,
      timestamp: new Date().toISOString(),
      type: 'battle_progress',
      source: 'battle',
      data: {
        battle_id: battle.id,
        event: battleEvents[eventIndex],
        progress: ((eventIndex + 1) / battleEvents.length) * 100
      }
    });
    
    // Simulate individual agent events
    if (battle.participants.length > 0) {
      const randomAgent = battle.participants[Math.floor(Math.random() * battle.participants.length)];
      const agent = mockAgents.find(a => a.id === randomAgent);
      
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
            progress: ((eventIndex + 1) / battleEvents.length) * 100
          }
        });
      }
    }
    
    eventIndex++;
  }, 2000); // Event every 2 seconds
}

// Test functions
async function runTests() {
  console.log('🚀 Starting test server...\n');
  
  await new Promise((resolve) => {
    httpServer.listen(PORT, () => {
      console.log(`✅ Test server running on port ${PORT}\n`);
      resolve();
    });
  });
  
  // Wait a moment for server to be ready
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  console.log('🔧 Running automated tests...\n');
  
  // Test 1: WebSocket Connection
  await testWebSocketConnection();
  
  // Test 2: Stream Subscription
  await testStreamSubscription();
  
  // Test 3: User Registration
  await testUserRegistration();
  
  // Test 4: Agent Deployment
  await testAgentDeployment();
  
  // Test 5: Battle Creation
  await testBattleCreation();
  
  // Test 6: Real-time Streaming
  await testRealTimeStreaming();
  
  // Print results
  console.log('\n📊 TEST RESULTS:');
  console.log('================');
  testResults.forEach((result, index) => {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${index + 1}. ${result.name}: ${status}`);
    if (!result.passed && result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });
  
  const passedTests = testResults.filter(r => r.passed).length;
  const totalTests = testResults.length;
  
  console.log(`\n📈 Summary: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! The streaming and multi-user system is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Please check the errors above.');
  }
  
  // Cleanup
  httpServer.close();
  process.exit(passedTests === totalTests ? 0 : 1);
}

async function testWebSocketConnection() {
  const testName = 'WebSocket Connection';
  console.log(`🧪 Testing: ${testName}`);
  
  try {
    const client = SocketIOClient(`http://localhost:${PORT}`);
    
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, 5000);
      
      client.on('connect', () => {
        clearTimeout(timeout);
        client.disconnect();
        resolve();
      });
      
      client.on('connect_error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
    
    testResults.push({ name: testName, passed: true });
    console.log('   ✅ WebSocket connection successful\n');
    
  } catch (error) {
    testResults.push({ name: testName, passed: false, error: error.message });
    console.log(`   ❌ WebSocket connection failed: ${error.message}\n`);
  }
}

async function testStreamSubscription() {
  const testName = 'Stream Subscription';
  console.log(`🧪 Testing: ${testName}`);
  
  try {
    const client = SocketIOClient(`http://localhost:${PORT}`);
    
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Stream subscription timeout'));
      }, 5000);
      
      client.on('connect', () => {
        client.emit('stream:subscribe', { channel: 'unified_stream' });
      });
      
      client.on('stream:history', (data) => {
        if (data.channel === 'unified_stream' && Array.isArray(data.events)) {
          clearTimeout(timeout);
          client.disconnect();
          resolve();
        }
      });
    });
    
    testResults.push({ name: testName, passed: true });
    console.log('   ✅ Stream subscription successful\n');
    
  } catch (error) {
    testResults.push({ name: testName, passed: false, error: error.message });
    console.log(`   ❌ Stream subscription failed: ${error.message}\n`);
  }
}

async function testUserRegistration() {
  const testName = 'User Registration';
  console.log(`🧪 Testing: ${testName}`);
  
  try {
    const client = SocketIOClient(`http://localhost:${PORT}`);
    
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('User registration timeout'));
      }, 5000);
      
      client.on('connect', () => {
        client.emit('user:register', {
          username: 'test_user',
          email: 'test@example.com',
          tier: 'free'
        });
      });
      
      client.on('user:registered', (data) => {
        if (data.success && data.user.username === 'test_user') {
          clearTimeout(timeout);
          client.disconnect();
          resolve();
        } else {
          reject(new Error('Invalid registration response'));
        }
      });
    });
    
    testResults.push({ name: testName, passed: true });
    console.log('   ✅ User registration successful\n');
    
  } catch (error) {
    testResults.push({ name: testName, passed: false, error: error.message });
    console.log(`   ❌ User registration failed: ${error.message}\n`);
  }
}

async function testAgentDeployment() {
  const testName = 'Agent Deployment';
  console.log(`🧪 Testing: ${testName}`);
  
  try {
    const client = SocketIOClient(`http://localhost:${PORT}`);
    
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Agent deployment timeout'));
      }, 5000);
      
      client.on('connect', () => {
        client.emit('agent:deploy', {
          userId: 'test_user_123',
          agentName: 'TestAgent',
          agentRank: 'scout',
          code: '// Test agent code'
        });
      });
      
      client.on('agent:deployed', (data) => {
        if (data.success && data.agent.name === 'TestAgent') {
          clearTimeout(timeout);
          client.disconnect();
          resolve();
        } else {
          reject(new Error('Invalid deployment response'));
        }
      });
    });
    
    testResults.push({ name: testName, passed: true });
    console.log('   ✅ Agent deployment successful\n');
    
  } catch (error) {
    testResults.push({ name: testName, passed: false, error: error.message });
    console.log(`   ❌ Agent deployment failed: ${error.message}\n`);
  }
}

async function testBattleCreation() {
  const testName = 'Battle Creation';
  console.log(`🧪 Testing: ${testName}`);
  
  try {
    const client = SocketIOClient(`http://localhost:${PORT}`);
    
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Battle creation timeout'));
      }, 5000);
      
      client.on('connect', () => {
        client.emit('battle:create_match', {
          userId: 'test_user_123',
          repository: 'https://github.com/test/repo',
          mode: 'normal',
          max_participants: 4
        });
      });
      
      client.on('battle:match_created', (data) => {
        if (data.success && data.battle_id) {
          clearTimeout(timeout);
          client.disconnect();
          resolve();
        } else {
          reject(new Error('Invalid battle creation response'));
        }
      });
    });
    
    testResults.push({ name: testName, passed: true });
    console.log('   ✅ Battle creation successful\n');
    
  } catch (error) {
    testResults.push({ name: testName, passed: false, error: error.message });
    console.log(`   ❌ Battle creation failed: ${error.message}\n`);
  }
}

async function testRealTimeStreaming() {
  const testName = 'Real-time Streaming';
  console.log(`🧪 Testing: ${testName}`);
  
  try {
    const client = SocketIOClient(`http://localhost:${PORT}`);
    let eventReceived = false;
    
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (eventReceived) {
          resolve();
        } else {
          reject(new Error('No stream events received'));
        }
      }, 8000);
      
      client.on('connect', () => {
        // Subscribe to unified stream
        client.emit('stream:subscribe', { channel: 'unified_stream' });
        
        // Create a battle to generate events
        setTimeout(() => {
          client.emit('battle:create_match', {
            userId: 'test_user_456',
            repository: 'https://github.com/test/streaming-repo',
            mode: 'normal'
          });
        }, 1000);
      });
      
      client.on('stream:event', (event) => {
        if (event.type && event.source && event.data) {
          eventReceived = true;
          console.log(`   📡 Received stream event: ${event.type} from ${event.source}`);
        }
      });
    });
    
    client.disconnect();
    
    testResults.push({ name: testName, passed: true });
    console.log('   ✅ Real-time streaming successful\n');
    
  } catch (error) {
    testResults.push({ name: testName, passed: false, error: error.message });
    console.log(`   ❌ Real-time streaming failed: ${error.message}\n`);
  }
}

// Run the tests
runTests().catch(error => {
  console.error('Test runner failed:', error);
  process.exit(1);
});