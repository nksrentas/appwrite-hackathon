import type { LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Activity,
  Zap,
  Target,
  Clock,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
} from 'lucide-react';

import { useCarbonInsightsStore } from '@features/carbon-insights/stores/carbon-insights.store';
import { useAuthStore } from '@features/auth/stores/auth.store';
import { CarbonMetricCard } from '@features/dashboard/components/carbon-metric-card';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/components/ui/card';
import { Button } from '@shared/components/ui/button';
import { Badge } from '@shared/components/ui/badge';
import { Progress } from '@shared/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@shared/components/ui/tabs';
import { CarbonTrendChart } from '@features/carbon-insights/components/carbon-trend-chart';
import { CarbonForecastWidget } from '@features/carbon-insights/components/carbon-forecast-widget';
import { MethodologyPanel } from '@features/carbon-insights/components/methodology-panel';
import { DataSourcesWidget } from '@features/carbon-insights/components/data-sources-widget';
import { EmissionBreakdownChart } from '@features/carbon-insights/components/emission-breakdown-chart';
import { ConfidenceIndicator } from '@features/carbon-insights/components/confidence-indicator';
import { formatCarbon, getCarbonIntensity, getRelativeTime } from '@shared/utils/carbon';
import { generateAriaProps, useReducedMotion } from '@shared/utils/accessibility';
import { cn } from '@shared/utils/cn';

export async function loader({ request }: LoaderFunctionArgs) {
  return json({
    timestamp: new Date().toISOString(),
  });
}

export default function CarbonInsightsPage() {
  const { timestamp } = useLoaderData<typeof loader>();
  const { user } = useAuthStore();
  const {
    insights,
    metrics,
    trends,
    forecast,
    methodology,
    dataSources,
    confidence,
    isLoading,
    error,
    refreshData,
    getAuditTrail,
  } = useCarbonInsightsStore();

  const prefersReducedMotion = useReducedMotion();
  const [selectedTimeRange, setSelectedTimeRange] = useState('7d');
  const [showAuditTrail, setShowAuditTrail] = useState(false);

  useEffect(() => {
    if (user) {
      refreshData(user.$id);
    }
  }, [user, refreshData]);

  if (isLoading && !insights) {
    return (
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-2">
                <div className="h-4 bg-carbon-200 rounded w-3/4" />
                <div className="h-8 bg-carbon-200 rounded w-1/2" />
              </CardHeader>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-carbon-200 rounded w-1/3" />
              </CardHeader>
              <CardContent>
                <div className="h-64 bg-carbon-200 rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-8">
        <Card className="border-danger-200 bg-danger-50">
          <CardContent className="py-8">
            <div className="flex items-center space-x-3 text-danger-800">
              <AlertTriangle className="h-5 w-5" />
              <div>
                <h3 className="font-semibold">Failed to load carbon insights</h3>
                <p className="text-sm text-danger-700 mt-1">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => user && refreshData(user.$id)}
                  className="mt-3"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalEmissions = insights?.totalEmissions || 0;
  const weeklyEmissions = insights?.weeklyEmissions || 0;
  const efficiencyScore = insights?.efficiencyScore || 0;
  const trendDirection = insights?.trend || 'stable';
  const trendValue = insights?.trendValue || 0;

  return (
    <motion.div
      className="max-w-7xl mx-auto px-4 lg:px-6 py-8 space-y-8"
      initial={!prefersReducedMotion ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
      animate={{ opacity: 1, y: 0 }}
      transition={!prefersReducedMotion ? { duration: 0.5 } : { duration: 0 }}
    >
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div>
          <h1 className="text-display-lg text-carbon-900 font-bold">Carbon Insights</h1>
          <p className="text-body-md text-carbon-600 mt-2">
            Deep dive into your development carbon footprint with real-time analytics
          </p>
        </div>
        <div className="flex items-center space-x-4">
          {confidence && (
            <ConfidenceIndicator
              confidence={confidence}
              showDetails={true}
              className="hidden lg:flex"
            />
          )}
          <Badge variant="outline" className="text-body-sm">
            Last updated: {getRelativeTime(timestamp)}
          </Badge>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <CarbonMetricCard
          title="Total Emissions"
          value={totalEmissions}
          unit="g"
          icon={Activity}
          trend={trendDirection as any}
          trendValue={trendValue}
          period="vs last week"
          isRealtime={true}
          lastUpdated={insights?.lastUpdated}
        />
        <CarbonMetricCard
          title="Weekly Average"
          value={weeklyEmissions}
          unit="g"
          icon={BarChart3}
          trend={trendDirection === 'up' ? 'down' : 'up'}
          trendValue={Math.abs(trendValue)}
          period="vs last week"
          isRealtime={true}
          lastUpdated={insights?.lastUpdated}
        />
        <CarbonMetricCard
          title="Efficiency Score"
          value={efficiencyScore}
          unit="g"
          icon={Zap}
          trend="stable"
          period="optimization score"
          isRealtime={true}
          lastUpdated={insights?.lastUpdated}
        />
        <CarbonMetricCard
          title="Carbon Intensity"
          value={insights?.intensity || 0}
          unit="g"
          icon={Target}
          trend={getCarbonIntensity(insights?.intensity || 0) === 'low' ? 'down' : 'up'}
          trendValue={15}
          period="vs baseline"
          isRealtime={true}
          lastUpdated={insights?.lastUpdated}
        />
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="forecast">Forecast</TabsTrigger>
          <TabsTrigger value="sources">Data Sources</TabsTrigger>
          <TabsTrigger value="methodology">Methodology</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Emission Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5 text-primary-500" />
                  <span>Emission Breakdown</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <EmissionBreakdownChart
                  data={insights?.breakdown || []}
                  timeRange={selectedTimeRange}
                />
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-primary-500" />
                  <span>Recent Activity</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {insights?.recentActivity?.map((activity, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-carbon-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="h-8 w-8 bg-primary-100 rounded-full flex items-center justify-center">
                        <Activity className="h-4 w-4 text-primary-600" />
                      </div>
                      <div>
                        <p className="text-body-sm font-medium text-carbon-900">
                          {activity.type}
                        </p>
                        <p className="text-caption text-carbon-600">
                          {activity.description}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-body-sm font-medium text-carbon-900">
                        {formatCarbon(activity.emissions)}
                      </p>
                      <p className="text-caption text-carbon-500">
                        {getRelativeTime(activity.timestamp)}
                      </p>
                    </div>
                  </div>
                )) || (
                  <div className="text-center text-carbon-500 py-8">
                    <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No recent activity available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Performance Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center space-x-2">
                  <Target className="h-5 w-5 text-primary-500" />
                  <span>Performance Insights</span>
                </span>
                <Badge variant={insights?.performance?.status === 'good' ? 'default' : 'destructive'}>
                  {insights?.performance?.status || 'unknown'}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-carbon-600">Response Time</span>
                    <span className="font-medium">{insights?.performance?.responseTime || 0}ms</span>
                  </div>
                  <Progress value={Math.min((insights?.performance?.responseTime || 0) / 10, 100)} />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-carbon-600">Success Rate</span>
                    <span className="font-medium">{Math.round((insights?.performance?.successRate || 0) * 100)}%</span>
                  </div>
                  <Progress value={(insights?.performance?.successRate || 0) * 100} />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-carbon-600">Data Freshness</span>
                    <span className="font-medium">{insights?.performance?.dataFreshness || 0}%</span>
                  </div>
                  <Progress value={insights?.performance?.dataFreshness || 0} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Carbon Emission Trends</CardTitle>
              <div className="flex items-center space-x-2">
                <Button
                  variant={selectedTimeRange === '24h' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedTimeRange('24h')}
                >
                  24H
                </Button>
                <Button
                  variant={selectedTimeRange === '7d' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedTimeRange('7d')}
                >
                  7D
                </Button>
                <Button
                  variant={selectedTimeRange === '30d' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedTimeRange('30d')}
                >
                  30D
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <CarbonTrendChart
                data={trends || []}
                timeRange={selectedTimeRange}
                height={400}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="forecast" className="space-y-6">
          <CarbonForecastWidget
            forecast={forecast}
            currentEmissions={totalEmissions}
            confidence={confidence}
          />
        </TabsContent>

        <TabsContent value="sources" className="space-y-6">
          <DataSourcesWidget dataSources={dataSources} />
        </TabsContent>

        <TabsContent value="methodology" className="space-y-6">
          <MethodologyPanel methodology={methodology} />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}