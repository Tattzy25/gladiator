import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { createGladiatorSystem, GladiatorSystem, AnalysisRequest, AnalysisResult, SystemStatus } from './gladiator-system';

// Agent Types
export type AgentRank = 'Scout' | 'Sweeper' | 'Inspector' | 'Fixer';
export type AgentStatus = 'idle' | 'analyzing' | 'battling' | 'resting';
export type BattleStatus = 'pending' | 'active' | 'completed';
export type BattleMode = 'normal' | 'urgent';

export interface Agent {
  id: string;
  name: string;
  rank: AgentRank;
  points: number;
  status: AgentStatus;
  personality: string;
  wins: number;
  losses: number;
  totalBattles: number;
  currentRepository?: string;
  lastActive: Date;
  avatar: string;
  specialties: string[];
  battleCry: string;
}

export interface Battle {
  id: string;
  mode: BattleMode;
  status: BattleStatus;
  participants: string[]; // Agent IDs
  repository: string;
  startTime: Date;
  endTime?: Date;
  winner?: string;
  scores: Record<string, number>;
  logs: BattleLog[];
  judgeNotes?: string;
}

export interface BattleLog {
  id: string;
  timestamp: Date;
  agentId: string;
  action: string;
  details: string;
  points: number;
}

export interface Repository {
  id: string;
  name: string;
  url: string;
  language: string;
  issues: number;
  lastAnalyzed?: Date;
  complexity: 'low' | 'medium' | 'high';
}

interface GladiatorStore {
  // Existing state
  agents: Agent[];
  activeAgent: Agent | null;
  battles: Battle[];
  activeBattle: Battle | null;
  repositories: Repository[];
  isArenaActive: boolean;
  selectedView: 'arena' | 'agents' | 'battles' | 'rankings';

  // New Gladiator System integration
  gladiatorSystem: GladiatorSystem | null;
  systemStatus: SystemStatus | null;
  analysisResults: AnalysisResult[];
  isSystemInitialized: boolean;
  emergencyStopActive: boolean;

  // Existing actions
  addAgent: (agent: Omit<Agent, 'id'>) => void;
  updateAgent: (id: string, updates: Partial<Agent>) => void;
  updateAgentStatus: (id: string, status: AgentStatus) => void;
  updateAgentPoints: (id: string, points: number) => void;
  promoteAgent: (id: string) => void;
  demoteAgent: (id: string) => void;
  startBattle: (mode: BattleMode, participantIds: string[], repository: string) => void;
  endBattle: (battleId: string, winnerId?: string) => void;
  addBattleLog: (battleId: string, log: Omit<BattleLog, 'id'>) => void;
  addRepository: (repo: Omit<Repository, 'id'>) => void;
  setActiveAgent: (agent: Agent | null) => void;
  setActiveBattle: (battle: Battle | null) => void;
  setArenaActive: (active: boolean) => void;
  setSelectedView: (view: 'arena' | 'agents' | 'battles' | 'rankings') => void;

  // New Gladiator System actions
  initializeSystem: (config?: any) => Promise<void>;
  shutdownSystem: () => Promise<void>;
  analyzeRepository: (request: AnalysisRequest) => Promise<string>;
  activateEmergencyStop: () => void;
  deactivateEmergencyStop: () => Promise<void>;
  updateSystemStatus: () => void;
  getAnalysisResult: (id: string) => AnalysisResult | null;
}

// Initial mock data
const initialAgents: Agent[] = [
  {
    id: 'agent-1',
    name: 'CodeHunter',
    rank: 'Scout',
    points: 150,
    status: 'idle',
    personality: 'Aggressive and thorough, never misses a bug',
    wins: 12,
    losses: 3,
    totalBattles: 15,
    lastActive: new Date(),
    avatar: '🏹',
    specialties: ['Bug Detection', 'Code Scanning'],
    battleCry: 'No bug escapes my sight!'
  },
  {
    id: 'agent-2',
    name: 'RefactorMaster',
    rank: 'Sweeper',
    points: 280,
    status: 'analyzing',
    personality: 'Methodical and precise, loves clean code',
    wins: 18,
    losses: 7,
    totalBattles: 25,
    currentRepository: 'react-app',
    lastActive: new Date(),
    avatar: '🧹',
    specialties: ['Code Cleanup', 'Performance'],
    battleCry: 'Clean code is the way!'
  },
  {
    id: 'agent-3',
    name: 'QualityGuard',
    rank: 'Inspector',
    points: 420,
    status: 'battling',
    personality: 'Strict and uncompromising, maintains high standards',
    wins: 25,
    losses: 5,
    totalBattles: 30,
    currentRepository: 'api-service',
    lastActive: new Date(),
    avatar: '🛡️',
    specialties: ['Quality Assurance', 'Standards'],
    battleCry: 'Excellence is non-negotiable!'
  },
  {
    id: 'agent-4',
    name: 'BugSlayer',
    rank: 'Fixer',
    points: 580,
    status: 'idle',
    personality: 'Calm and strategic, solves the toughest problems',
    wins: 35,
    losses: 8,
    totalBattles: 43,
    lastActive: new Date(),
    avatar: '⚔️',
    specialties: ['Critical Fixes', 'Architecture'],
    battleCry: 'Every problem has a solution!'
  }
];

const initialRepositories: Repository[] = [
  {
    id: 'repo-1',
    name: 'react-dashboard',
    url: 'https://github.com/example/react-dashboard',
    language: 'TypeScript',
    issues: 12,
    complexity: 'medium',
    lastAnalyzed: new Date(Date.now() - 3600000) // 1 hour ago
  },
  {
    id: 'repo-2',
    name: 'api-gateway',
    url: 'https://github.com/example/api-gateway',
    language: 'Node.js',
    issues: 8,
    complexity: 'high',
    lastAnalyzed: new Date(Date.now() - 7200000) // 2 hours ago
  },
  {
    id: 'repo-3',
    name: 'mobile-app',
    url: 'https://github.com/example/mobile-app',
    language: 'React Native',
    issues: 15,
    complexity: 'low'
  }
];

export const useGladiatorStore = create<GladiatorStore>()(subscribeWithSelector((set, get) => ({
  // Initial state
  agents: initialAgents,
  activeAgent: null,
  battles: [],
  activeBattle: null,
  repositories: initialRepositories,
  isArenaActive: false,
  selectedView: 'arena',
  
  // New Gladiator System state
  gladiatorSystem: null,
  systemStatus: null,
  analysisResults: [],
  isSystemInitialized: false,
  emergencyStopActive: false,
  
  // Agent actions
  addAgent: (agentData) => {
    const newAgent: Agent = {
      ...agentData,
      id: `agent-${Date.now()}`,
    };
    set((state) => ({ agents: [...state.agents, newAgent] }));
  },
  
  updateAgent: (id, updates) => {
    set((state) => ({
      agents: state.agents.map((agent) =>
        agent.id === id ? { ...agent, ...updates } : agent
      ),
    }));
  },
  
  updateAgentStatus: (id, status) => {
    set((state) => ({
      agents: state.agents.map((agent) =>
        agent.id === id ? { ...agent, status, lastActive: new Date() } : agent
      ),
    }));
  },
  
  updateAgentPoints: (id, points) => {
    set((state) => ({
      agents: state.agents.map((agent) =>
        agent.id === id ? { ...agent, points } : agent
      ),
    }));
  },
  
  promoteAgent: (id) => {
    const rankOrder: AgentRank[] = ['Scout', 'Sweeper', 'Inspector', 'Fixer'];
    set((state) => ({
      agents: state.agents.map((agent) => {
        if (agent.id === id) {
          const currentIndex = rankOrder.indexOf(agent.rank);
          const newRank = currentIndex < rankOrder.length - 1 
            ? rankOrder[currentIndex + 1] 
            : agent.rank;
          return { ...agent, rank: newRank, points: agent.points + 50 };
        }
        return agent;
      }),
    }));
  },
  
  demoteAgent: (id) => {
    const rankOrder: AgentRank[] = ['Scout', 'Sweeper', 'Inspector', 'Fixer'];
    set((state) => ({
      agents: state.agents.map((agent) => {
        if (agent.id === id) {
          const currentIndex = rankOrder.indexOf(agent.rank);
          const newRank = currentIndex > 0 
            ? rankOrder[currentIndex - 1] 
            : agent.rank;
          return { ...agent, rank: newRank, points: Math.max(0, agent.points - 30) };
        }
        return agent;
      }),
    }));
  },
  
  // Battle actions
  startBattle: (mode, participantIds, repository) => {
    const newBattle: Battle = {
      id: `battle-${Date.now()}`,
      mode,
      status: 'active',
      participants: participantIds,
      repository,
      startTime: new Date(),
      scores: {},
      logs: []
    };
    
    // Update participant agents to battling status
    set((state) => ({
      battles: [...state.battles, newBattle],
      activeBattle: newBattle,
      agents: state.agents.map((agent) =>
        participantIds.includes(agent.id)
          ? { ...agent, status: 'battling' as AgentStatus, currentRepository: repository }
          : agent
      ),
    }));
  },
  
  endBattle: (battleId, winnerId) => {
    set((state) => {
      const battle = state.battles.find(b => b.id === battleId);
      if (!battle) return state;
      
      const updatedBattle = {
        ...battle,
        status: 'completed' as BattleStatus,
        endTime: new Date(),
        winner: winnerId
      };
      
      return {
        battles: state.battles.map(b => b.id === battleId ? updatedBattle : b),
        activeBattle: state.activeBattle?.id === battleId ? null : state.activeBattle,
        agents: state.agents.map((agent) => {
          if (battle.participants.includes(agent.id)) {
            const isWinner = agent.id === winnerId;
            return {
              ...agent,
              status: 'idle' as AgentStatus,
              wins: isWinner ? agent.wins + 1 : agent.wins,
              losses: !isWinner ? agent.losses + 1 : agent.losses,
              totalBattles: agent.totalBattles + 1,
              points: isWinner ? agent.points + 25 : Math.max(0, agent.points - 10),
              currentRepository: undefined
            };
          }
          return agent;
        })
      };
    });
  },
  
  addBattleLog: (battleId, logData) => {
    const newLog: BattleLog = {
      ...logData,
      id: `log-${Date.now()}`
    };
    
    set((state) => ({
      battles: state.battles.map((battle) =>
        battle.id === battleId
          ? { ...battle, logs: [...battle.logs, newLog] }
          : battle
      ),
    }));
  },
  
  // Repository actions
  addRepository: (repoData) => {
    const newRepo: Repository = {
      ...repoData,
      id: `repo-${Date.now()}`,
    };
    set((state) => ({ repositories: [...state.repositories, newRepo] }));
  },
  
  // UI actions
  setActiveAgent: (agent) => set({ activeAgent: agent }),
  setActiveBattle: (battle) => set({ activeBattle: battle }),
  setArenaActive: (active) => set({ isArenaActive: active }),
  setSelectedView: (view) => set({ selectedView: view }),

  // New Gladiator System actions
  initializeSystem: async (config = {}) => {
    try {
      const system = createGladiatorSystem(config);
      await system.initialize();
      set({ 
        gladiatorSystem: system, 
        isSystemInitialized: true,
        emergencyStopActive: false
      });
      
      // Start status monitoring
      const updateStatus = () => {
        const status = system.getSystemStatus();
        set({ 
          systemStatus: status,
          emergencyStopActive: status.emergencyStopActive 
        });
      };
      
      // Update status every 5 seconds
      setInterval(updateStatus, 5000);
      updateStatus(); // Initial update
      
    } catch (error) {
      console.error('Failed to initialize Gladiator System:', error);
      throw error;
    }
  },

  shutdownSystem: async () => {
    const { gladiatorSystem } = get();
    if (gladiatorSystem) {
      await gladiatorSystem.shutdown();
      set({ 
        gladiatorSystem: null, 
        isSystemInitialized: false,
        systemStatus: null,
        emergencyStopActive: false
      });
    }
  },

  analyzeRepository: async (request: AnalysisRequest) => {
    const { gladiatorSystem } = get();
    if (!gladiatorSystem) {
      throw new Error('Gladiator System not initialized');
    }
    
    const analysisId = await gladiatorSystem.analyzeRepository(request);
    
    // Update analysis results
    const results = gladiatorSystem.getAllAnalysisResults();
    set({ analysisResults: results });
    
    return analysisId;
  },

  activateEmergencyStop: () => {
    const { gladiatorSystem } = get();
    if (gladiatorSystem) {
      gladiatorSystem.activateEmergencyStop();
      set({ emergencyStopActive: true });
    }
  },

  deactivateEmergencyStop: async () => {
    const { gladiatorSystem } = get();
    if (gladiatorSystem) {
      await gladiatorSystem.deactivateEmergencyStop();
      set({ emergencyStopActive: false });
    }
  },

  updateSystemStatus: () => {
    const { gladiatorSystem } = get();
    if (gladiatorSystem) {
      const status = gladiatorSystem.getSystemStatus();
      const results = gladiatorSystem.getAllAnalysisResults();
      set({ 
        systemStatus: status, 
        analysisResults: results,
        emergencyStopActive: status.emergencyStopActive
      });
    }
  },

  getAnalysisResult: (id: string) => {
    const { gladiatorSystem } = get();
    return gladiatorSystem ? gladiatorSystem.getAnalysisResult(id) : null;
  },
})));