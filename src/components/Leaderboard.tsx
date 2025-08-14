import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, 
  Medal, 
  Crown, 
  Sword, 
  Shield, 
  Target, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Filter,
  Calendar,
  BarChart3
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { useGladiatorStore } from '../lib/store';

type SortBy = 'points' | 'winRate' | 'battles' | 'rank';
type TimeFilter = 'all' | 'week' | 'month';

const Leaderboard: React.FC = () => {
  const { agents, battles } = useGladiatorStore();
  const [sortBy, setSortBy] = useState<SortBy>('points');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [showStats, setShowStats] = useState(false);

  const getRankIcon = (rank: string, position: number) => {
    if (position === 0) return <Crown className="w-5 h-5 text-gold" />;
    if (position === 1) return <Medal className="w-5 h-5 text-silver" />;
    if (position === 2) return <Trophy className="w-5 h-5 text-amber-600" />;
    
    switch (rank) {
      case 'Champion': return <Crown className="w-4 h-4 text-gold" />;
      case 'Gladiator': return <Sword className="w-4 h-4 text-red-400" />;
      case 'Warrior': return <Shield className="w-4 h-4 text-green-400" />;
      case 'Scout': return <Target className="w-4 h-4 text-blue-400" />;
      default: return <Minus className="w-4 h-4 text-gray-400" />;
    }
  };

  const getRankColor = (rank: string) => {
    switch (rank) {
      case 'Champion': return 'text-gold';
      case 'Gladiator': return 'text-red-400';
      case 'Warrior': return 'text-green-400';
      case 'Scout': return 'text-blue-400';
      default: return 'text-gray-400';
    }
  };

  const getPositionBadge = (position: number) => {
    if (position === 0) return 'champion';
    if (position <= 2) return 'battle';
    if (position <= 4) return 'victory';
    return 'default';
  };

  const getWinRate = (wins: number, losses: number) => {
    const total = wins + losses;
    return total > 0 ? Math.round((wins / total) * 100) : 0;
  };

  const getTrend = (agent: any) => {
    // Simple trend calculation based on recent performance
    const recentBattles = battles
      .filter(b => b.participants.includes(agent.id))
      .slice(-5);
    
    if (recentBattles.length < 2) return 'stable';
    
    const recentWins = recentBattles.filter(b => 
      b.winner === agent.id
    ).length;
    
    const winRate = recentWins / recentBattles.length;
    
    if (winRate > 0.6) return 'up';
    if (winRate < 0.4) return 'down';
    return 'stable';
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-green-400" />;
      case 'down': return <TrendingDown className="w-4 h-4 text-red-400" />;
      default: return <Minus className="w-4 h-4 text-gray-400" />;
    }
  };

  const sortedAgents = useMemo(() => {
    const agentsWithStats = agents.map(agent => ({
      ...agent,
      winRate: getWinRate(agent.wins, agent.losses),
      totalBattles: agent.wins + agent.losses,
      trend: getTrend(agent)
    }));

    return agentsWithStats.sort((a, b) => {
      switch (sortBy) {
        case 'points':
          return b.points - a.points;
        case 'winRate':
          return b.winRate - a.winRate;
        case 'battles':
          return b.totalBattles - a.totalBattles;
        case 'rank':
          const rankOrder = { 'Champion': 4, 'Gladiator': 3, 'Warrior': 2, 'Scout': 1 };
          return (rankOrder[b.rank as keyof typeof rankOrder] || 0) - (rankOrder[a.rank as keyof typeof rankOrder] || 0);
        default:
          return b.points - a.points;
      }
    });
  }, [agents, battles, sortBy]);

  const totalBattles = battles.length;
  const activeBattles = battles.filter(b => b.status === 'active').length;
  const totalAgents = agents.length;
  const activeAgents = agents.filter(a => a.status === 'analyzing' || a.status === 'battling').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-gold via-red-400 to-gold bg-clip-text text-transparent">
                Gladiator Leaderboard
              </h1>
              <p className="text-gray-400 mt-2">Rankings and tournament standings</p>
            </div>
            <Button 
              variant="outline" 
              onClick={() => setShowStats(!showStats)}
              className="flex items-center gap-2"
            >
              <BarChart3 className="w-4 h-4" />
              {showStats ? 'Hide Stats' : 'Show Stats'}
            </Button>
          </div>

          {/* Stats Overview */}
          <AnimatePresence>
            {showStats && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
              >
                <Card variant="arena" className="p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gold">{totalAgents}</div>
                    <div className="text-sm text-gray-400">Total Agents</div>
                    <div className="text-xs text-green-400 mt-1">{activeAgents} active</div>
                  </div>
                </Card>
                <Card variant="arena" className="p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-400">{totalBattles}</div>
                    <div className="text-sm text-gray-400">Total Battles</div>
                    <div className="text-xs text-blue-400 mt-1">{activeBattles} ongoing</div>
                  </div>
                </Card>
                <Card variant="arena" className="p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">
                      {Math.round(agents.reduce((acc, a) => acc + getWinRate(a.wins, a.losses), 0) / agents.length)}%
                    </div>
                    <div className="text-sm text-gray-400">Avg Win Rate</div>
                  </div>
                </Card>
                <Card variant="arena" className="p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-silver">
                      {Math.round(agents.reduce((acc, a) => acc + a.points, 0) / agents.length)}
                    </div>
                    <div className="text-sm text-gray-400">Avg Points</div>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Filters */}
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-400">Sort by:</span>
              <div className="flex gap-1">
                {[
                  { key: 'points', label: 'Points' },
                  { key: 'winRate', label: 'Win Rate' },
                  { key: 'battles', label: 'Battles' },
                  { key: 'rank', label: 'Rank' }
                ].map(({ key, label }) => (
                  <Button
                    key={key}
                    variant={sortBy === key ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => setSortBy(key as SortBy)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Leaderboard */}
        <div className="space-y-4">
          <AnimatePresence>
            {sortedAgents.map((agent, index) => (
              <motion.div
                key={agent.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.01 }}
              >
                <Card 
                  variant={index < 3 ? 'neon' : 'default'} 
                  className="transition-all duration-300"
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      {/* Position and Agent Info */}
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3">
                          <Badge variant={getPositionBadge(index)} className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">
                            {index + 1}
                          </Badge>
                          {getRankIcon(agent.rank, index)}
                        </div>
                        
                        <div>
                          <div className="flex items-center gap-3">
                            <h3 className="text-lg font-bold">{agent.name}</h3>
                            <Badge variant={agent.status === 'analyzing' ? 'online' : agent.status === 'battling' ? 'battle' : agent.status === 'resting' ? 'warning' : 'default'} size="sm">
                              {agent.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-sm font-medium ${getRankColor(agent.rank)}`}>
                              {agent.rank}
                            </span>
                            <span className="text-xs text-gray-400">•</span>
                            <span className="text-xs text-gray-400">{agent.specialties?.[0] || 'General'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-8">
                        <div className="text-center">
                          <div className="text-xl font-bold text-gold">{agent.points}</div>
                          <div className="text-xs text-gray-400">Points</div>
                        </div>
                        
                        <div className="text-center">
                          <div className="text-lg font-bold">{agent.winRate}%</div>
                          <div className="text-xs text-gray-400">Win Rate</div>
                        </div>
                        
                        <div className="text-center">
                          <div className="text-lg font-bold text-green-400">{agent.wins}</div>
                          <div className="text-xs text-gray-400">Wins</div>
                        </div>
                        
                        <div className="text-center">
                          <div className="text-lg font-bold text-red-400">{agent.losses}</div>
                          <div className="text-xs text-gray-400">Losses</div>
                        </div>
                        
                        <div className="text-center">
                          <div className="text-lg font-bold">{agent.totalBattles}</div>
                          <div className="text-xs text-gray-400">Battles</div>
                        </div>

                        {/* Trend */}
                        <div className="flex items-center gap-1">
                          {getTrendIcon(agent.trend)}
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar for Points */}
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                        <span>Progress to next rank</span>
                        <span>{agent.points}/500</span>
                      </div>
                      <div className="w-full bg-gray-800 rounded-full h-2">
                        <motion.div 
                          className="bg-gradient-to-r from-gold to-red-400 h-2 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min((agent.points / 500) * 100, 100)}%` }}
                          transition={{ duration: 1, delay: index * 0.1 }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Empty State */}
        {sortedAgents.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <Trophy className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-400 mb-2">No Gladiators Yet</h3>
            <p className="text-gray-500">Start your first battle to see rankings appear here.</p>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Leaderboard;