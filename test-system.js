/**
 * Test the AI Gladiator System functionality
 */

import { createGladiatorSystem } from '../src/lib/gladiator-system';

async function testGladiatorSystem() {
  console.log('🏛️ Testing AI Gladiator System...');

  try {
    // Create system with test configuration
    const system = createGladiatorSystem({
      enableEmergencyStop: true,
      maxConcurrentAnalyses: 2,
      agentTimeoutMinutes: 5,
      judgeMonitoringIntervalSeconds: 5,
      autoPromotionEnabled: true,
      autoDemotionEnabled: true
    });

    // Initialize the system
    console.log('⚡ Initializing system...');
    await system.initialize();
    
    // Check system status
    console.log('📊 System status:');
    const status = system.getSystemStatus();
    console.log(status);

    // Test repository analysis (using a mock repository)
    console.log('🔍 Starting repository analysis...');
    const analysisId = await system.analyzeRepository({
      repositoryUrl: 'test/mock-repository',
      mode: 'normal',
      priority: 'medium',
      requestedBy: 'test-user',
      maxTimeMinutes: 3
    });
    
    console.log(`📝 Analysis started with ID: ${analysisId}`);

    // Monitor analysis for a short time
    console.log('⏱️ Monitoring analysis progress...');
    for (let i = 0; i < 10; i++) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      
      const result = system.getAnalysisResult(analysisId);
      if (result) {
        console.log(`Status: ${result.status}, Started: ${result.startTime.toISOString()}`);
        
        if (result.status === 'completed' || result.status === 'failed') {
          console.log('✅ Analysis completed');
          if (result.verdict) {
            console.log(`📋 Verdict: ${result.verdict.finalDecision}`);
          }
          break;
        }
      }
    }

    // Test emergency stop
    console.log('🚨 Testing emergency stop...');
    system.activateEmergencyStop();
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const emergencyStatus = system.getSystemStatus();
    console.log('Emergency stop status:', emergencyStatus.emergencyStopActive);

    // Deactivate emergency stop
    console.log('✅ Deactivating emergency stop...');
    await system.deactivateEmergencyStop();
    
    // Get final statistics
    console.log('📈 Final statistics:');
    const stats = system.getAnalysisStatistics();
    console.log(stats);

    // Shutdown system
    console.log('🏁 Shutting down system...');
    await system.shutdown();
    
    console.log('✅ Test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testGladiatorSystem();