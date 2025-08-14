import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Swords, 
  Users, 
  Trophy, 
  Settings, 
  Activity, 
  Menu, 
  X,
  Zap,
  Shield
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { useGladiatorStore } from '../lib/store';

const Navigation: React.FC = () => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { agents, battles } = useGladiatorStore();

  const activeBattles = battles.filter(b => b.status === 'active').length;
  const activeAgents = agents.filter(a => a.status === 'analyzing' || a.status === 'battling').length;

  const navItems = [
    {
      path: '/arena',
      label: 'Live Arena',
      icon: Swords,
      badge: activeBattles > 0 ? activeBattles : null,
      description: 'Watch live gladiator battles'
    },
    {
      path: '/agents',
      label: 'Command Center',
      icon: Users,
      badge: activeAgents > 0 ? activeAgents : null,
      description: 'Manage your AI gladiators'
    },
    {
      path: '/leaderboard',
      label: 'Leaderboard',
      icon: Trophy,
      badge: null,
      description: 'Rankings and standings'
    }
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      {/* Desktop Navigation */}
      <motion.nav 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="hidden md:flex fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-md border-b border-gold/20"
      >
        <div className="max-w-7xl mx-auto w-full px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link to="/arena" className="flex items-center gap-3 group">
              <div className="relative">
                <Shield className="w-8 h-8 text-gold group-hover:text-red-400 transition-colors" />
                <motion.div 
                  className="absolute inset-0 bg-gold/20 rounded-full blur-lg"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-gold via-red-400 to-gold bg-clip-text text-transparent">
                  AI GLADIATORS
                </h1>
                <p className="text-xs text-gray-400 -mt-1">Code Battle Arena</p>
              </div>
            </Link>

            {/* Navigation Items */}
            <div className="flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                
                return (
                  <Link key={item.path} to={item.path}>
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className={`relative px-4 py-2 rounded-lg transition-all duration-300 ${
                        active 
                          ? 'bg-gradient-to-r from-gold/20 to-red-400/20 text-gold border border-gold/30' 
                          : 'hover:bg-gray-800/50 text-gray-300 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className={`w-4 h-4 ${active ? 'text-gold' : ''}`} />
                        <span className="font-medium">{item.label}</span>
                        {item.badge && (
                          <Badge variant="battle" size="sm" className="ml-1">
                            {item.badge}
                          </Badge>
                        )}
                      </div>
                      
                      {active && (
                        <motion.div 
                          layoutId="activeTab"
                          className="absolute inset-0 bg-gradient-to-r from-gold/10 to-red-400/10 rounded-lg border border-gold/20"
                          style={{ zIndex: -1 }}
                        />
                      )}
                    </motion.div>
                  </Link>
                );
              })}
            </div>

            {/* Status Indicators */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-green-400" />
                <span className="text-sm text-gray-300">
                  {activeAgents}/{agents.length} Active
                </span>
              </div>
              
              <Button variant="ghost" size="sm">
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Navigation */}
      <motion.nav 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="md:hidden fixed top-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-md border-b border-gold/20"
      >
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Mobile Logo */}
            <Link to="/arena" className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-gold" />
              <span className="text-lg font-bold bg-gradient-to-r from-gold to-red-400 bg-clip-text text-transparent">
                GLADIATORS
              </span>
            </Link>

            {/* Mobile Menu Button */}
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>

          {/* Mobile Menu */}
          <motion.div
            initial={false}
            animate={{ 
              height: isMobileMenuOpen ? 'auto' : 0,
              opacity: isMobileMenuOpen ? 1 : 0
            }}
            className="overflow-hidden"
          >
            <div className="pt-4 pb-2 space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                
                return (
                  <Link 
                    key={item.path} 
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <motion.div
                      whileTap={{ scale: 0.98 }}
                      className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all ${
                        active 
                          ? 'bg-gradient-to-r from-gold/20 to-red-400/20 text-gold border border-gold/30' 
                          : 'hover:bg-gray-800/50 text-gray-300'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${active ? 'text-gold' : ''}`} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{item.label}</span>
                          {item.badge && (
                            <Badge variant="battle" size="sm">
                              {item.badge}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-1">{item.description}</p>
                      </div>
                    </motion.div>
                  </Link>
                );
              })}
              
              {/* Mobile Status */}
              <div className="px-3 py-2 mt-4 border-t border-gray-800">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">System Status</span>
                  <div className="flex items-center gap-2">
                    <Zap className="w-3 h-3 text-green-400" />
                    <span className="text-green-400">Online</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-gray-400">Active Agents</span>
                  <span className="text-white">{activeAgents}/{agents.length}</span>
                </div>
                {activeBattles > 0 && (
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span className="text-gray-400">Live Battles</span>
                    <Badge variant="battle" size="sm">{activeBattles}</Badge>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </motion.nav>

      {/* Spacer for fixed navigation */}
      <div className="h-20 md:h-24" />
    </>
  );
};

export default Navigation;