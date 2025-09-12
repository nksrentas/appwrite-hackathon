import type { MetaFunction, LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  Calendar,
  Download,
  Filter,
  RefreshCw,
  Target,
  Activity,
  Zap,
  Clock,
  ArrowUp,
  ArrowDown,
  Minus,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@shared/components/ui/card';
import { Button } from '@shared/components/ui/button';
import { Badge } from '@shared/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@shared/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/components/ui/select';
import { Progress } from '@shared/components/ui/progress';
import { Separator } from '@shared/components/ui/separator';
import { Alert, AlertDescription } from '@shared/components/ui/alert';

export const meta: MetaFunction = () => {
  return [
    { title: 'Analytics - EcoTrace' },
    { name: 'description', content: 'Detailed carbon footprint analytics and insights' },
  ];
};

export async function loader({ request }: LoaderFunctionArgs) {
  return json({
    timestamp: new Date().toISOString(),
  });
}

const mockData = {
  overview: {
    totalEmissions: 2847.5,
    weeklyAverage: 406.8,
    monthlyTrend: 'down',
    trendValue: 12.3,
    efficiencyScore: 78,
  },
  periods: [
    { name: 'Today', emissions: 45.2, trend: 'down', change: -8.5 },
    { name: 'This Week', emissions: 406.8, trend: 'up', change: 12.1 },
    { name: 'This Month', emissions: 1634.2, trend: 'down', change: -5.7 },
    { name: 'Last 90 Days', emissions: 4901.6, trend: 'stable', change: 0.2 },
  ],
  breakdown: [
    { category: 'CI/CD Pipelines', emissions: 1456.2, percentage: 51.2, trend: 'down' },
    { category: 'Code Commits', emissions: 678.9, percentage: 23.8, trend: 'up' },
    { category: 'Pull Requests', emissions: 445.6, percentage: 15.7, trend: 'stable' },
    { category: 'Deployments', emissions: 266.8, percentage: 9.3, trend: 'down' },
  ],
  repositories: [
    { name: 'main-api', emissions: 856.3, commits: 127, trend: 'down' },
    { name: 'frontend-app', emissions: 623.7, commits: 89, trend: 'up' },
    { name: 'mobile-app', emissions: 445.2, commits: 56, trend: 'stable' },
    { name: 'data-pipeline', emissions: 334.8, commits: 34, trend: 'down' },
  ],
};

export default function Analytics() {
  const { timestamp } = useLoaderData<typeof loader>();
  const [selectedTimeframe, setSelectedTimeframe] = useState('7d');
  const [selectedRepository, setSelectedRepository] = useState('all');

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <ArrowUp className="h-4 w-4 text-destructive" />;
      case 'down': return <ArrowDown className="h-4 w-4 text-green-600" />;
      default: return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up': return 'text-destructive';
      case 'down': return 'text-green-600';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div>
          <h1 className="text-display-lg font-bold">Analytics</h1>
          <p className="text-body-md text-muted-foreground mt-2">
            Detailed carbon footprint analytics and performance insights
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">24 Hours</SelectItem>
              <SelectItem value="7d">7 Days</SelectItem>
              <SelectItem value="30d">30 Days</SelectItem>
              <SelectItem value="90d">90 Days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon">
            <Download className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Alert */}
      <Alert>
        <Activity className="h-4 w-4" />
        <AlertDescription>
          Analytics are updated in real-time based on your development activities. 
          Data shown reflects the selected timeframe: <strong>{selectedTimeframe}</strong>
        </AlertDescription>
      </Alert>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Emissions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockData.overview.totalEmissions}g</div>
            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
              {getTrendIcon(mockData.overview.monthlyTrend)}
              <span className={getTrendColor(mockData.overview.monthlyTrend)}>
                {mockData.overview.trendValue}% vs last period
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Weekly Average</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockData.overview.weeklyAverage}g</div>
            <div className="flex items-center space-x-1 text-xs text-green-600">
              <ArrowDown className="h-4 w-4" />
              <span>8.2% improvement</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Efficiency Score</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockData.overview.efficiencyScore}/100</div>
            <Progress value={mockData.overview.efficiencyScore} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Data Freshness</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Live</div>
            <div className="text-xs text-muted-foreground">
              Last update: {new Date(timestamp).toLocaleTimeString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
          <TabsTrigger value="repositories">Repositories</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5" />
                  <span>Emission Periods</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {mockData.periods.map((period, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center space-x-3">
                      {getTrendIcon(period.trend)}
                      <div>
                        <p className="font-medium">{period.name}</p>
                        <p className="text-sm text-muted-foreground">{period.emissions}g CO₂e</p>
                      </div>
                    </div>
                    <Badge variant={period.trend === 'down' ? 'default' : period.trend === 'up' ? 'destructive' : 'secondary'}>
                      {Math.abs(period.change)}%
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5" />
                  <span>Performance Metrics</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Carbon Efficiency</span>
                    <span className="font-medium">92%</span>
                  </div>
                  <Progress value={92} />
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Data Coverage</span>
                    <span className="font-medium">98%</span>
                  </div>
                  <Progress value={98} />
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Optimization Potential</span>
                    <span className="font-medium">76%</span>
                  </div>
                  <Progress value={76} />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="breakdown" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Emission Breakdown by Category</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {mockData.breakdown.map((item, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        <Zap className="h-4 w-4 text-primary" />
                        <span className="font-medium">{item.category}</span>
                      </div>
                      {getTrendIcon(item.trend)}
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{item.emissions}g</p>
                      <p className="text-xs text-muted-foreground">{item.percentage}%</p>
                    </div>
                  </div>
                  <Progress value={item.percentage} className="h-2" />
                  {index < mockData.breakdown.length - 1 && <Separator className="mt-4" />}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="repositories" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Repository Analytics</CardTitle>
                <Select value={selectedRepository} onValueChange={setSelectedRepository}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Repositories</SelectItem>
                    <SelectItem value="main-api">main-api</SelectItem>
                    <SelectItem value="frontend-app">frontend-app</SelectItem>
                    <SelectItem value="mobile-app">mobile-app</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockData.repositories.map((repo, index) => (
                  <Card key={index} className="bg-muted/30">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Badge variant="outline">{repo.name}</Badge>
                          {getTrendIcon(repo.trend)}
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{repo.emissions}g CO₂e</p>
                          <p className="text-xs text-muted-foreground">{repo.commits} commits</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Emission Trends</CardTitle>
              <p className="text-sm text-muted-foreground">
                Historical carbon emission patterns over time
              </p>
            </CardHeader>
            <CardContent>
              <div className="h-80 flex items-center justify-center border-2 border-dashed border-muted-foreground/25 rounded-lg">
                <div className="text-center space-y-2">
                  <BarChart3 className="h-12 w-12 text-muted-foreground/50 mx-auto" />
                  <p className="text-muted-foreground">Chart visualization would appear here</p>
                  <p className="text-sm text-muted-foreground">Showing trends for {selectedTimeframe}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}