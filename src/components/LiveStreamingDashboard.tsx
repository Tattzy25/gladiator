/**
 * Live Streaming Dashboard for AI Gladiator Battles
 * Real-time feed of all agent activities and battles
 */

import React, { useState, useEffect, useRef } from 'react';
import { useWebSocket } from '../lib/websocket';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, 
  Users, 
  Zap, 
  Shield, 
  Search, 
  Settings,
  Play,
  Pause,
  Volume2,
  VolumeX
} from 'lucide-react';

interface StreamEvent {
  id: string;
  timestamp: string;
  type: string;
  source: string;
  data: any;
  battle_id?: string;
  user_id?: string;
}

interface StreamChannel {
  name: string;
  subscribers: number;
  description: string;
  active: boolean;
}

export const LiveStreamingDashboard: React.FC = () => {
  const [selectedChannels, setSelectedChannels] = useState<string[]>(['unified_stream']);
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [isPlaying, setIsPlaying] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);
  const [channels, setChannels] = useState<StreamChannel[]>([]);
  const [metrics, setMetrics] = useState<any>({});
  
  const eventsContainerRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  
  const { connectionStatus, isConnected } = useWebSocket();

  // Initialize available channels
  useEffect(() => {
    const availableChannels: StreamChannel[] = [
      { name: 'unified_stream', subscribers: 0, description: 'All agent and system activities', active: true },
      { name: 'scout_stream', subscribers: 0, description: 'Scout agent reconnaissance', active: false },
      { name: 'sweeper_stream', subscribers: 0, description: 'Sweeper code validation', active: false },
      { name: 'inspector_stream', subscribers: 0, description: 'Inspector final judgment', active: false },
      { name: 'fixer_stream', subscribers: 0, description: 'Fixer code modifications', active: false },
      { name: 'judge_stream', subscribers: 0, description: 'Judge decisions and verdicts', active: false },
      { name: 'orchestrator_stream', subscribers: 0, description: 'System orchestrator events', active: false },
      { name: 'battle_stream', subscribers: 0, description: 'Battle-specific events', active: false }
    ];
    
    setChannels(availableChannels);
  }, []);

  // Subscribe to WebSocket events
  useEffect(() => {
    if (!isConnected) return;

    // Subscribe to selected channels
    selectedChannels.forEach(channel => {
      const socket = (window as any).socket;
      if (socket) {
        socket.emit('stream:subscribe', { channel });
      }
    });

    // Listen for stream events
    const socket = (window as any).socket;
    if (socket) {
      socket.on('stream:event', handleStreamEvent);
      socket.on('stream:history', handleStreamHistory);
      socket.on('stream:subscriber_count', handleSubscriberUpdate);
    }

    return () => {
      if (socket) {
        socket.off('stream:event', handleStreamEvent);
        socket.off('stream:history', handleStreamHistory);
        socket.off('stream:subscriber_count', handleSubscriberUpdate);
        
        // Unsubscribe from channels
        selectedChannels.forEach(channel => {
          socket.emit('stream:unsubscribe', { channel });
        });
      }
    };
  }, [isConnected, selectedChannels]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll && eventsContainerRef.current) {
      eventsContainerRef.current.scrollTop = eventsContainerRef.current.scrollHeight;
    }
  }, [events, autoScroll]);

  const handleStreamEvent = (event: StreamEvent) => {
    if (!isPlaying) return;
    
    setEvents(prev => {
      const newEvents = [...prev, event];
      // Keep only last 500 events for performance
      return newEvents.slice(-500);
    });
    
    // Play sound for important events
    if (soundEnabled && isImportantEvent(event.type)) {
      playEventSound(event.type);
    }
  };

  const handleStreamHistory = (data: { channel: string; events: StreamEvent[] }) => {
    setEvents(prev => {
      const existingIds = new Set(prev.map(e => e.id));
      const newEvents = data.events.filter(e => !existingIds.has(e.id));
      return [...prev, ...newEvents].slice(-500);
    });
  };

  const handleSubscriberUpdate = (data: { channel: string; count: number }) => {
    setChannels(prev => prev.map(ch => 
      ch.name === data.channel 
        ? { ...ch, subscribers: data.count }
        : ch
    ));
  };

  const toggleChannel = (channelName: string) => {
    setSelectedChannels(prev => {
      if (prev.includes(channelName)) {
        return prev.filter(ch => ch !== channelName);
      } else {
        return [...prev, channelName];
      }
    });
  };

  const isImportantEvent = (eventType: string): boolean => {
    return [
      'battle_started',
      'battle_ended',
      'agent_failed',
      'judge_verdict',
      'orchestrator_intervention'
    ].includes(eventType);
  };

  const playEventSound = (eventType: string) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    const ctx = audioContextRef.current;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    // Different sounds for different event types
    const frequencies: { [key: string]: number } = {
      battle_started: 800,
      battle_ended: 600,
      agent_failed: 300,
      judge_verdict: 1000,
      orchestrator_intervention: 1200
    };
    
    oscillator.frequency.setValueAtTime(frequencies[eventType] || 400, ctx.currentTime);
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.3);
  };

  const getEventIcon = (eventType: string) => {
    const iconMap: { [key: string]: React.ReactNode } = {
      agent_started: <Play className="w-4 h-4 text-green-500" />,
      agent_analyzing: <Activity className="w-4 h-4 text-blue-500 animate-pulse" />,
      agent_completed: <Shield className="w-4 h-4 text-green-500" />,
      agent_failed: <Zap className="w-4 h-4 text-red-500" />,
      battle_started: <Users className="w-4 h-4 text-purple-500" />,
      battle_ended: <Settings className="w-4 h-4 text-orange-500" />,
      judge_verdict: <Search className="w-4 h-4 text-yellow-500" />
    };
    
    return iconMap[eventType] || <Activity className="w-4 h-4 text-gray-500" />;
  };

  const formatEventData = (event: StreamEvent) => {
    switch (event.type) {
      case 'agent_analyzing':
        return `${event.data.currentAction} (${Math.round(event.data.progress || 0)}%)`;
      case 'battle_started':
        return `Battle started: ${event.data.participants?.length || 0} participants`;
      case 'battle_ended':
        return `Winner: ${event.data.winner_name || event.data.winner_id}`;
      case 'agent_deployed':
        return `${event.data.username} deployed ${event.data.agent_name} (${event.data.rank})`;
      default:
        return JSON.stringify(event.data).substring(0, 100) + '...';
    }
  };

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Sidebar - Channel Selection */}
      <div className="w-80 bg-gray-800 border-r border-gray-700 p-4">
        <div className="mb-6">
          <h2 className="text-xl font-bold mb-2">Live Streams</h2>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            {connectionStatus}
          </div>
        </div>

        {/* Controls */}
        <div className="mb-6 space-y-2">
          <div className="flex gap-2">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`flex items-center gap-2 px-3 py-2 rounded text-sm ${
                isPlaying ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {isPlaying ? 'Pause' : 'Play'}
            </button>
            
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`flex items-center gap-2 px-3 py-2 rounded text-sm ${
                soundEnabled ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-600 hover:bg-gray-700'
              }`}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>
          
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="rounded"
            />
            Auto-scroll
          </label>
        </div>

        {/* Channel List */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide">Channels</h3>
          {channels.map((channel) => (
            <div
              key={channel.name}
              className={`p-3 rounded cursor-pointer transition-colors ${
                selectedChannels.includes(channel.name)
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
              onClick={() => toggleChannel(channel.name)}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-sm">{channel.name.replace('_', ' ').toUpperCase()}</span>
                <span className="text-xs bg-gray-600 px-2 py-1 rounded">{channel.subscribers}</span>
              </div>
              <p className="text-xs text-gray-300">{channel.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content - Event Stream */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-gray-800 border-b border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">🏛️ AI Gladiator Live Arena</h1>
            <div className="flex items-center gap-4 text-sm">
              <span>Events: {events.length}</span>
              <span>Channels: {selectedChannels.length}</span>
              <span>Status: {isPlaying ? 'LIVE' : 'PAUSED'}</span>
            </div>
          </div>
        </div>

        {/* Event Stream */}
        <div 
          ref={eventsContainerRef}
          className="flex-1 overflow-y-auto p-4 space-y-2"
        >
          <AnimatePresence>
            {events.map((event) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-gray-800 rounded-lg p-4 border border-gray-700"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    {getEventIcon(event.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium text-sm">{event.source.toUpperCase()}</span>
                      <span className="text-xs bg-gray-700 px-2 py-1 rounded">{event.type}</span>
                      <span className="text-xs text-gray-400">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                      {event.battle_id && (
                        <span className="text-xs bg-purple-600 px-2 py-1 rounded">
                          Battle: {event.battle_id.slice(-8)}
                        </span>
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-300">
                      {formatEventData(event)}
                    </p>
                    
                    {event.data.username && (
                      <p className="text-xs text-gray-500 mt-1">
                        User: {event.data.username}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {events.length === 0 && (
            <div className="text-center text-gray-500 py-20">
              <Activity className="w-16 h-16 mx-auto mb-4 animate-pulse" />
              <p>Waiting for gladiator activities...</p>
              <p className="text-sm mt-2">Select channels and start streaming!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveStreamingDashboard;