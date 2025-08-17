import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Play, 
  Square, 
  AlertTriangle, 
  Shield, 
  Activity,
  GitBranch,
  Zap,
  Settings
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { useGladiatorStore } from '../lib/store';

const SystemControl: React.FC = () => {
  const {
    isSystemInitialized,
    systemStatus,
    emergencyStopActive,
    analysisResults,
    initializeSystem,
    shutdownSystem,
    activateEmergencyStop,
    deactivateEmergencyStop,
    analyzeRepository,
    updateSystemStatus
  } = useGladiatorStore();

  const [repositoryUrl, setRepositoryUrl] = useState('');
  const [analysisMode, setAnalysisMode] = useState<'normal' | 'urgent'>('normal');
  const [isLoading, setIsLoading] = useState(false);

  // Update system status periodically
  useEffect(() => {
    if (isSystemInitialized) {
      const interval = setInterval(() => {
        updateSystemStatus();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [isSystemInitialized, updateSystemStatus]);

  const handleInitializeSystem = async () => {
    setIsLoading(true);
    try {
      await initializeSystem({
        enableEmergencyStop: true,
        maxConcurrentAnalyses: 3,
        agentTimeoutMinutes: 10,
        judgeMonitoringIntervalSeconds: 5,
        autoPromotionEnabled: true,
        autoDemotionEnabled: true
      });
    } catch (error) {
      console.error('Failed to initialize system:', error);
      alert('Failed to initialize system. Check console for details.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleShutdownSystem = async () => {
    setIsLoading(true);
    try {
      await shutdownSystem();
    } catch (error) {
      console.error('Failed to shutdown system:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnalyzeRepository = async () => {
    if (!repositoryUrl.trim()) {
      alert('Please enter a repository URL');
      return;
    }

    setIsLoading(true);
    try {
      const analysisId = await analyzeRepository({
        repositoryUrl: repositoryUrl.trim(),
        mode: analysisMode,
        priority: 'medium',
        requestedBy: 'ui-user'
      });
      
      alert(`Analysis started! ID: ${analysisId}`);
      setRepositoryUrl('');
    } catch (error) {
      console.error('Failed to start analysis:', error);
      alert('Failed to start analysis. Check console for details.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmergencyStop = () => {
    if (emergencyStopActive) {
      deactivateEmergencyStop();
    } else {
      activateEmergencyStop();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gold via-red-400 to-gold bg-clip-text text-transparent mb-2">
            🏛️ AI GLADIATOR SYSTEM
          </h1>
          <p className="text-gray-400 text-lg">
            Production-Ready AI Code Analysis Arena
          </p>
        </div>

        <div className="space-y-6">
          {/* System Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                System Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className={`text-2xl font-bold ${isSystemInitialized ? 'text-green-500' : 'text-gray-500'}`}>
                    {isSystemInitialized ? 'ACTIVE' : 'OFFLINE'}
                  </div>
                  <div className="text-sm text-gray-600">System Status</div>
                </div>
                
                {systemStatus && (
                  <>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-500">
                        {systemStatus.activeAgents}
                      </div>
                      <div className="text-sm text-gray-600">Active Agents</div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-500">
                        {systemStatus.activeAnalyses}
                      </div>
                      <div className="text-sm text-gray-600">Active Analyses</div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-500">
                        {systemStatus.completedAnalyses}
                      </div>
                      <div className="text-sm text-gray-600">Completed</div>
                    </div>
                  </>
                )}
              </div>

              {systemStatus?.disqualifiedAgents > 0 && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2 text-red-700">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="font-medium">
                      {systemStatus.disqualifiedAgents} agent(s) disqualified
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* System Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                System Controls
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {!isSystemInitialized ? (
                  <Button
                    onClick={handleInitializeSystem}
                    disabled={isLoading}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Initialize System
                  </Button>
                ) : (
                  <Button
                    onClick={handleShutdownSystem}
                    disabled={isLoading}
                    variant="secondary"
                  >
                    <Square className="w-4 h-4 mr-2" />
                    Shutdown System
                  </Button>
                )}

                {isSystemInitialized && (
                  <Button
                    onClick={handleEmergencyStop}
                    disabled={isLoading}
                    variant={emergencyStopActive ? "success" : "secondary"}
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    {emergencyStopActive ? 'Deactivate Emergency Stop' : 'Emergency Stop'}
                  </Button>
                )}
              </div>

              {emergencyStopActive && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2 text-red-700">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="font-medium">
                      Emergency Stop Active - All agent activities halted
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Repository Analysis */}
          {isSystemInitialized && !emergencyStopActive && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitBranch className="w-5 h-5" />
                  Repository Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Repository URL
                    </label>
                    <input
                      type="text"
                      value={repositoryUrl}
                      onChange={(e) => setRepositoryUrl(e.target.value)}
                      placeholder="https://github.com/owner/repository"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Analysis Mode
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setAnalysisMode('normal')}
                        className={`px-4 py-2 rounded-md ${
                          analysisMode === 'normal'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        Normal (Sequential)
                      </button>
                      <button
                        onClick={() => setAnalysisMode('urgent')}
                        className={`px-4 py-2 rounded-md ${
                          analysisMode === 'urgent'
                            ? 'bg-red-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        Urgent (Battle Royale)
                      </button>
                    </div>
                  </div>

                  <Button
                    onClick={handleAnalyzeRepository}
                    disabled={isLoading || !repositoryUrl.trim()}
                    className="w-full"
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    Start Analysis
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Analysis Results */}
          {analysisResults.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recent Analysis Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analysisResults.slice(-5).reverse().map((result) => (
                    <motion.div
                      key={result.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <div className="font-medium text-sm text-black">
                          {result.repositoryUrl.split('/').slice(-2).join('/')}
                        </div>
                        <div className="text-xs text-gray-500">
                          {result.startTime.toLocaleString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            result.status === 'completed' ? 'victory' :
                            result.status === 'failed' ? 'defeat' :
                            result.status === 'emergency_stopped' ? 'offline' :
                            'warning'
                          }
                        >
                          {result.status}
                        </Badge>
                        {result.verdict && (
                          <Badge variant="default">
                            {result.verdict.finalDecision}
                          </Badge>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default SystemControl;