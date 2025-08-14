import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, 
  Shield, 
  Sword, 
  Trophy, 
  Activity, 
  Settings, 
  Play, 
  Pause, 
  RotateCcw,
  Crown,
  Target,
  GitBranch
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { useGladiatorStore } from '../lib/store';
import { webSocketService } from '../lib/websocket';

const AgentCenter: React.FC = () => {
  const { agents, updateAgent, battles } = useGladiatorStore();
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState(false);

  useEffect(() => {
    const ws = webSocketService;
    ws.connect();
    
    const checkConnection = () => {
      setWsConnected(ws.isConnected());
    };
    
    const interval = setInterval(checkConnection, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleAgentAction = (agentId: string, action: 'activate' | 'deactivate' | 'reset') => {
    const agent = agents.find(a => a.id === agentId);
    if (!agent) return;

    switch (action) {
      case 'activate':
        updateAgent(agentId, { status: 'analyzing', lastActive: new Date() });
        webSocketService.sendAgentCommand(agentId, 'activate');
        break;
      case 'deactivate':
        updateAgent(agentId, { status: 'idle' });
        webSocketService.sendAgentCommand(agentId, 'deactivate');
        break;
      case 'reset':
        updateAgent(agentId, { 
          wins: 0, 
          losses: 0, 
          points: 0, 
          status: 'idle'
        });
        webSocketService.sendAgentCommand(agentId, 'reset');
        break;
    }
  };

  const getAgentRankIcon = (rank: string) => {
    switch (rank) {
      case 'Champion': return <Crown className="w-4 h-4" />;
      case 'Gladiator': return <Sword className="w-4 h-4" />;
      case 'Warrior': return <Shield className="w-4 h-4" />;
      case 'Scout': return <Target className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const getAgentStatusColor = (status: string) => {
    switch (status) {
      case 'analyzing': return 'online';
      case 'battling': return 'battle';
      case 'idle': return 'default';
      case 'resting': return 'warning';
      default: return 'default';
    }
  };

  const getWinRate = (wins: number, losses: number) => {
    const total = wins + losses;
    return total > 0 ? Math.round((wins / total) * 100) : 0;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-gold via-red-400 to-gold bg-clip-text text-transparent">
                Agent Command Center
              </h1>
              <p className="text-gray-400 mt-2">Monitor and control your AI gladiators</p>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant={wsConnected ? 'online' : 'default'} className="px-4 py-2">
                <Activity className="w-4 h-4 mr-2" />
                {wsConnected ? 'Connected' : 'Disconnected'}
              </Badge>
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Agent Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <AnimatePresence>
            {agents.map((agent, index) => (
              <motion.div
                key={agent.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.02 }}
                className="cursor-pointer"
                onClick={() => setSelectedAgent(selectedAgent === agent.id ? null : agent.id)}
              >
                <Card 
                  variant={selectedAgent === agent.id ? 'neon' : 'default'} 
                  className="h-full transition-all duration-300"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getAgentRankIcon(agent.rank)}
                        <div>
                          <CardTitle className="text-lg">{agent.name}</CardTitle>
                          <p className="text-sm text-gray-400">{agent.rank}</p>
                        </div>
                      </div>
                      <Badge variant={getAgentStatusColor(agent.status)}>
                        {agent.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Stats */}
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <div className="text-2xl font-bold text-green-400">{agent.wins}</div>
                          <div className="text-xs text-gray-400">Wins</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-red-400">{agent.losses}</div>
                          <div className="text-xs text-gray-400">Losses</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-gold">{getWinRate(agent.wins, agent.losses)}%</div>
                          <div className="text-xs text-gray-400">Win Rate</div>
                        </div>
                      </div>

                      {/* Points and Specialty */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Trophy className="w-4 h-4 text-gold" />
                          <span className="text-sm font-medium">{agent.points} pts</span>
                        </div>
                        <div className="text-xs text-gray-400">
                          {agent.specialties?.[0] || 'General'}
                        </div>
                      </div>

                      {/* Current Repository */}
                      {agent.currentRepository && (
                        <div className="bg-gray-800/50 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <GitBranch className="w-3 h-3 text-blue-400" />
                            <span className="text-xs font-medium text-blue-400">Current Repository</span>
                          </div>
                          <p className="text-xs text-gray-300 truncate">{agent.currentRepository}</p>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-2 pt-2">
                        {agent.status === 'idle' ? (
                          <Button 
                            variant="success" 
                            size="sm" 
                            className="flex-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAgentAction(agent.id, 'activate');
                            }}
                          >
                            <Play className="w-3 h-3 mr-1" />
                            Activate
                          </Button>
                        ) : (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAgentAction(agent.id, 'deactivate');
                            }}
                          >
                            <Pause className="w-3 h-3 mr-1" />
                            Deactivate
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAgentAction(agent.id, 'reset');
                          }}
                        >
                          <RotateCcw className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Selected Agent Details */}
        <AnimatePresence>
          {selectedAgent && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <Card variant="arena" className="p-6">
                <h3 className="text-xl font-bold mb-4 text-gold">Agent Details</h3>
                {(() => {
                  const agent = agents.find(a => a.id === selectedAgent);
                  if (!agent) return null;
                  
                  const agentBattles = battles.filter(b => 
                    b.participants.some(p => p === agent.id)
                  ).slice(0, 5);

                  return (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Agent Info */}
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-semibold mb-2">Performance Metrics</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-gray-400">Total Battles:</span>
                              <span>{agent.wins + agent.losses}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Points:</span>
                              <span className="text-gold">{agent.points}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Rank:</span>
                              <span>{agent.rank}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Specialty:</span>
                              <span>{agent.specialties?.[0] || 'General'}</span>
                            </div>
                            {agent.lastActive && (
                              <div className="flex justify-between">
                                <span className="text-gray-400">Last Active:</span>
                                <span>{agent.lastActive.toLocaleTimeString()}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Recent Battles */}
                      <div>
                        <h4 className="font-semibold mb-2">Recent Battles</h4>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {agentBattles.length > 0 ? (
                            agentBattles.map((battle) => {
                              const isParticipant = battle.participants.includes(agent.id);
                              const isWinner = battle.winner === agent.id;
                              
                              return (
                                <div key={battle.id} className="bg-gray-800/30 rounded p-3">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm font-medium">{battle.repository}</span>
                                    <Badge variant={isWinner ? 'victory' : battle.status === 'completed' ? 'default' : 'default'} size="sm">
                                      {isWinner ? 'won' : battle.status === 'completed' ? 'lost' : battle.status}
                                    </Badge>
                                  </div>
                                  <div className="text-xs text-gray-400">
                                    {battle.startTime.toLocaleString()}
                                  </div>
                                  {isWinner && (
                                    <div className="text-xs text-gold mt-1">
                                      +25 points
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          ) : (
                            <p className="text-gray-400 text-sm">No recent battles</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AgentCenter;