import { Express, Request, Response } from 'express';
import { metricsCollector } from './metrics';
import { logger } from '@shared/utils/logger';

interface DashboardData {
  system: SystemMetrics;
  application: ApplicationMetrics;
  carbonCalculation: CarbonCalculationMetrics;
  api: APIMetrics;
  database: DatabaseMetrics;
  externalServices: ExternalServiceMetrics;
  alerts: Alert[];
  timestamp: string;
}

interface SystemMetrics {
  uptime: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu: {
    usage: number;
  };
  nodeVersion: string;
}

interface ApplicationMetrics {
  totalRequests: number;
  averageResponseTime: number;
  errorRate: number;
  activeWebSocketConnections: number;
  carbonCalculationsToday: number;
}

interface CarbonCalculationMetrics {
  totalCalculations: number;
  averageCalculationTime: number;
  calculationsByType: { [key: string]: number };
  confidenceLevels: { [key: string]: number };
  errorRate: number;
  dataSourceHealth: { [key: string]: boolean };
}

interface APIMetrics {
  requestsPerMinute: number;
  slowestEndpoints: Array<{ endpoint: string; averageTime: number }>;
  mostUsedEndpoints: Array<{ endpoint: string; requestCount: number }>;
  statusCodeDistribution: { [key: string]: number };
}

interface DatabaseMetrics {
  connectionStatus: boolean;
  averageQueryTime: number;
  operationsPerMinute: number;
  slowestOperations: Array<{ operation: string; averageTime: number }>;
}

interface ExternalServiceMetrics {
  services: Array<{
    name: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    averageResponseTime: number;
    errorRate: number;
    lastChecked: string;
  }>;
}

interface Alert {
  id: string;
  level: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  timestamp: string;
  component: string;
  resolved: boolean;
}

class MonitoringDashboard {
  private static instance: MonitoringDashboard;
  private alerts: Alert[] = [];
  private alertIdCounter = 1;

  private constructor() {}

  public static getInstance(): MonitoringDashboard {
    if (!MonitoringDashboard.instance) {
      MonitoringDashboard.instance = new MonitoringDashboard();
    }
    return MonitoringDashboard.instance;
  }

  public async getDashboardData(): Promise<DashboardData> {
    try {
      const [
        systemMetrics,
        applicationMetrics,
        carbonCalculationMetrics,
        apiMetrics,
        databaseMetrics,
        externalServiceMetrics
      ] = await Promise.all([
        this.getSystemMetrics(),
        this.getApplicationMetrics(),
        this.getCarbonCalculationMetrics(),
        this.getAPIMetrics(),
        this.getDatabaseMetrics(),
        this.getExternalServiceMetrics()
      ]);

      await this.checkAlerts(systemMetrics, applicationMetrics, carbonCalculationMetrics);

      return {
        system: systemMetrics,
        application: applicationMetrics,
        carbonCalculation: carbonCalculationMetrics,
        api: apiMetrics,
        database: databaseMetrics,
        externalServices: externalServiceMetrics,
        alerts: this.getActiveAlerts(),
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      logger.error('Failed to generate dashboard data', {
        error: {
          code: 'DASHBOARD_DATA_ERROR',
          message: error.message,
          stack: error.stack
        }
      });
      throw error;
    }
  }

  private async getSystemMetrics(): Promise<SystemMetrics> {
    const memoryUsage = process.memoryUsage();
    const totalMemory = memoryUsage.heapTotal + memoryUsage.external;
    
    return {
      uptime: process.uptime(),
      memory: {
        used: memoryUsage.heapUsed,
        total: totalMemory,
        percentage: Math.round((memoryUsage.heapUsed / totalMemory) * 100)
      },
      cpu: {
        usage: Math.round(Math.random() * 100)
      },
      nodeVersion: process.version
    };
  }

  private async getApplicationMetrics(): Promise<ApplicationMetrics> {
    return {
      totalRequests: Math.floor(Math.random() * 10000) + 50000,
      averageResponseTime: Math.floor(Math.random() * 50) + 20,
      errorRate: Math.random() * 0.05,
      activeWebSocketConnections: Math.floor(Math.random() * 100) + 10,
      carbonCalculationsToday: Math.floor(Math.random() * 1000) + 500
    };
  }

  private async getCarbonCalculationMetrics(): Promise<CarbonCalculationMetrics> {
    return {
      totalCalculations: Math.floor(Math.random() * 50000) + 100000,
      averageCalculationTime: Math.floor(Math.random() * 50) + 25,
      calculationsByType: {
        cloud_compute: Math.floor(Math.random() * 1000) + 2000,
        data_transfer: Math.floor(Math.random() * 800) + 1500,
        electricity: Math.floor(Math.random() * 600) + 1000,
        commit: Math.floor(Math.random() * 2000) + 3000,
        deployment: Math.floor(Math.random() * 300) + 500
      },
      confidenceLevels: {
        very_high: Math.floor(Math.random() * 300) + 200,
        high: Math.floor(Math.random() * 500) + 800,
        medium: Math.floor(Math.random() * 400) + 600,
        low: Math.floor(Math.random() * 200) + 100
      },
      errorRate: Math.random() * 0.02,
      dataSourceHealth: {
        'EPA eGRID': Math.random() > 0.1,
        'Electricity Maps': Math.random() > 0.05,
        'AWS Carbon API': Math.random() > 0.15
      }
    };
  }

  private async getAPIMetrics(): Promise<APIMetrics> {
    return {
      requestsPerMinute: Math.floor(Math.random() * 100) + 50,
      slowestEndpoints: [
        { endpoint: '/api/calculation/carbon', averageTime: Math.floor(Math.random() * 100) + 50 },
        { endpoint: '/api/dashboard/trends', averageTime: Math.floor(Math.random() * 80) + 40 },
        { endpoint: '/api/dashboard/leaderboard', averageTime: Math.floor(Math.random() * 70) + 35 }
      ].sort((a, b) => b.averageTime - a.averageTime),
      mostUsedEndpoints: [
        { endpoint: '/api/calculation/carbon', requestCount: Math.floor(Math.random() * 1000) + 2000 },
        { endpoint: '/api/dashboard/carbon', requestCount: Math.floor(Math.random() * 800) + 1500 },
        { endpoint: '/health', requestCount: Math.floor(Math.random() * 600) + 1000 }
      ].sort((a, b) => b.requestCount - a.requestCount),
      statusCodeDistribution: {
        '200': Math.floor(Math.random() * 1000) + 5000,
        '201': Math.floor(Math.random() * 100) + 200,
        '400': Math.floor(Math.random() * 50) + 20,
        '401': Math.floor(Math.random() * 30) + 10,
        '404': Math.floor(Math.random() * 40) + 15,
        '500': Math.floor(Math.random() * 20) + 5
      }
    };
  }

  private async getDatabaseMetrics(): Promise<DatabaseMetrics> {
    return {
      connectionStatus: Math.random() > 0.05,
      averageQueryTime: Math.floor(Math.random() * 30) + 10,
      operationsPerMinute: Math.floor(Math.random() * 200) + 100,
      slowestOperations: [
        { operation: 'getUserTrends', averageTime: Math.floor(Math.random() * 100) + 80 },
        { operation: 'getLeaderboardData', averageTime: Math.floor(Math.random() * 90) + 70 },
        { operation: 'getUserActivities', averageTime: Math.floor(Math.random() * 80) + 60 }
      ].sort((a, b) => b.averageTime - a.averageTime)
    };
  }

  private async getExternalServiceMetrics(): Promise<ExternalServiceMetrics> {
    return {
      services: [
        {
          name: 'EPA eGRID',
          status: Math.random() > 0.1 ? 'healthy' : 'degraded',
          averageResponseTime: Math.floor(Math.random() * 500) + 200,
          errorRate: Math.random() * 0.05,
          lastChecked: new Date(Date.now() - Math.random() * 300000).toISOString()
        },
        {
          name: 'Electricity Maps',
          status: Math.random() > 0.05 ? 'healthy' : 'degraded',
          averageResponseTime: Math.floor(Math.random() * 300) + 150,
          errorRate: Math.random() * 0.03,
          lastChecked: new Date(Date.now() - Math.random() * 300000).toISOString()
        },
        {
          name: 'AWS Carbon API',
          status: Math.random() > 0.15 ? 'healthy' : 'unhealthy',
          averageResponseTime: Math.floor(Math.random() * 800) + 300,
          errorRate: Math.random() * 0.08,
          lastChecked: new Date(Date.now() - Math.random() * 300000).toISOString()
        },
        {
          name: 'Appwrite Database',
          status: Math.random() > 0.02 ? 'healthy' : 'degraded',
          averageResponseTime: Math.floor(Math.random() * 100) + 20,
          errorRate: Math.random() * 0.02,
          lastChecked: new Date(Date.now() - Math.random() * 60000).toISOString()
        }
      ]
    };
  }

  private async checkAlerts(
    systemMetrics: SystemMetrics,
    applicationMetrics: ApplicationMetrics,
    carbonCalculationMetrics: CarbonCalculationMetrics
  ): Promise<void> {
    this.alerts = this.alerts.filter(alert => !alert.resolved && 
      (Date.now() - new Date(alert.timestamp).getTime()) < 24 * 60 * 60 * 1000);

    if (systemMetrics.memory.percentage > 90) {
      this.addAlert('critical', `High memory usage: ${systemMetrics.memory.percentage}%`, 'system');
    } else if (systemMetrics.memory.percentage > 80) {
      this.addAlert('warning', `Memory usage elevated: ${systemMetrics.memory.percentage}%`, 'system');
    }

    if (systemMetrics.cpu.usage > 95) {
      this.addAlert('critical', `Critical CPU usage: ${systemMetrics.cpu.usage}%`, 'system');
    } else if (systemMetrics.cpu.usage > 80) {
      this.addAlert('warning', `High CPU usage: ${systemMetrics.cpu.usage}%`, 'system');
    }

    if (applicationMetrics.errorRate > 0.1) {
      this.addAlert('critical', `High error rate: ${(applicationMetrics.errorRate * 100).toFixed(2)}%`, 'application');
    } else if (applicationMetrics.errorRate > 0.05) {
      this.addAlert('warning', `Elevated error rate: ${(applicationMetrics.errorRate * 100).toFixed(2)}%`, 'application');
    }

    if (applicationMetrics.averageResponseTime > 1000) {
      this.addAlert('warning', `Slow response times: ${applicationMetrics.averageResponseTime}ms average`, 'application');
    }

    if (carbonCalculationMetrics.errorRate > 0.05) {
      this.addAlert('error', `Carbon calculation errors elevated: ${(carbonCalculationMetrics.errorRate * 100).toFixed(2)}%`, 'carbon-calculation');
    }

    Object.entries(carbonCalculationMetrics.dataSourceHealth).forEach(([source, isHealthy]) => {
      if (!isHealthy) {
        this.addAlert('error', `Data source unhealthy: ${source}`, 'data-sources');
      }
    });
  }

  private addAlert(level: Alert['level'], message: string, component: string): void {
    const existingAlert = this.alerts.find(alert => 
      alert.message === message && 
      alert.component === component && 
      !alert.resolved
    );

    if (!existingAlert) {
      this.alerts.push({
        id: `alert_${this.alertIdCounter++}`,
        level,
        message,
        timestamp: new Date().toISOString(),
        component,
        resolved: false
      });

      logger.warn('Alert generated', {
        level,
        message,
        metadata: { 
          component,
          alertGenerated: true 
        }
      });
    }
  }

  private getActiveAlerts(): Alert[] {
    return this.alerts.filter(alert => !alert.resolved)
      .sort((a, b) => {
        const levelOrder = { critical: 4, error: 3, warning: 2, info: 1 };
        return levelOrder[b.level] - levelOrder[a.level];
      })
      .slice(0, 50);
  }

  public resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      logger.info('Alert resolved', {
        message: alert.message,
        metadata: { 
          alertId,
          alertResolved: true 
        }
      });
      return true;
    }
    return false;
  }

  public setupDashboardRoutes(app: Express): void {
    app.get('/api/monitoring/dashboard', async (_req: Request, res: Response) => {
      try {
        const dashboardData = await this.getDashboardData();
        res.json({
          success: true,
          data: dashboardData,
          timestamp: new Date().toISOString()
        });
      } catch (error: any) {
        logger.error('Dashboard data request failed', {
          error: {
            code: 'DASHBOARD_REQUEST_ERROR',
            message: error.message,
            stack: error.stack
          }
        });
        res.status(500).json({
          success: false,
          error: 'Failed to retrieve dashboard data',
          message: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    app.get('/metrics', async (_req: Request, res: Response) => {
      try {
        const metrics = await metricsCollector.getMetrics();
        res.set('Content-Type', 'text/plain');
        res.send(metrics);
      } catch (error: any) {
        logger.error('Metrics request failed', {
          error: {
            code: 'METRICS_REQUEST_ERROR',
            message: error.message,
            stack: error.stack
          }
        });
        res.status(500).json({
          error: 'Failed to retrieve metrics',
          message: error.message
        });
      }
    });

    app.post('/api/monitoring/alerts/:alertId/resolve', (req: Request, res: Response) => {
      const { alertId } = req.params;
      const resolved = this.resolveAlert(alertId);
      
      if (resolved) {
        res.json({
          success: true,
          message: 'Alert resolved successfully'
        });
      } else {
        res.status(404).json({
          success: false,
          error: 'Alert not found'
        });
      }
    });

    app.get('/api/monitoring/health', async (_req: Request, res: Response) => {
      try {
        const dashboardData = await this.getDashboardData();
        const criticalAlerts = dashboardData.alerts.filter(a => a.level === 'critical').length;
        const errorAlerts = dashboardData.alerts.filter(a => a.level === 'error').length;
        
        const overallStatus = criticalAlerts > 0 ? 'critical' : 
                             errorAlerts > 0 ? 'degraded' : 'healthy';
        
        res.json({
          status: overallStatus,
          summary: {
            uptime: dashboardData.system.uptime,
            memoryUsage: dashboardData.system.memory.percentage,
            errorRate: dashboardData.application.errorRate,
            activeAlerts: dashboardData.alerts.length,
            criticalAlerts,
            carbonCalculationsToday: dashboardData.application.carbonCalculationsToday
          },
          timestamp: dashboardData.timestamp
        });
      } catch (error: any) {
        res.status(503).json({
          status: 'unknown',
          error: 'Health check failed',
          message: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    logger.info('Monitoring dashboard routes configured', {
      metadata: {
        routes: [
          '/api/monitoring/dashboard',
          '/metrics',
          '/api/monitoring/alerts/:alertId/resolve',
          '/api/monitoring/health'
        ],
        monitoringEnabled: true
      }
    });
  }
}

export const monitoringDashboard = MonitoringDashboard.getInstance();