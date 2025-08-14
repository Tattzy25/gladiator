import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, Crown, Zap, Users, Trophy, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { useGladiatorStore, type Agent, type Battle } from '../lib/store';

const Arena: React.FC = () => {
  const {
    agents,
    activeBattle,
    battles,
    isArenaActive,
    startBattle,
    endBattle,
    addBattleLog,
    setArenaActive
  } = useGladiatorStore();

  const [battleTimer, setBattleTimer] = useState(0);
  const [liveEvents, setLiveEvents] = useState<string[]>([]);

  // Simulate battle events
  useEffect(() => {
    if (activeBattle && activeBattle.status === 'active') {
      const interval = setInterval(() => {
        setBattleTimer(prev => prev + 1);
        
        // Generate random battle events
        const events = [
          `${getAgentName(activeBattle.participants[0])} scans for vulnerabilities...`,
          `${getAgentName(activeBattle.participants[1])} detects code smell!`,
          `Critical issue found in authentication module!`,
          `${getAgentName(activeBattle.participants[0])} proposes fix strategy`,
          `Battle intensity increasing...`,
          `${getAgentName(activeBattle.participants[1])} challenges the approach!`
        ];
        
        const randomEvent = events[Math.floor(Math.random() * events.length)];
        setLiveEvents(prev => [randomEvent, ...prev.slice(0, 4)]);
        
        // Add battle log
        addBattleLog(activeBattle.id, {
          timestamp: new Date(),
          agentId: activeBattle.participants[Math.floor(Math.random() * activeBattle.participants.length)],
          action: 'analysis',
          details: randomEvent,
          points: Math.floor(Math.random() * 10) + 1
        });
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [activeBattle, addBattleLog]);

  const getAgentName = (agentId: string) => {
    return agents.find(a => a.id === agentId)?.name || 'Unknown';
  };

  const getAgentByRank = (rank: string) => {
    return agents.filter(a => a.rank === rank);
  };

  const startRandomBattle = () => {
    const availableAgents = agents.filter(a => a.status === 'idle');
    if (availableAgents.length >= 2) {
      const participants = availableAgents
        .sort(() => Math.random() - 0.5)
        .slice(0, 2)
        .map(a => a.id);
      
      startBattle('normal', participants, 'react-dashboard');
      setArenaActive(true);
      setBattleTimer(0);
      setLiveEvents([]);
    }
  };

  const endCurrentBattle = () => {
    if (activeBattle) {
      const winnerId = activeBattle.participants[Math.floor(Math.random() * activeBattle.participants.length)];
      endBattle(activeBattle.id, winnerId);
      setArenaActive(false);
      setBattleTimer(0);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      {/* Arena Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1 className="text-6xl font-bold bg-gradient-to-r from-yellow-400 via-red-500 to-yellow-400 bg-clip-text text-transparent mb-4">
          ⚔️ GLADIATOR ARENA ⚔️
        </h1>
        <p className="text-xl text-gray-300">Where Code Warriors Battle for Glory</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Battle Arena */}
        <div className="lg:col-span-2">
          <Card variant="arena" size="lg" glowEffect animated>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Swords className="w-6 h-6" />
                Live Battle Arena
                {activeBattle && (
                  <Badge variant="battle" pulse>
                    LIVE
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeBattle ? (
                <div className="space-y-6">
                  {/* Battle Info */}
                  <div className="flex justify-between items-center p-4 bg-red-900/20 rounded-lg border border-red-500/30">
                    <div>
                      <h3 className="text-lg font-semibold text-red-400">Battle in Progress</h3>
                      <p className="text-gray-300">Repository: {activeBattle.repository}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-mono text-yellow-400">{formatTime(battleTimer)}</div>
                      <div className="text-sm text-gray-400">Battle Time</div>
                    </div>
                  </div>

                  {/* Combatants */}
                  <div className="grid grid-cols-2 gap-4">
                    {activeBattle.participants.map((agentId, index) => {
                      const agent = agents.find(a => a.id === agentId);
                      if (!agent) return null;
                      
                      return (
                        <motion.div
                          key={agentId}
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: index * 0.2 }}
                          className="p-4 bg-gradient-to-br from-gray-900/50 to-black/50 rounded-lg border border-yellow-400/30"
                        >
                          <div className="text-center">
                            <div className="text-4xl mb-2">{agent.avatar}</div>
                            <h4 className="text-lg font-bold text-yellow-400">{agent.name}</h4>
                            <Badge variant={agent.rank.toLowerCase() as any} size="sm">
                              {agent.rank}
                            </Badge>
                            <div className="mt-2 text-sm text-gray-300">
                              {agent.points} points
                            </div>
                            <div className="mt-1 text-xs text-gray-400 italic">
                              "{agent.battleCry}"
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* Live Events */}
                  <div className="bg-black/40 rounded-lg p-4 border border-yellow-400/20">
                    <h4 className="text-lg font-semibold text-yellow-400 mb-3 flex items-center gap-2">
                      <Activity className="w-5 h-5" />
                      Live Battle Feed
                    </h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      <AnimatePresence>
                        {liveEvents.map((event, index) => (
                          <motion.div
                            key={`${event}-${index}`}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="text-sm text-gray-300 p-2 bg-gray-900/30 rounded border-l-2 border-yellow-400/50"
                          >
                            {event}
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </div>

                  <Button variant="secondary" onClick={endCurrentBattle} className="w-full">
                    End Battle
                  </Button>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">⚔️</div>
                  <h3 className="text-2xl font-bold text-gray-400 mb-4">Arena Awaits Warriors</h3>
                  <p className="text-gray-500 mb-6">No active battles. Start a new gladiator combat!</p>
                  <Button variant="primary" size="lg" onClick={startRandomBattle}>
                    <Zap className="w-5 h-5 mr-2" />
                    Start Battle
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Gladiator Rankings */}
        <div className="space-y-6">
          {/* Champion */}
          <Card variant="victory" glowEffect>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="w-6 h-6" />
                Current Champion
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const champion = agents.reduce((prev, current) => 
                  prev.points > current.points ? prev : current
                );
                return (
                  <div className="text-center">
                    <div className="text-5xl mb-3">{champion.avatar}</div>
                    <h3 className="text-xl font-bold text-yellow-400">{champion.name}</h3>
                    <Badge variant="champion" glow>
                      {champion.rank}
                    </Badge>
                    <div className="mt-3 text-lg font-semibold text-green-400">
                      {champion.points} Points
                    </div>
                    <div className="text-sm text-gray-300 mt-2">
                      {champion.wins}W - {champion.losses}L
                    </div>
                  </div>
                );
              })()
            }
            </CardContent>
          </Card>

          {/* Agent Status */}
          <Card variant="default">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-6 h-6" />
                Gladiator Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {agents.map((agent) => (
                  <motion.div
                    key={agent.id}
                    whileHover={{ scale: 1.02 }}
                    className="flex items-center justify-between p-3 bg-gray-900/30 rounded-lg border border-gray-700/50"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{agent.avatar}</span>
                      <div>
                        <div className="font-semibold text-yellow-400">{agent.name}</div>
                        <div className="text-xs text-gray-400">{agent.rank}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge 
                        variant={agent.status === 'battling' ? 'battle' : 
                                agent.status === 'analyzing' ? 'warning' : 'online'}
                        size="sm"
                      >
                        {agent.status}
                      </Badge>
                      <div className="text-xs text-gray-400 mt-1">
                        {agent.points} pts
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Battles */}
          <Card variant="default">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-6 h-6" />
                Recent Battles
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {battles.slice(-3).reverse().map((battle) => (
                  <div key={battle.id} className="p-3 bg-gray-900/30 rounded-lg border border-gray-700/50">
                    <div className="flex justify-between items-center">
                      <div className="text-sm">
                        <span className="text-yellow-400">{getAgentName(battle.participants[0])}</span>
                        <span className="text-gray-400"> vs </span>
                        <span className="text-yellow-400">{getAgentName(battle.participants[1])}</span>
                      </div>
                      <Badge 
                        variant={battle.status === 'completed' ? 'victory' : 'battle'}
                        size="sm"
                      >
                        {battle.status}
                      </Badge>
                    </div>
                    {battle.winner && (
                      <div className="text-xs text-green-400 mt-1">
                        Winner: {getAgentName(battle.winner)}
                      </div>
                    )}
                  </div>
                ))}
                {battles.length === 0 && (
                  <div className="text-center text-gray-500 py-4">
                    No battles yet
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Arena;