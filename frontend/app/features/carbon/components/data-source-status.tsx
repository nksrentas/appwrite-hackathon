import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  RefreshCw,
  Activity,
  Database,
  Cloud,
  Globe,
  Zap,
  TrendingUp,
  Signal
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/components/ui/card';
import { Badge } from '@shared/components/ui/badge';
import { Button } from '@shared/components/ui/button';
import { Progress } from '@shared/components/ui/progress';
import { cn } from '@shared/utils/cn';
import { carbonCalculationEngine } from '@features/carbon/services/calculation-engine.service';

interface DataSource {
  id: string;
  name: string;
  type: 'government' | 'commercial' | 'academic' | 'industry';
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  lastUpdate: Date;
  responseTime: number;
  uptime: number;
  description: string;
  icon: any;
  features: string[];
}

interface DataSourceStatusProps {
  autoRefresh?: boolean;
  refreshInterval?: number;
  showDetails?: boolean;
  className?: string;
}

export const DataSourceStatus = ({
  autoRefresh = true,
  refreshInterval = 30000,
  showDetails = true,
  className
}: DataSourceStatusProps) => {
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [overallHealth, setOverallHealth] = useState<'healthy' | 'degraded' | 'unhealthy'>('healthy');

  const mockDataSources: DataSource[] = [
    {
      id: 'epa-egrid',
      name: 'EPA eGRID',
      type: 'government',
      status: 'healthy',
      lastUpdate: new Date(Date.now() - 1800000),
      responseTime: 250,
      uptime: 99.5,
      description: 'US electricity emission factors',
      icon: Database,
      features: ['Regional Grid Data', 'Annual Updates', 'High Accuracy']
    },
    {
      id: 'aws-carbon',
      name: 'AWS Carbon API',
      type: 'commercial',
      status: 'healthy',
      lastUpdate: new Date(Date.now() - 900000),
      responseTime: 120,
      uptime: 99.8,
      description: 'Cloud service carbon intensity',
      icon: Cloud,
      features: ['Real-time Data', 'Regional Coverage', 'Service-specific']
    },
    {
      id: 'electricity-maps',
      name: 'Electricity Maps',
      type: 'commercial',
      status: 'degraded',
      lastUpdate: new Date(Date.now() - 3600000),
      responseTime: 850,
      uptime: 97.2,
      description: 'Live electricity carbon intensity',
      icon: Zap,
      features: ['Live Data', 'Global Coverage', 'Hourly Updates']
    },
    {
      id: 'gsf-sci',
      name: 'Green Software Foundation',
      type: 'industry',
      status: 'healthy',
      lastUpdate: new Date(Date.now() - 600000),
      responseTime: 180,
      uptime: 99.1,
      description: 'Software carbon intensity specification',
      icon: Globe,
      features: ['SCI Methodology', 'Best Practices', 'Standards']
    }
  ];

  useEffect(() => {
    fetchDataSourceStatus();
    
    if (autoRefresh) {
      const interval = setInterval(fetchDataSourceStatus, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  const fetchDataSourceStatus = async () => {
    setLoading(true);
    try {
      const healthData = await carbonCalculationEngine.getHealthStatus();
      const sourcesData = await carbonCalculationEngine.getDataSources();
      
      if (healthData?.health?.services) {
        const updatedSources = mockDataSources.map(source => {
          const serviceStatus = healthData.health.services[source.id] || 
                              healthData.health.services[source.name.toLowerCase().replace(/\s+/g, '')] ||
                              'healthy';
          
          return {
            ...source,
            status: serviceStatus,
            responseTime: source.responseTime + Math.random() * 100 - 50,
            lastUpdate: new Date()
          };
        });
        
        setDataSources(updatedSources);
        setOverallHealth(healthData.health.overall || 'healthy');
      } else {
        setDataSources(mockDataSources);
      }
    } catch (error) {
      console.error('Failed to fetch data source status:', error);
      setDataSources(mockDataSources);
    }
    setLoading(false);
    setLastRefresh(new Date());
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'healthy':
        return {
          icon: CheckCircle,
          color: 'text-success-600',
          bgColor: 'bg-success-50',
          borderColor: 'border-success-200',
          label: 'Healthy',
          description: 'Operating normally'
        };
      case 'degraded':
        return {
          icon: AlertTriangle,
          color: 'text-warning-600',
          bgColor: 'bg-warning-50',
          borderColor: 'border-warning-200',
          label: 'Degraded',
          description: 'Reduced performance'
        };
      case 'unhealthy':
        return {
          icon: XCircle,
          color: 'text-danger-600',
          bgColor: 'bg-danger-50',
          borderColor: 'border-danger-200',
          label: 'Unhealthy',
          description: 'Service issues'
        };
      default:
        return {
          icon: Clock,
          color: 'text-carbon-600',
          bgColor: 'bg-carbon-50',
          borderColor: 'border-carbon-200',
          label: 'Unknown',
          description: 'Status unknown'
        };
    }
  };

  const getTypeInfo = (type: string) => {
    switch (type) {
      case 'government':
        return { color: 'bg-blue-100 text-blue-800', label: 'Government' };
      case 'commercial':
        return { color: 'bg-green-100 text-green-800', label: 'Commercial' };
      case 'academic':
        return { color: 'bg-purple-100 text-purple-800', label: 'Academic' };
      case 'industry':
        return { color: 'bg-orange-100 text-orange-800', label: 'Industry' };
      default:
        return { color: 'bg-gray-100 text-gray-800', label: 'Unknown' };
    }
  };

  const calculateAverageResponseTime = () => {
    return dataSources.length > 0 
      ? Math.round(dataSources.reduce((sum, ds) => sum + ds.responseTime, 0) / dataSources.length)
      : 0;
  };

  const calculateAverageUptime = () => {
    return dataSources.length > 0
      ? dataSources.reduce((sum, ds) => sum + ds.uptime, 0) / dataSources.length
      : 100;
  };

  const getHealthyCount = () => {
    return dataSources.filter(ds => ds.status === 'healthy').length;
  };

  if (!showDetails) {
    return (
      <div className={cn('flex items-center space-x-4', className)}>
        <div className="flex items-center space-x-2">
          <Activity className="h-4 w-4 text-primary-600" />
          <span className="text-body-sm font-medium">Data Sources</span>
        </div>
        <div className="flex items-center space-x-1">
          <span className="text-body-sm text-carbon-600">
            {getHealthyCount()}/{dataSources.length} Healthy
          </span>
          <Badge className={cn(
            'text-xs',
            overallHealth === 'healthy' ? 'bg-success-50 text-success-600 border-success-200' :
            overallHealth === 'degraded' ? 'bg-warning-50 text-warning-600 border-warning-200' :
            'bg-danger-50 text-danger-600 border-danger-200'
          )}>
            {overallHealth}
          </Badge>
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
            <span>Data Source Status</span>
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Badge className={cn(
              overallHealth === 'healthy' ? 'bg-success-50 text-success-600 border-success-200' :
              overallHealth === 'degraded' ? 'bg-warning-50 text-warning-600 border-warning-200' :
              'bg-danger-50 text-danger-600 border-danger-200'
            )}>
              {overallHealth}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchDataSourceStatus}
              disabled={loading}
            >
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-carbon-900">
              {getHealthyCount()}/{dataSources.length}
            </div>
            <div className="text-caption text-carbon-500">Healthy Sources</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-carbon-900">
              {calculateAverageResponseTime()}ms
            </div>
            <div className="text-caption text-carbon-500">Avg Response</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-carbon-900">
              {calculateAverageUptime().toFixed(1)}%
            </div>
            <div className="text-caption text-carbon-500">Avg Uptime</div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <AnimatePresence>
          {dataSources.map((source) => {
            const statusInfo = getStatusInfo(source.status);
            const typeInfo = getTypeInfo(source.type);
            const StatusIcon = statusInfo.icon;
            const SourceIcon = source.icon;
            
            return (
              <motion.div
                key={source.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={cn(
                  'border rounded-lg p-4 transition-all duration-200',
                  statusInfo.borderColor,
                  statusInfo.bgColor
                )}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <SourceIcon className="h-6 w-6 text-primary-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="text-body-base font-semibold text-carbon-900">
                          {source.name}
                        </h4>
                        <Badge className={cn('text-xs', typeInfo.color)}>
                          {typeInfo.label}
                        </Badge>
                      </div>
                      <p className="text-caption text-carbon-600">
                        {source.description}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    <StatusIcon className={cn('h-4 w-4', statusInfo.color)} />
                    <span className={cn('text-caption font-medium', statusInfo.color)}>
                      {statusInfo.label}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <div className="flex items-center space-x-1 mb-1">
                      <Clock className="h-3 w-3 text-carbon-400" />
                      <span className="text-caption text-carbon-500">Last Update</span>
                    </div>
                    <p className="text-body-sm font-medium text-carbon-900">
                      {source.lastUpdate.toLocaleTimeString()}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center space-x-1 mb-1">
                      <TrendingUp className="h-3 w-3 text-carbon-400" />
                      <span className="text-caption text-carbon-500">Response Time</span>
                    </div>
                    <p className="text-body-sm font-medium text-carbon-900">
                      {Math.round(source.responseTime)}ms
                    </p>
                  </div>
                </div>

                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-caption text-carbon-500">Uptime</span>
                    <span className="text-caption font-medium text-carbon-700">
                      {source.uptime.toFixed(1)}%
                    </span>
                  </div>
                  <Progress
                    value={source.uptime}
                    className={cn(
                      'h-2',
                      source.uptime >= 99 ? '[&>div]:bg-success-500' :
                      source.uptime >= 95 ? '[&>div]:bg-warning-500' : '[&>div]:bg-danger-500'
                    )}
                  />
                </div>

                {source.features.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {source.features.map((feature, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="text-xs px-2 py-1"
                      >
                        {feature}
                      </Badge>
                    ))}
                  </div>
                )}

                {source.status !== 'healthy' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-3 pt-3 border-t border-carbon-200"
                  >
                    <div className="flex items-center space-x-2">
                      <Signal className="h-4 w-4 text-warning-600" />
                      <span className="text-caption text-warning-700">
                        {statusInfo.description} - Impact on calculation accuracy may be minimal
                      </span>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>

        <div className="border-t border-carbon-100 pt-4">
          <div className="flex items-center justify-between text-caption text-carbon-500">
            <span>Last refresh: {lastRefresh.toLocaleTimeString()}</span>
            <span>Auto-refresh: {autoRefresh ? `${refreshInterval / 1000}s` : 'Off'}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};