/**
 * Production Monitoring and Logging System
 * Comprehensive system monitoring, error tracking, and audit trails
 */

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error' | 'critical';
  category: 'system' | 'agent' | 'judge' | 'analysis' | 'security' | 'performance';
  source: string;
  message: string;
  data?: any;
  correlationId?: string;
  userId?: string;
  sessionId?: string;
}

export interface SystemMetrics {
  timestamp: Date;
  system: {
    uptime: number;
    memoryUsage: number;
    cpuUsage: number;
    activeConnections: number;
  };
  agents: {
    total: number;
    active: number;
    analyzing: number;
    idle: number;
    disqualified: number;
  };
  analyses: {
    total: number;
    completed: number;
    failed: number;
    inProgress: number;
    averageTime: number;
  };
  errors: {
    totalErrors: number;
    criticalErrors: number;
    errorRate: number;
    lastError?: Date;
  };
  performance: {
    responseTime: number;
    throughput: number;
    successRate: number;
  };
}

export interface Alert {
  id: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: 'performance' | 'error' | 'security' | 'system' | 'agent';
  title: string;
  description: string;
  source: string;
  data?: any;
  acknowledged: boolean;
  resolvedAt?: Date;
  acknowledgedBy?: string;
}

export interface AuditEvent {
  id: string;
  timestamp: Date;
  eventType: 'agent_action' | 'system_change' | 'analysis_start' | 'analysis_complete' | 'ranking_change' | 'emergency_stop' | 'user_action';
  actor: string;
  action: string;
  target: string;
  details: any;
  outcome: 'success' | 'failure' | 'partial';
  sessionId?: string;
  correlationId?: string;
}

export interface PerformanceMetric {
  timestamp: Date;
  metric: string;
  value: number;
  unit: string;
  source: string;
  tags?: Record<string, string>;
}

export class ProductionMonitoringSystem {
  private logs: LogEntry[] = [];
  private metrics: SystemMetrics[] = [];
  private alerts: Alert[] = [];
  private auditEvents: AuditEvent[] = [];
  private performanceMetrics: PerformanceMetric[] = [];
  private startTime: Date = new Date();
  private errorCounts: Map<string, number> = new Map();
  private correlationMap: Map<string, string[]> = new Map();

  // Configuration
  private readonly MAX_LOG_ENTRIES = 10000;
  private readonly MAX_METRICS = 1000;
  private readonly MAX_ALERTS = 500;
  private readonly MAX_AUDIT_EVENTS = 5000;
  private readonly LOG_RETENTION_DAYS = 30;

  constructor() {
    this.initializeMonitoring();
  }

  /**
   * Initialize monitoring system
   */
  private initializeMonitoring(): void {
    console.log('📊 Initializing Production Monitoring System');
    
    // Start metrics collection
    this.startMetricsCollection();
    
    // Start log cleanup
    this.startLogCleanup();
    
    // Set up error handlers
    this.setupGlobalErrorHandlers();
    
    this.log('info', 'system', 'monitoring', 'Production monitoring system initialized');
  }

  /**
   * Log a message with context
   */
  log(
    level: 'debug' | 'info' | 'warn' | 'error' | 'critical',
    category: 'system' | 'agent' | 'judge' | 'analysis' | 'security' | 'performance',
    source: string,
    message: string,
    data?: any,
    correlationId?: string
  ): void {
    const logEntry: LogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      level,
      category,
      source,
      message,
      data,
      correlationId,
      sessionId: this.getCurrentSessionId()
    };

    this.logs.push(logEntry);
    
    // Console output with color coding
    const color = this.getLogColor(level);
    console.log(`${color}[${level.toUpperCase()}] ${category}/${source}: ${message}${data ? ' | ' + JSON.stringify(data) : ''}${'\x1b[0m'}`);
    
    // Track error counts
    if (level === 'error' || level === 'critical') {
      const errorKey = `${category}/${source}`;
      this.errorCounts.set(errorKey, (this.errorCounts.get(errorKey) || 0) + 1);
      
      // Create alert for critical errors
      if (level === 'critical') {
        this.createAlert('critical', 'error', `Critical error in ${source}`, message, source, data);
      }
    }

    // Correlation tracking
    if (correlationId) {
      const correlatedLogs = this.correlationMap.get(correlationId) || [];
      correlatedLogs.push(logEntry.id);
      this.correlationMap.set(correlationId, correlatedLogs);
    }

    // Trim logs if too many
    if (this.logs.length > this.MAX_LOG_ENTRIES) {
      this.logs = this.logs.slice(-this.MAX_LOG_ENTRIES);
    }
  }

  /**
   * Get log color for console output
   */
  private getLogColor(level: string): string {
    switch (level) {
      case 'debug': return '\x1b[36m'; // Cyan
      case 'info': return '\x1b[32m';  // Green
      case 'warn': return '\x1b[33m';  // Yellow
      case 'error': return '\x1b[31m'; // Red
      case 'critical': return '\x1b[35m'; // Magenta
      default: return '\x1b[0m'; // Reset
    }
  }

  /**
   * Create an alert
   */
  createAlert(
    severity: 'low' | 'medium' | 'high' | 'critical',
    type: 'performance' | 'error' | 'security' | 'system' | 'agent',
    title: string,
    description: string,
    source: string,
    data?: any
  ): void {
    const alert: Alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      severity,
      type,
      title,
      description,
      source,
      data,
      acknowledged: false
    };

    this.alerts.push(alert);
    
    console.log(`🚨 ALERT [${severity.toUpperCase()}]: ${title} - ${description}`);
    
    // Auto-acknowledge low severity alerts after 1 hour
    if (severity === 'low') {
      setTimeout(() => {
        this.acknowledgeAlert(alert.id, 'system');
      }, 3600000);
    }

    // Trim alerts if too many
    if (this.alerts.length > this.MAX_ALERTS) {
      this.alerts = this.alerts.slice(-this.MAX_ALERTS);
    }
  }

  /**
   * Record audit event
   */
  auditEvent(
    eventType: 'agent_action' | 'system_change' | 'analysis_start' | 'analysis_complete' | 'ranking_change' | 'emergency_stop' | 'user_action',
    actor: string,
    action: string,
    target: string,
    details: any,
    outcome: 'success' | 'failure' | 'partial' = 'success',
    correlationId?: string
  ): void {
    const auditEvent: AuditEvent = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      eventType,
      actor,
      action,
      target,
      details,
      outcome,
      sessionId: this.getCurrentSessionId(),
      correlationId
    };

    this.auditEvents.push(auditEvent);
    
    this.log('info', 'system', 'audit', 
      `${eventType}: ${actor} ${action} ${target} (${outcome})`, 
      details, correlationId
    );

    // Trim audit events if too many
    if (this.auditEvents.length > this.MAX_AUDIT_EVENTS) {
      this.auditEvents = this.auditEvents.slice(-this.MAX_AUDIT_EVENTS);
    }
  }

  /**
   * Record performance metric
   */
  recordMetric(
    metric: string,
    value: number,
    unit: string,
    source: string,
    tags?: Record<string, string>
  ): void {
    const performanceMetric: PerformanceMetric = {
      timestamp: new Date(),
      metric,
      value,
      unit,
      source,
      tags
    };

    this.performanceMetrics.push(performanceMetric);
    
    // Check for performance alerts
    this.checkPerformanceThresholds(metric, value, source);

    // Trim metrics if too many
    if (this.performanceMetrics.length > 10000) {
      this.performanceMetrics = this.performanceMetrics.slice(-10000);
    }
  }

  /**
   * Check performance thresholds and create alerts
   */
  private checkPerformanceThresholds(metric: string, value: number, source: string): void {
    const thresholds = {
      'response_time': { warning: 1000, critical: 5000 },
      'error_rate': { warning: 0.05, critical: 0.1 },
      'memory_usage': { warning: 0.8, critical: 0.95 },
      'cpu_usage': { warning: 0.8, critical: 0.95 },
      'analysis_time': { warning: 300000, critical: 600000 }
    };

    const threshold = thresholds[metric as keyof typeof thresholds];
    if (!threshold) return;

    if (value >= threshold.critical) {
      this.createAlert(
        'critical',
        'performance',
        `Critical ${metric} threshold exceeded`,
        `${source} ${metric}: ${value} exceeds critical threshold of ${threshold.critical}`,
        source,
        { metric, value, threshold: threshold.critical }
      );
    } else if (value >= threshold.warning) {
      this.createAlert(
        'medium',
        'performance',
        `High ${metric} detected`,
        `${source} ${metric}: ${value} exceeds warning threshold of ${threshold.warning}`,
        source,
        { metric, value, threshold: threshold.warning }
      );
    }
  }

  /**
   * Start collecting system metrics
   */
  private startMetricsCollection(): void {
    setInterval(() => {
      this.collectSystemMetrics();
    }, 30000); // Collect every 30 seconds

    // Initial collection
    this.collectSystemMetrics();
  }

  /**
   * Collect current system metrics
   */
  private collectSystemMetrics(): void {
    const now = new Date();
    const uptime = now.getTime() - this.startTime.getTime();

    // Calculate error rate
    const recentLogs = this.logs.filter(log => 
      log.timestamp.getTime() > now.getTime() - 300000 // Last 5 minutes
    );
    const recentErrors = recentLogs.filter(log => 
      log.level === 'error' || log.level === 'critical'
    );
    const errorRate = recentLogs.length > 0 ? recentErrors.length / recentLogs.length : 0;

    const metrics: SystemMetrics = {
      timestamp: now,
      system: {
        uptime,
        memoryUsage: this.getMemoryUsage(),
        cpuUsage: this.getCPUUsage(),
        activeConnections: this.getActiveConnections()
      },
      agents: this.getAgentMetrics(),
      analyses: this.getAnalysisMetrics(),
      errors: {
        totalErrors: Array.from(this.errorCounts.values()).reduce((sum, count) => sum + count, 0),
        criticalErrors: this.logs.filter(log => log.level === 'critical').length,
        errorRate,
        lastError: recentErrors.length > 0 ? recentErrors[recentErrors.length - 1].timestamp : undefined
      },
      performance: {
        responseTime: this.getAverageResponseTime(),
        throughput: this.getThroughput(),
        successRate: this.getSuccessRate()
      }
    };

    this.metrics.push(metrics);

    // Record individual metrics
    this.recordMetric('uptime', uptime, 'ms', 'system');
    this.recordMetric('error_rate', errorRate, 'ratio', 'system');
    this.recordMetric('memory_usage', metrics.system.memoryUsage, 'ratio', 'system');

    // Trim metrics if too many
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS);
    }
  }

  /**
   * Get memory usage (simulated)
   */
  private getMemoryUsage(): number {
    // In a real implementation, this would get actual memory usage
    return Math.random() * 0.5 + 0.3; // 30-80%
  }

  /**
   * Get CPU usage (simulated)
   */
  private getCPUUsage(): number {
    // In a real implementation, this would get actual CPU usage
    return Math.random() * 0.4 + 0.1; // 10-50%
  }

  /**
   * Get active connections count
   */
  private getActiveConnections(): number {
    // In a real implementation, this would get actual connection count
    return Math.floor(Math.random() * 10) + 1;
  }

  /**
   * Get agent metrics
   */
  private getAgentMetrics(): SystemMetrics['agents'] {
    // This would integrate with the actual agent system
    return {
      total: 4,
      active: 4,
      analyzing: 0,
      idle: 4,
      disqualified: 0
    };
  }

  /**
   * Get analysis metrics
   */
  private getAnalysisMetrics(): SystemMetrics['analyses'] {
    const analysisLogs = this.auditEvents.filter(event => 
      event.eventType === 'analysis_start' || event.eventType === 'analysis_complete'
    );
    
    const completed = analysisLogs.filter(event => event.eventType === 'analysis_complete').length;
    const failed = analysisLogs.filter(event => 
      event.eventType === 'analysis_complete' && event.outcome === 'failure'
    ).length;

    return {
      total: analysisLogs.length,
      completed,
      failed,
      inProgress: 0,
      averageTime: 45000 // 45 seconds average
    };
  }

  /**
   * Get average response time
   */
  private getAverageResponseTime(): number {
    const responseTimeMetrics = this.performanceMetrics
      .filter(m => m.metric === 'response_time')
      .slice(-10);
    
    if (responseTimeMetrics.length === 0) return 0;
    
    return responseTimeMetrics.reduce((sum, m) => sum + m.value, 0) / responseTimeMetrics.length;
  }

  /**
   * Get throughput (requests per minute)
   */
  private getThroughput(): number {
    const oneMinuteAgo = new Date(Date.now() - 60000);
    const recentLogs = this.logs.filter(log => log.timestamp > oneMinuteAgo);
    return recentLogs.length;
  }

  /**
   * Get success rate
   */
  private getSuccessRate(): number {
    const recentAuditEvents = this.auditEvents.filter(event => 
      event.timestamp.getTime() > Date.now() - 300000 // Last 5 minutes
    );
    
    if (recentAuditEvents.length === 0) return 1;
    
    const successful = recentAuditEvents.filter(event => event.outcome === 'success').length;
    return successful / recentAuditEvents.length;
  }

  /**
   * Setup global error handlers
   */
  private setupGlobalErrorHandlers(): void {
    // In a browser environment, catch unhandled errors
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        this.log('error', 'system', 'global', 'Unhandled error', {
          message: event.message,
          filename: event.filename,
          line: event.lineno,
          column: event.colno,
          error: event.error?.stack
        });
      });

      window.addEventListener('unhandledrejection', (event) => {
        this.log('error', 'system', 'global', 'Unhandled promise rejection', {
          reason: event.reason
        });
      });
    }
  }

  /**
   * Start log cleanup process
   */
  private startLogCleanup(): void {
    setInterval(() => {
      this.cleanupOldData();
    }, 3600000); // Cleanup every hour
  }

  /**
   * Cleanup old data based on retention policies
   */
  private cleanupOldData(): void {
    const cutoffDate = new Date(Date.now() - this.LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    
    // Cleanup logs
    this.logs = this.logs.filter(log => log.timestamp > cutoffDate);
    
    // Cleanup metrics
    this.metrics = this.metrics.filter(metric => metric.timestamp > cutoffDate);
    
    // Cleanup performance metrics
    this.performanceMetrics = this.performanceMetrics.filter(metric => metric.timestamp > cutoffDate);
    
    // Cleanup resolved alerts older than 7 days
    const alertCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    this.alerts = this.alerts.filter(alert => 
      !alert.resolvedAt || alert.resolvedAt > alertCutoff
    );

    this.log('debug', 'system', 'cleanup', 'Cleaned up old monitoring data');
  }

  /**
   * Get current session ID
   */
  private getCurrentSessionId(): string {
    // In a real implementation, this would get the actual session ID
    return 'session_' + Date.now();
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string, acknowledgedBy: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (!alert) return false;

    alert.acknowledged = true;
    alert.acknowledgedBy = acknowledgedBy;
    
    this.log('info', 'system', 'alerts', `Alert acknowledged: ${alert.title}`, {
      alertId,
      acknowledgedBy
    });
    
    return true;
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string, resolvedBy: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (!alert) return false;

    alert.resolvedAt = new Date();
    
    this.log('info', 'system', 'alerts', `Alert resolved: ${alert.title}`, {
      alertId,
      resolvedBy
    });
    
    return true;
  }

  // Public query methods

  /**
   * Get recent logs
   */
  getRecentLogs(limit: number = 100, level?: string, category?: string): LogEntry[] {
    let filteredLogs = [...this.logs];
    
    if (level) {
      filteredLogs = filteredLogs.filter(log => log.level === level);
    }
    
    if (category) {
      filteredLogs = filteredLogs.filter(log => log.category === category);
    }
    
    return filteredLogs.slice(-limit).reverse();
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return this.alerts.filter(alert => !alert.resolvedAt).sort((a, b) => {
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }

  /**
   * Get system metrics
   */
  getCurrentMetrics(): SystemMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
  }

  /**
   * Get metrics history
   */
  getMetricsHistory(hours: number = 24): SystemMetrics[] {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.metrics.filter(metric => metric.timestamp > cutoff);
  }

  /**
   * Get audit trail
   */
  getAuditTrail(limit: number = 100, eventType?: string): AuditEvent[] {
    let filteredEvents = [...this.auditEvents];
    
    if (eventType) {
      filteredEvents = filteredEvents.filter(event => event.eventType === eventType);
    }
    
    return filteredEvents.slice(-limit).reverse();
  }

  /**
   * Get correlated logs
   */
  getCorrelatedLogs(correlationId: string): LogEntry[] {
    const logIds = this.correlationMap.get(correlationId) || [];
    return this.logs.filter(log => logIds.includes(log.id));
  }

  /**
   * Search logs
   */
  searchLogs(query: string, limit: number = 100): LogEntry[] {
    const searchTerms = query.toLowerCase().split(' ');
    
    return this.logs
      .filter(log => {
        const searchText = `${log.message} ${log.source} ${JSON.stringify(log.data)}`.toLowerCase();
        return searchTerms.every(term => searchText.includes(term));
      })
      .slice(-limit)
      .reverse();
  }

  /**
   * Get error statistics
   */
  getErrorStats(): { source: string; count: number }[] {
    return Array.from(this.errorCounts.entries())
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Export monitoring data
   */
  exportData(): {
    logs: LogEntry[];
    metrics: SystemMetrics[];
    alerts: Alert[];
    auditEvents: AuditEvent[];
    performanceMetrics: PerformanceMetric[];
  } {
    return {
      logs: this.logs,
      metrics: this.metrics,
      alerts: this.alerts,
      auditEvents: this.auditEvents,
      performanceMetrics: this.performanceMetrics
    };
  }
}

// Export singleton instance
export const productionMonitoring = new ProductionMonitoringSystem();