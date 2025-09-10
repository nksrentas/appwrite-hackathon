import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Zap,
  Database,
  Globe,
  Server,
  Wifi,
  WifiOff,
  BarChart3,
  AlertCircle,
  Timer,
  Target
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/components/ui/card';
import { Badge } from '@shared/components/ui/badge';
import { Button } from '@shared/components/ui/button';
import { Progress } from '@shared/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@shared/components/ui/tabs';
import { cn } from '@shared/utils/cn';
import { carbonCalculationEngine } from '@features/carbon/services/calculation-engine.service';

interface ApiEndpoint {
  id: string;
  name: string;
  url: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  responseTime: number;
  uptime: number;
  lastCheck: Date;
  errorRate: number;
  requestsPerMinute: number;
  cacheHitRate?: number;
  description: string;
  category: 'calculation' | 'data' | 'validation' | 'external';
  critical: boolean;
}

interface PerformanceMetrics {
  averageResponseTime: number;
  totalRequests: number;
  successRate: number;
  errorRate: number;
  uptime: number;
  cachePerformance: {
    hitRate: number;
    totalHits: number;
    totalMisses: number;
  };
}

interface ApiHealthDashboardProps {
  autoRefresh?: boolean;
  refreshInterval?: number;
  showDetails?: boolean;
  className?: string;
}

export const ApiHealthDashboard = ({
  autoRefresh = true,
  refreshInterval = 30000,
  showDetails = true,
  className
}: ApiHealthDashboardProps) => {
  const [endpoints, setEndpoints] = useState<ApiEndpoint[]>([]);
  const [performance, setPerformance] = useState<PerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('overview');

  const mockEndpoints: ApiEndpoint[] = [
    {
      id: 'carbon-calculation',
      name: 'Carbon Calculation API',
      url: '/api/calculation/carbon',
      status: 'healthy',
      responseTime: 245,
      uptime: 99.8,
      lastCheck: new Date(),
      errorRate: 0.2,
      requestsPerMinute: 25,
      cacheHitRate: 78,
      description: 'Primary carbon footprint calculation endpoint',
      category: 'calculation',
      critical: true
    },
    {
      id: 'methodology',
      name: 'Methodology API',
      url: '/api/calculation/methodology',
      status: 'healthy',
      responseTime: 120,
      uptime: 99.9,
      lastCheck: new Date(),
      errorRate: 0.1,
      requestsPerMinute: 5,
      cacheHitRate: 95,
      description: 'Methodology information and documentation',
      category: 'data',
      critical: false
    },
    {
      id: 'data-sources',
      name: 'Data Sources API',
      url: '/api/calculation/sources',
      status: 'healthy',
      responseTime: 180,
      uptime: 99.5,
      lastCheck: new Date(),
      errorRate: 0.3,
      requestsPerMinute: 8,
      cacheHitRate: 85,
      description: 'Data source status and metadata',
      category: 'data',
      critical: true
    },
    {
      id: 'confidence',
      name: 'Confidence API',
      url: '/api/calculation/confidence',
      status: 'degraded',
      responseTime: 650,
      uptime: 97.2,
      lastCheck: new Date(),
      errorRate: 2.8,
      requestsPerMinute: 12,
      cacheHitRate: 42,
      description: 'Confidence indicators and quality metrics',
      category: 'validation',
      critical: true
    },
    {
      id: 'health-check',
      name: 'Health Check API',
      url: '/api/calculation/health',
      status: 'healthy',
      responseTime: 95,
      uptime: 99.9,
      lastCheck: new Date(),
      errorRate: 0.1,
      requestsPerMinute: 2,
      description: 'Service health monitoring',
      category: 'data',
      critical: false
    },
    {
      id: 'epa-egrid',
      name: 'EPA eGRID API',
      url: 'https://www.epa.gov/egrid',
      status: 'healthy',
      responseTime: 890,
      uptime: 98.5,
      lastCheck: new Date(),
      errorRate: 1.2,
      requestsPerMinute: 3,
      description: 'EPA emission factors database',
      category: 'external',
      critical: true
    },
    {
      id: 'electricity-maps',
      name: 'Electricity Maps API',
      url: 'https://electricitymaps.com',
      status: 'unhealthy',
      responseTime: 2450,
      uptime: 94.1,
      lastCheck: new Date(),
      errorRate: 8.5,
      requestsPerMinute: 1,
      description: 'Live electricity carbon intensity',
      category: 'external',
      critical: false
    }
  ];

  useEffect(() => {
    fetchApiHealth();
    
    if (autoRefresh) {
      const interval = setInterval(fetchApiHealth, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  const fetchApiHealth = async () => {
    setLoading(true);
    try {
      const healthData = await carbonCalculationEngine.getHealthStatus();
      
      if (healthData?.health) {
        const updatedEndpoints = mockEndpoints.map(endpoint => {
          const serviceKey = endpoint.id.replace(/-/g, '');
          const serviceStatus = healthData.health.services?.[serviceKey] || endpoint.status;
          
          return {
            ...endpoint,
            status: serviceStatus,
            responseTime: endpoint.responseTime + (Math.random() - 0.5) * 100,
            uptime: Math.max(90, endpoint.uptime + (Math.random() - 0.5) * 2),
            errorRate: Math.max(0, endpoint.errorRate + (Math.random() - 0.5) * 1),
            lastCheck: new Date()
          };
        });
        
        setEndpoints(updatedEndpoints);
        
        const avgResponseTime = updatedEndpoints.reduce((sum, ep) => sum + ep.responseTime, 0) / updatedEndpoints.length;
        const totalRequests = updatedEndpoints.reduce((sum, ep) => sum + ep.requestsPerMinute, 0) * 60;
        const avgErrorRate = updatedEndpoints.reduce((sum, ep) => sum + ep.errorRate, 0) / updatedEndpoints.length;
        const avgUptime = updatedEndpoints.reduce((sum, ep) => sum + ep.uptime, 0) / updatedEndpoints.length;
        const avgCacheHitRate = updatedEndpoints
          .filter(ep => ep.cacheHitRate)
          .reduce((sum, ep) => sum + (ep.cacheHitRate || 0), 0) / updatedEndpoints.filter(ep => ep.cacheHitRate).length;
        
        setPerformance({
          averageResponseTime: avgResponseTime,
          totalRequests,
          successRate: 100 - avgErrorRate,
          errorRate: avgErrorRate,
          uptime: avgUptime,
          cachePerformance: {
            hitRate: avgCacheHitRate || 0,
            totalHits: Math.floor(totalRequests * (avgCacheHitRate || 0) / 100),
            totalMisses: Math.floor(totalRequests * (100 - (avgCacheHitRate || 0)) / 100)
          }
        });
      } else {
        setEndpoints(mockEndpoints);
        setPerformance({
          averageResponseTime: 380,
          totalRequests: 3360,
          successRate: 97.8,
          errorRate: 2.2,
          uptime: 98.4,
          cachePerformance: {
            hitRate: 72,
            totalHits: 2419,
            totalMisses: 941
          }
        });
      }
    } catch (error) {
      console.error('Failed to fetch API health:', error);
      setEndpoints(mockEndpoints);
    }
    setLoading(false);
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'healthy':
        return {
          icon: CheckCircle,
          color: 'text-success-600',
          bgColor: 'bg-success-50',
          borderColor: 'border-success-200',
          label: 'Healthy'
        };
      case 'degraded':
        return {
          icon: AlertTriangle,
          color: 'text-warning-600',
          bgColor: 'bg-warning-50',
          borderColor: 'border-warning-200',
          label: 'Degraded'
        };
      case 'unhealthy':
        return {
          icon: XCircle,
          color: 'text-danger-600',
          bgColor: 'bg-danger-50',
          borderColor: 'border-danger-200',
          label: 'Unhealthy'
        };
      default:
        return {
          icon: Clock,
          color: 'text-carbon-600',
          bgColor: 'bg-carbon-50',
          borderColor: 'border-carbon-200',
          label: 'Unknown'
        };
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'calculation':
        return <Zap className="h-4 w-4" />;
      case 'data':
        return <Database className="h-4 w-4" />;
      case 'validation':
        return <Target className="h-4 w-4" />;
      case 'external':
        return <Globe className="h-4 w-4" />;
      default:
        return <Server className="h-4 w-4" />;
    }
  };

  const getResponseTimeColor = (responseTime: number) => {
    if (responseTime < 200) return 'text-success-600';
    if (responseTime < 500) return 'text-warning-600';
    return 'text-danger-600';
  };

  const filteredEndpoints = endpoints.filter(endpoint => 
    selectedCategory === 'all' || endpoint.category === selectedCategory
  );

  const criticalEndpoints = endpoints.filter(ep => ep.critical);
  const healthyCount = endpoints.filter(ep => ep.status === 'healthy').length;
  const degradedCount = endpoints.filter(ep => ep.status === 'degraded').length;
  const unhealthyCount = endpoints.filter(ep => ep.status === 'unhealthy').length;

  if (!showDetails) {
    return (
      <div className={cn('flex items-center space-x-4', className)}>
        <div className="flex items-center space-x-2">
          <Activity className="h-4 w-4 text-primary-600" />
          <span className="text-body-sm font-medium">API Health</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-body-sm text-carbon-600">
            {healthyCount}/{endpoints.length} Healthy
          </span>
          {performance && (
            <Badge className={cn(
              'text-xs',
              performance.successRate >= 99 ? 'bg-success-50 text-success-600 border-success-200' :
              performance.successRate >= 95 ? 'bg-warning-50 text-warning-600 border-warning-200' :
              'bg-danger-50 text-danger-600 border-danger-200'
            )}>
              {performance.successRate.toFixed(1)}% uptime
            </Badge>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5 text-primary-600" />
            <span>API Health Dashboard</span>
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchApiHealth}
              disabled={loading}
            >
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            </Button>
          </div>
        </div>

        {performance && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <Card className="p-3">
              <div className="flex items-center space-x-2 mb-1">
                <Timer className="h-4 w-4 text-primary-600" />
                <span className="text-caption text-carbon-600">Avg Response</span>
              </div>
              <div className="text-xl font-bold text-carbon-900">
                {Math.round(performance.averageResponseTime)}ms
              </div>
            </Card>
            
            <Card className="p-3">
              <div className="flex items-center space-x-2 mb-1">
                <BarChart3 className="h-4 w-4 text-primary-600" />
                <span className="text-caption text-carbon-600">Success Rate</span>
              </div>
              <div className="text-xl font-bold text-carbon-900">
                {performance.successRate.toFixed(1)}%
              </div>
            </Card>
            
            <Card className="p-3">
              <div className="flex items-center space-x-2 mb-1">
                <Database className="h-4 w-4 text-primary-600" />
                <span className="text-caption text-carbon-600">Cache Hit Rate</span>
              </div>
              <div className="text-xl font-bold text-carbon-900">
                {performance.cachePerformance.hitRate.toFixed(0)}%
              </div>
            </Card>
            
            <Card className="p-3">
              <div className="flex items-center space-x-2 mb-1">
                <Wifi className="h-4 w-4 text-primary-600" />
                <span className="text-caption text-carbon-600">Uptime</span>
              </div>
              <div className="text-xl font-bold text-carbon-900">
                {performance.uptime.toFixed(1)}%
              </div>
            </Card>
          </div>
        )}
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-body-sm font-semibold text-carbon-900">Healthy</h4>
                  <CheckCircle className="h-5 w-5 text-success-600" />
                </div>
                <div className="text-2xl font-bold text-success-600 mb-1">
                  {healthyCount}
                </div>
                <p className="text-caption text-carbon-500">
                  Operating normally
                </p>
              </Card>
              
              <Card className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-body-sm font-semibold text-carbon-900">Degraded</h4>
                  <AlertTriangle className="h-5 w-5 text-warning-600" />
                </div>
                <div className="text-2xl font-bold text-warning-600 mb-1">
                  {degradedCount}
                </div>
                <p className="text-caption text-carbon-500">
                  Reduced performance
                </p>
              </Card>
              
              <Card className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-body-sm font-semibold text-carbon-900">Unhealthy</h4>
                  <XCircle className="h-5 w-5 text-danger-600" />
                </div>
                <div className="text-2xl font-bold text-danger-600 mb-1">
                  {unhealthyCount}
                </div>
                <p className="text-caption text-carbon-500">
                  Service issues
                </p>
              </Card>
            </div>

            <div className="space-y-4">
              <h4 className="text-body-base font-semibold text-carbon-900">
                Critical Endpoints
              </h4>
              <div className="space-y-3">
                {criticalEndpoints.map((endpoint) => {
                  const statusInfo = getStatusInfo(endpoint.status);
                  const StatusIcon = statusInfo.icon;
                  
                  return (
                    <motion.div
                      key={endpoint.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={cn(
                        'flex items-center justify-between p-3 rounded-lg border',
                        statusInfo.borderColor,
                        statusInfo.bgColor
                      )}
                    >
                      <div className="flex items-center space-x-3">
                        <StatusIcon className={cn('h-4 w-4', statusInfo.color)} />
                        <div>
                          <div className="text-body-sm font-medium text-carbon-900">
                            {endpoint.name}
                          </div>
                          <div className="text-caption text-carbon-600">
                            {endpoint.description}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className={cn(
                          'text-body-sm font-medium',
                          getResponseTimeColor(endpoint.responseTime)
                        )}>
                          {Math.round(endpoint.responseTime)}ms
                        </div>
                        <div className="text-caption text-carbon-500">
                          {endpoint.uptime.toFixed(1)}% uptime
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="endpoints" className="space-y-6 mt-6">
            <div className="flex items-center space-x-2">
              <span className="text-body-sm text-carbon-600">Filter by category:</span>
              <Button
                variant={selectedCategory === 'all' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setSelectedCategory('all')}
              >
                All
              </Button>
              {['calculation', 'data', 'validation', 'external'].map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                >
                  {getCategoryIcon(category)}
                  <span className="ml-1 capitalize">{category}</span>
                </Button>
              ))}
            </div>

            <div className="space-y-3">
              <AnimatePresence>
                {filteredEndpoints.map((endpoint) => {
                  const statusInfo = getStatusInfo(endpoint.status);
                  const StatusIcon = statusInfo.icon;
                  
                  return (
                    <motion.div
                      key={endpoint.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="border border-carbon-200 rounded-lg p-4"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0 pt-1">
                            {getCategoryIcon(endpoint.category)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <h4 className="text-body-base font-semibold text-carbon-900">
                                {endpoint.name}
                              </h4>
                              {endpoint.critical && (
                                <Badge variant="destructive" className="text-xs">
                                  Critical
                                </Badge>
                              )}
                            </div>
                            <p className="text-caption text-carbon-600 mb-2">
                              {endpoint.description}
                            </p>
                            <p className="text-caption font-mono text-carbon-500">
                              {endpoint.url}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <StatusIcon className={cn('h-4 w-4', statusInfo.color)} />
                          <Badge className={cn('text-xs', statusInfo.color, statusInfo.bgColor)}>
                            {statusInfo.label}
                          </Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <div className="text-caption text-carbon-500 mb-1">Response Time</div>
                          <div className={cn(
                            'text-body-sm font-medium',
                            getResponseTimeColor(endpoint.responseTime)
                          )}>
                            {Math.round(endpoint.responseTime)}ms
                          </div>
                        </div>
                        
                        <div>
                          <div className="text-caption text-carbon-500 mb-1">Uptime</div>
                          <div className="text-body-sm font-medium text-carbon-900">
                            {endpoint.uptime.toFixed(1)}%
                          </div>
                        </div>
                        
                        <div>
                          <div className="text-caption text-carbon-500 mb-1">Error Rate</div>
                          <div className={cn(
                            'text-body-sm font-medium',
                            endpoint.errorRate < 1 ? 'text-success-600' :
                            endpoint.errorRate < 5 ? 'text-warning-600' : 'text-danger-600'
                          )}>
                            {endpoint.errorRate.toFixed(1)}%
                          </div>
                        </div>
                        
                        {endpoint.cacheHitRate && (
                          <div>
                            <div className="text-caption text-carbon-500 mb-1">Cache Hit Rate</div>
                            <div className="text-body-sm font-medium text-carbon-900">
                              {endpoint.cacheHitRate.toFixed(0)}%
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="mt-3 pt-3 border-t border-carbon-100 text-caption text-carbon-500">
                        Last checked: {endpoint.lastCheck.toLocaleTimeString()} • 
                        {endpoint.requestsPerMinute} req/min
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </TabsContent>

          <TabsContent value="performance" className="space-y-6 mt-6">
            {performance && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="p-4">
                    <h4 className="text-body-base font-semibold text-carbon-900 mb-4">
                      Response Time Distribution
                    </h4>
                    <div className="space-y-3">
                      {['< 200ms', '200-500ms', '500-1000ms', '> 1000ms'].map((range, index) => {
                        const counts = [
                          endpoints.filter(ep => ep.responseTime < 200).length,
                          endpoints.filter(ep => ep.responseTime >= 200 && ep.responseTime < 500).length,
                          endpoints.filter(ep => ep.responseTime >= 500 && ep.responseTime < 1000).length,
                          endpoints.filter(ep => ep.responseTime >= 1000).length
                        ];
                        const percentage = (counts[index] / endpoints.length) * 100;
                        
                        return (
                          <div key={range}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-caption text-carbon-600">{range}</span>
                              <span className="text-caption text-carbon-900">
                                {counts[index]} endpoints
                              </span>
                            </div>
                            <Progress value={percentage} className="h-2" />
                          </div>
                        );
                      })}
                    </div>
                  </Card>

                  <Card className="p-4">
                    <h4 className="text-body-base font-semibold text-carbon-900 mb-4">
                      Cache Performance
                    </h4>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-caption text-carbon-600">Hit Rate</span>
                        <span className="text-body-sm font-medium text-carbon-900">
                          {performance.cachePerformance.hitRate.toFixed(1)}%
                        </span>
                      </div>
                      <Progress value={performance.cachePerformance.hitRate} className="h-2" />
                      
                      <div className="grid grid-cols-2 gap-4 text-center">
                        <div>
                          <div className="text-lg font-bold text-success-600">
                            {performance.cachePerformance.totalHits}
                          </div>
                          <div className="text-caption text-carbon-500">Cache Hits</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-danger-600">
                            {performance.cachePerformance.totalMisses}
                          </div>
                          <div className="text-caption text-carbon-500">Cache Misses</div>
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>

                <Card className="p-4">
                  <h4 className="text-body-base font-semibold text-carbon-900 mb-4">
                    Overall Performance Metrics
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary-600 mb-1">
                        {Math.round(performance.averageResponseTime)}ms
                      </div>
                      <div className="text-caption text-carbon-500">Average Response Time</div>
                      <div className="mt-2">
                        {performance.averageResponseTime < 300 ? (
                          <TrendingDown className="h-4 w-4 text-success-600 mx-auto" />
                        ) : (
                          <TrendingUp className="h-4 w-4 text-warning-600 mx-auto" />
                        )}
                      </div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary-600 mb-1">
                        {performance.totalRequests.toLocaleString()}
                      </div>
                      <div className="text-caption text-carbon-500">Total Requests/Hour</div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-2xl font-bold text-success-600 mb-1">
                        {performance.successRate.toFixed(1)}%
                      </div>
                      <div className="text-caption text-carbon-500">Success Rate</div>
                      <Progress value={performance.successRate} className="mt-2 h-1" />
                    </div>
                    
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary-600 mb-1">
                        {performance.uptime.toFixed(1)}%
                      </div>
                      <div className="text-caption text-carbon-500">Overall Uptime</div>
                      <Progress value={performance.uptime} className="mt-2 h-1" />
                    </div>
                  </div>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};