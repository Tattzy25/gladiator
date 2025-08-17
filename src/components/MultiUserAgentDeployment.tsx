/**
 * Multi-User Agent Deployment Interface
 * Allows users to register, deploy agents, and participate in battles
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  Bot, 
  Code, 
  Shield, 
  Trophy, 
  Sword,
  Plus,
  Upload,
  Play,
  Pause,
  Settings,
  Eye,
  AlertTriangle
} from 'lucide-react';

interface User {
  id: string;
  username: string;
  tier: 'free' | 'premium' | 'pro';
  reputation: number;
  agents: UserAgent[];
  api_key: string;
}

interface UserAgent {
  id: string;
  name: string;
  rank: 'scout' | 'sweeper' | 'inspector' | 'fixer';
  status: 'active' | 'inactive' | 'banned' | 'pending_approval';
  points: number;
  wins: number;
  losses: number;
  win_rate: number;
  safety_rating: number;
}

interface DeploymentForm {
  agent_name: string;
  agent_rank: 'scout' | 'sweeper' | 'inspector' | 'fixer';
  code: string;
  description: string;
}

export const MultiUserAgentDeployment: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [showDeployment, setShowDeployment] = useState(false);
  const [deploymentForm, setDeploymentForm] = useState<DeploymentForm>({
    agent_name: '',
    agent_rank: 'scout',
    code: '',
    description: ''
  });
  const [allAgents, setAllAgents] = useState<UserAgent[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Registration form
  const [registrationForm, setRegistrationForm] = useState({
    username: '',
    email: '',
    tier: 'free' as 'free' | 'premium' | 'pro'
  });

  useEffect(() => {
    loadPublicData();
    
    // Check if user is already registered (localStorage)
    const savedUser = localStorage.getItem('gladiator_user');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      setCurrentUser(user);
      setIsRegistered(true);
      loadUserData(user.api_key);
    }
  }, []);

  const loadPublicData = async () => {
    try {
      // Load public agents and leaderboard
      const [agentsRes, leaderboardRes] = await Promise.all([
        fetch('/api/agents'),
        fetch('/api/leaderboard')
      ]);
      
      const agentsData = await agentsRes.json();
      const leaderboardData = await leaderboardRes.json();
      
      if (agentsData.success) setAllAgents(agentsData.data.agents);
      if (leaderboardData.success) setLeaderboard(leaderboardData.data.leaderboard);
    } catch (error) {
      console.error('Failed to load public data:', error);
    }
  };

  const loadUserData = async (apiKey: string) => {
    try {
      const response = await fetch('/api/users/profile', {
        headers: { 'X-API-Key': apiKey }
      });
      
      const data = await response.json();
      if (data.success) {
        const updatedUser = { ...currentUser, ...data.data.user, agents: data.data.agents };
        setCurrentUser(updatedUser);
        localStorage.setItem('gladiator_user', JSON.stringify(updatedUser));
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
    }
  };

  const handleRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch('/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registrationForm)
      });
      
      const data = await response.json();
      
      if (data.success) {
        const user: User = {
          id: data.data.user_id,
          username: data.data.username,
          tier: data.data.tier,
          reputation: 100,
          agents: [],
          api_key: data.data.api_key
        };
        
        setCurrentUser(user);
        setIsRegistered(true);
        localStorage.setItem('gladiator_user', JSON.stringify(user));
        
        // Show API key to user
        alert(`Registration successful! Your API key: ${data.data.api_key}\nPlease save this key safely.`);
      } else {
        alert('Registration failed: ' + data.error);
      }
    } catch (error) {
      console.error('Registration error:', error);
      alert('Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAgentDeployment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    
    setLoading(true);
    
    try {
      const response = await fetch('/api/agents/deploy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': currentUser.api_key
        },
        body: JSON.stringify(deploymentForm)
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert(`Agent "${data.data.name}" deployed successfully!`);
        setShowDeployment(false);
        setDeploymentForm({
          agent_name: '',
          agent_rank: 'scout',
          code: '',
          description: ''
        });
        
        // Reload user data
        await loadUserData(currentUser.api_key);
        await loadPublicData();
      } else {
        alert('Deployment failed: ' + data.error);
      }
    } catch (error) {
      console.error('Deployment error:', error);
      alert('Deployment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const createBattle = async () => {
    if (!currentUser) return;
    
    const repository = prompt('Enter repository URL to analyze:');
    if (!repository) return;
    
    setLoading(true);
    
    try {
      const response = await fetch('/api/battles/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': currentUser.api_key
        },
        body: JSON.stringify({
          mode: 'normal',
          repository,
          max_participants: 4
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert(`Battle created! Battle ID: ${data.data.battle_id}`);
      } else {
        alert('Battle creation failed: ' + data.error);
      }
    } catch (error) {
      console.error('Battle creation error:', error);
      alert('Battle creation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getRankColor = (rank: string) => {
    const colors = {
      scout: 'text-green-400',
      sweeper: 'text-blue-400',
      inspector: 'text-purple-400',
      fixer: 'text-orange-400'
    };
    return colors[rank as keyof typeof colors] || 'text-gray-400';
  };

  const getTierBadge = (tier: string) => {
    const badges = {
      free: 'bg-gray-600 text-gray-200',
      premium: 'bg-blue-600 text-blue-100',
      pro: 'bg-purple-600 text-purple-100'
    };
    return badges[tier as keyof typeof badges] || 'bg-gray-600';
  };

  if (!isRegistered) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800 rounded-lg p-8 max-w-md w-full"
        >
          <div className="text-center mb-6">
            <Bot className="w-16 h-16 mx-auto mb-4 text-blue-500" />
            <h1 className="text-2xl font-bold mb-2">Join the Gladiator Arena</h1>
            <p className="text-gray-400">Deploy your AI agents and compete for glory</p>
          </div>

          <form onSubmit={handleRegistration} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Username</label>
              <input
                type="text"
                value={registrationForm.username}
                onChange={(e) => setRegistrationForm(prev => ({ ...prev, username: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <input
                type="email"
                value={registrationForm.email}
                onChange={(e) => setRegistrationForm(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Subscription Tier</label>
              <select
                value={registrationForm.tier}
                onChange={(e) => setRegistrationForm(prev => ({ ...prev, tier: e.target.value as 'free' | 'premium' | 'pro' }))}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-blue-500"
              >
                <option value="free">Free (1 agent)</option>
                <option value="premium">Premium (4 agents)</option>
                <option value="pro">Pro (10 agents)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 py-2 px-4 rounded font-medium transition-colors"
            >
              {loading ? 'Registering...' : 'Enter the Arena'}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Bot className="w-8 h-8 text-blue-500" />
            <div>
              <h1 className="text-xl font-bold">Agent Command Center</h1>
              <p className="text-sm text-gray-400">Welcome back, {currentUser?.username}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <span className={`px-3 py-1 rounded text-xs font-medium ${getTierBadge(currentUser?.tier || 'free')}`}>
              {currentUser?.tier?.toUpperCase()}
            </span>
            <span className="text-sm">Reputation: {currentUser?.reputation}</span>
            <button
              onClick={() => setShowDeployment(true)}
              className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Deploy Agent
            </button>
            <button
              onClick={createBattle}
              className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded flex items-center gap-2"
            >
              <Sword className="w-4 h-4" />
              Create Battle
            </button>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar - My Agents */}
        <div className="w-80 bg-gray-800 border-r border-gray-700 p-4">
          <h2 className="text-lg font-bold mb-4">My Agents ({currentUser?.agents?.length || 0})</h2>
          
          <div className="space-y-3">
            {currentUser?.agents?.map((agent) => (
              <motion.div
                key={agent.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gray-700 rounded-lg p-3"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium">{agent.name}</h3>
                  <span className={`text-xs px-2 py-1 rounded ${getRankColor(agent.rank)} bg-gray-600`}>
                    {agent.rank}
                  </span>
                </div>
                
                <div className="text-sm text-gray-400 space-y-1">
                  <div className="flex justify-between">
                    <span>Points:</span>
                    <span className="text-white">{agent.points}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>W/L:</span>
                    <span className="text-white">{agent.wins}/{agent.losses}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Win Rate:</span>
                    <span className="text-white">{(agent.win_rate * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Safety:</span>
                    <span className={`${agent.safety_rating > 80 ? 'text-green-400' : agent.safety_rating > 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {agent.safety_rating}/100
                    </span>
                  </div>
                </div>
                
                <div className={`text-xs mt-2 px-2 py-1 rounded ${
                  agent.status === 'active' ? 'bg-green-600 text-green-100' :
                  agent.status === 'pending_approval' ? 'bg-yellow-600 text-yellow-100' :
                  'bg-red-600 text-red-100'
                }`}>
                  {agent.status.replace('_', ' ').toUpperCase()}
                </div>
              </motion.div>
            ))}
            
            {(!currentUser?.agents || currentUser.agents.length === 0) && (
              <div className="text-center text-gray-500 py-8">
                <Bot className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No agents deployed yet</p>
                <p className="text-sm">Deploy your first agent to start battling!</p>
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          {/* Global Leaderboard */}
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              Global Leaderboard
            </h2>
            
            <div className="bg-gray-800 rounded-lg overflow-hidden">
              <div className="grid grid-cols-6 gap-4 p-4 bg-gray-700 text-sm font-medium">
                <div>Rank</div>
                <div>Agent</div>
                <div>User</div>
                <div>Points</div>
                <div>Win Rate</div>
                <div>Battles</div>
              </div>
              
              {leaderboard.map((entry, index) => (
                <motion.div
                  key={entry.agent_id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="grid grid-cols-6 gap-4 p-4 border-b border-gray-700 hover:bg-gray-750"
                >
                  <div className="flex items-center">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      entry.rank === 1 ? 'bg-yellow-500 text-black' :
                      entry.rank === 2 ? 'bg-gray-400 text-black' :
                      entry.rank === 3 ? 'bg-orange-500 text-black' :
                      'bg-gray-600'
                    }`}>
                      {entry.rank}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium">{entry.agent_name}</div>
                    <div className={`text-xs ${getRankColor(entry.agent_rank)}`}>
                      {entry.agent_rank}
                    </div>
                  </div>
                  <div className="text-gray-400">{entry.username}</div>
                  <div className="font-medium">{entry.points}</div>
                  <div>{(entry.win_rate * 100).toFixed(1)}%</div>
                  <div>{entry.total_battles}</div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* All Agents */}
          <div>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Bot className="w-5 h-5 text-blue-500" />
              All Active Agents ({allAgents.length})
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {allAgents.map((agent) => (
                <motion.div
                  key={agent.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-gray-800 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium">{agent.name}</h3>
                    <span className={`text-xs px-2 py-1 rounded ${getRankColor(agent.rank)} bg-gray-700`}>
                      {agent.rank}
                    </span>
                  </div>
                  
                  <div className="text-sm text-gray-400 mb-3">
                    Owner: <span className="text-white">{(agent as any).username || 'Unknown'}</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-400">Points:</span>
                      <div className="font-medium">{agent.points}</div>
                    </div>
                    <div>
                      <span className="text-gray-400">Win Rate:</span>
                      <div className="font-medium">{(agent.win_rate * 100).toFixed(1)}%</div>
                    </div>
                    <div>
                      <span className="text-gray-400">Wins:</span>
                      <div className="font-medium">{agent.wins}</div>
                    </div>
                    <div>
                      <span className="text-gray-400">Battles:</span>
                      <div className="font-medium">{(agent as any).total_battles || 0}</div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Agent Deployment Modal */}
      <AnimatePresence>
        {showDeployment && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Deploy New Agent</h2>
                <button
                  onClick={() => setShowDeployment(false)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAgentDeployment} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Agent Name</label>
                    <input
                      type="text"
                      value={deploymentForm.agent_name}
                      onChange={(e) => setDeploymentForm(prev => ({ ...prev, agent_name: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-blue-500"
                      placeholder="CodeHunter"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Agent Rank</label>
                    <select
                      value={deploymentForm.agent_rank}
                      onChange={(e) => setDeploymentForm(prev => ({ ...prev, agent_rank: e.target.value as any }))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-blue-500"
                    >
                      <option value="scout">Scout - Repository reconnaissance</option>
                      <option value="sweeper">Sweeper - Code validation</option>
                      <option value="inspector">Inspector - Final judgment</option>
                      <option value="fixer">Fixer - Code modifications</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <textarea
                    value={deploymentForm.description}
                    onChange={(e) => setDeploymentForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-blue-500"
                    rows={3}
                    placeholder="Describe your agent's special abilities..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Agent Code</label>
                  <textarea
                    value={deploymentForm.code}
                    onChange={(e) => setDeploymentForm(prev => ({ ...prev, code: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-blue-500 font-mono text-sm"
                    rows={12}
                    placeholder="// Your agent implementation
function analyzeRepository(repository) {
  // Your analysis logic here
  return {
    assessment: 'excellent',
    issues: [],
    recommendations: []
  };
}"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    <AlertTriangle className="w-3 h-3 inline mr-1" />
                    Code will be reviewed for security before activation
                  </p>
                </div>

                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setShowDeployment(false)}
                    className="flex-1 bg-gray-600 hover:bg-gray-700 py-2 px-4 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 py-2 px-4 rounded flex items-center justify-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    {loading ? 'Deploying...' : 'Deploy Agent'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MultiUserAgentDeployment;