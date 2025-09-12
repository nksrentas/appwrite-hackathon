import { motion } from 'framer-motion';
import { 
  Database, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  Clock,
  Zap,
  Wifi,
  WifiOff,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@shared/components/ui/card';
import { Badge } from '@shared/components/ui/badge';
import { Progress } from '@shared/components/ui/progress';
import { useReducedMotion } from '@shared/utils/accessibility';
import { getRelativeTime } from '@shared/utils/carbon';
import { cn } from '@shared/utils/cn';

interface CarbonDataSource {
  name: string;
  type: 'primary' | 'secondary';
  status: 'active' | 'inactive' | 'error';
  coverage: number;
  lastUpdated: string;
  reliability: number;
  latency: number;
}

interface DataSourcesWidgetProps {
  dataSources?: CarbonDataSource[] | null;
  className?: string;
}

export const DataSourcesWidget = ({
  dataSources,
  className,
}: DataSourcesWidgetProps) => {
  const prefersReducedMotion = useReducedMotion();

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'active':
        return {
          icon: CheckCircle,
          color: 'text-primary-600',
          bgColor: 'bg-primary-100',
          label: 'Active',
        };
      case 'inactive':
        return {
          icon: Clock,
          color: 'text-carbon-600',
          bgColor: 'bg-carbon-100',
          label: 'Inactive',
        };
      case 'error':
        return {
          icon: XCircle,
          color: 'text-danger-600',
          bgColor: 'bg-danger-100',
          label: 'Error',
        };
      default:
        return {
          icon: AlertTriangle,
          color: 'text-carbon-600',
          bgColor: 'bg-carbon-100',
          label: 'Unknown',
        };
    }
  };

  const getTypeInfo = (type: string) => {
    switch (type) {
      case 'primary':
        return {
          label: 'Primary',
          description: 'Direct measurement or calculation',
          color: 'bg-primary-100 text-primary-800',
        };
      case 'secondary':
        return {
          label: 'Secondary',
          description: 'External data source or estimation',
          color: 'bg-efficiency-100 text-efficiency-800',
        };
      default:
        return {
          label: 'Unknown',
          description: 'Source type not specified',
          color: 'bg-carbon-100 text-carbon-800',
        };
    }
  };

  const getReliabilityColor = (reliability: number) => {
    if (reliability >= 0.9) return 'bg-primary-500';
    if (reliability >= 0.8) return 'bg-efficiency-500';
    if (reliability >= 0.7) return 'bg-carbon-500';
    return 'bg-danger-500';
  };

  const getLatencyColor = (latency: number) => {
    if (latency < 100) return 'text-primary-600';
    if (latency < 500) return 'text-efficiency-600';
    if (latency < 1000) return 'text-carbon-600';
    return 'text-danger-600';
  };

  if (!dataSources || dataSources.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="py-8">
          <div className="text-center text-carbon-500 space-y-2">
            <Database className="h-8 w-8 mx-auto opacity-50" />
            <p className="text-body-md font-medium">No data sources available</p>
            <p className="text-caption">Data source information will appear when available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const activeSourcesCount = dataSources.filter(source => source.status === 'active').length;
  const averageReliability = dataSources.reduce((sum, source) => sum + source.reliability, 0) / dataSources.length;
  const averageLatency = dataSources.reduce((sum, source) => sum + source.latency, 0) / dataSources.length;

  return (
    <div className={cn('space-y-6', className)}>
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-primary-100">
                <Database className="h-5 w-5 text-primary-600" />
              </div>
              <div>
                <div className="text-display-sm font-bold text-carbon-900">
                  {dataSources.length}
                </div>
                <div className="text-caption text-carbon-600">Total Sources</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-primary-100">
                <CheckCircle className="h-5 w-5 text-primary-600" />
              </div>
              <div>
                <div className="text-display-sm font-bold text-carbon-900">
                  {activeSourcesCount}
                </div>
                <div className="text-caption text-carbon-600">Active</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-efficiency-100">
                <Zap className="h-5 w-5 text-efficiency-600" />
              </div>
              <div>
                <div className="text-display-sm font-bold text-carbon-900">
                  {Math.round(averageReliability * 100)}%
                </div>
                <div className="text-caption text-carbon-600">Avg Reliability</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-carbon-100">
                <Wifi className="h-5 w-5 text-carbon-600" />
              </div>
              <div>
                <div className={cn('text-display-sm font-bold', getLatencyColor(averageLatency))}>
                  {Math.round(averageLatency)}ms
                </div>
                <div className="text-caption text-carbon-600">Avg Latency</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Sources List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Database className="h-5 w-5 text-primary-500" />
            <span>Data Sources</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {dataSources.map((source, index) => {
              const statusInfo = getStatusInfo(source.status);
              const typeInfo = getTypeInfo(source.type);
              const StatusIcon = statusInfo.icon;

              return (
                <motion.div
                  key={source.name}
                  className="p-4 rounded-lg border border-carbon-200 bg-carbon-50"
                  initial={!prefersReducedMotion ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={!prefersReducedMotion ? { delay: index * 0.1 } : { duration: 0 }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start space-x-3">
                      <div className={cn('p-2 rounded-lg', statusInfo.bgColor)}>
                        <StatusIcon className={cn('h-4 w-4', statusInfo.color)} />
                      </div>
                      <div>
                        <h4 className="text-body-sm font-semibold text-carbon-900">
                          {source.name}
                        </h4>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge className={typeInfo.color} variant="outline">
                            {typeInfo.label}
                          </Badge>
                          <Badge 
                            variant={source.status === 'active' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {statusInfo.label}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="text-right text-caption text-carbon-500">
                      <div className="flex items-center space-x-1 mb-1">
                        <Clock className="h-3 w-3" />
                        <span>{getRelativeTime(source.lastUpdated)}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        {source.latency < 500 ? (
                          <Wifi className="h-3 w-3 text-primary-500" />
                        ) : (
                          <WifiOff className="h-3 w-3 text-danger-500" />
                        )}
                        <span className={getLatencyColor(source.latency)}>
                          {source.latency}ms
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-carbon-600">Coverage</span>
                        <span className="font-medium">{source.coverage}%</span>
                      </div>
                      <Progress 
                        value={source.coverage} 
                        className="h-2"
                        indicatorClassName="bg-primary-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-carbon-600">Reliability</span>
                        <span className="font-medium">{Math.round(source.reliability * 100)}%</span>
                      </div>
                      <Progress 
                        value={source.reliability * 100} 
                        className="h-2"
                        indicatorClassName={getReliabilityColor(source.reliability)}
                      />
                    </div>
                  </div>

                  <p className="text-caption text-carbon-600 mt-2">
                    {typeInfo.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};