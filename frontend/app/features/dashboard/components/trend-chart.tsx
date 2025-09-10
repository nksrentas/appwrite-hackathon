import { motion } from 'framer-motion';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Area,
  AreaChart,
  ReferenceLine 
} from 'recharts';
import { format, subDays, startOfDay } from 'date-fns';
import { TrendingUp, TrendingDown, Calendar, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/components/ui/card';
import { Badge } from '@shared/components/ui/badge';
import { Button } from '@shared/components/ui/button';
import { formatCarbon } from '@shared/utils/carbon';
import { cn } from '@shared/utils/cn';

interface CarbonDataPoint {
  date: string;
  carbon: number;
  activities: number;
  efficiency?: number;
  target?: number;
}

interface TrendChartProps {
  data?: CarbonDataPoint[];
  period?: '7d' | '30d' | '90d';
  onPeriodChange?: (period: '7d' | '30d' | '90d') => void;
  isLoading?: boolean;
  showTarget?: boolean;
  showEfficiency?: boolean;
  className?: string;
  height?: number;
}

const generateSampleData = (days: number): CarbonDataPoint[] => {
  const data: CarbonDataPoint[] = [];
  const now = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = startOfDay(subDays(now, i));
    const baseCarbon = 80 + Math.sin(i * 0.3) * 20 + Math.random() * 30;
    
    data.push({
      date: format(date, 'yyyy-MM-dd'),
      carbon: Math.max(0, baseCarbon),
      activities: Math.floor(Math.random() * 15) + 3,
      efficiency: Math.max(60, 100 - (baseCarbon / 2) + Math.random() * 20),
      target: 70, // Target carbon footprint
    });
  }
  
  return data;
};

export const TrendChart = ({
  data,
  period = '7d',
  onPeriodChange,
  isLoading = false,
  showTarget = true,
  showEfficiency = false,
  className,
  height = 300,
}: TrendChartProps) => {
  const periodDays = period === '7d' ? 7 : period === '30d' ? 30 : 90;
  const chartData = data || generateSampleData(periodDays);

  const currentCarbon = chartData[chartData.length - 1]?.carbon || 0;
  const previousCarbon = chartData[chartData.length - 2]?.carbon || 0;
  const trend = currentCarbon > previousCarbon ? 'up' : currentCarbon < previousCarbon ? 'down' : 'stable';
  const trendValue = previousCarbon > 0 ? ((currentCarbon - previousCarbon) / previousCarbon) * 100 : 0;

  const averageCarbon = chartData.reduce((sum, point) => sum + point.carbon, 0) / chartData.length;
  const maxCarbon = Math.max(...chartData.map(point => point.carbon));
  const targetCarbon = chartData[0]?.target || 70;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-carbon-200 rounded-lg shadow-lg">
          <p className="text-body-sm font-medium text-carbon-900 mb-1">
            {format(new Date(label), 'MMM dd, yyyy')}
          </p>
          <div className="space-y-1">
            <div className="flex items-center justify-between space-x-4">
              <span className="text-caption text-carbon-600">Carbon:</span>
              <span className="text-body-sm font-semibold text-carbon-900">
                {formatCarbon(data.carbon, 'g')}
              </span>
            </div>
            <div className="flex items-center justify-between space-x-4">
              <span className="text-caption text-carbon-600">Activities:</span>
              <span className="text-body-sm text-carbon-700">{data.activities}</span>
            </div>
            {data.efficiency && (
              <div className="flex items-center justify-between space-x-4">
                <span className="text-caption text-carbon-600">Efficiency:</span>
                <span className="text-body-sm text-efficiency-600">{data.efficiency.toFixed(0)}%</span>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  const formatXAxisLabel = (tickItem: string) => {
    const date = new Date(tickItem);
    return period === '7d' 
      ? format(date, 'EEE') 
      : period === '30d' 
        ? format(date, 'MMM dd')
        : format(date, 'MMM');
  };

  if (isLoading) {
    return (
      <Card className={cn('w-full', className)}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="loading-skeleton h-6 w-32 rounded" />
            <div className="loading-skeleton h-8 w-24 rounded" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="loading-skeleton w-full rounded" style={{ height }} />
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn('w-full', className)}
    >
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-carbon-500" />
                <span>Carbon Trend</span>
                <Badge variant="outline" className="ml-2">
                  {period === '7d' ? 'Last 7 days' : period === '30d' ? 'Last 30 days' : 'Last 90 days'}
                </Badge>
              </CardTitle>
              <div className="flex items-center space-x-4 text-body-sm text-carbon-600">
                <div className="flex items-center space-x-1">
                  <span>Avg:</span>
                  <span className="font-medium">{formatCarbon(averageCarbon, 'g')}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span>Peak:</span>
                  <span className="font-medium">{formatCarbon(maxCarbon, 'g')}</span>
                </div>
                {trend !== 'stable' && (
                  <div className={cn(
                    'flex items-center space-x-1',
                    trend === 'up' ? 'text-danger' : 'text-success-600'
                  )}>
                    {trend === 'up' ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    <span className="font-medium">{Math.abs(trendValue).toFixed(1)}%</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {['7d', '30d', '90d'].map((p) => (
                <Button
                  key={p}
                  variant={period === p ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onPeriodChange?.(p as '7d' | '30d' | '90d')}
                  className="h-8 px-3"
                >
                  {p}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div style={{ width: '100%', height }}>
            <ResponsiveContainer>
              {showEfficiency ? (
                <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="carbonGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="efficiencyGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={formatXAxisLabel}
                    stroke="#64748b"
                    fontSize={12}
                  />
                  <YAxis 
                    yAxisId="carbon"
                    orientation="left"
                    stroke="#64748b"
                    fontSize={12}
                  />
                  <YAxis 
                    yAxisId="efficiency"
                    orientation="right"
                    stroke="#10b981"
                    fontSize={12}
                  />
                  
                  <Area
                    yAxisId="carbon"
                    type="monotone"
                    dataKey="carbon"
                    stroke="#ef4444"
                    strokeWidth={2}
                    fill="url(#carbonGradient)"
                    name="Carbon (g)"
                  />
                  
                  <Line
                    yAxisId="efficiency"
                    type="monotone"
                    dataKey="efficiency"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ fill: '#10b981', strokeWidth: 0, r: 3 }}
                    name="Efficiency (%)"
                  />
                  
                  {showTarget && (
                    <ReferenceLine 
                      yAxisId="carbon"
                      y={targetCarbon} 
                      stroke="#3b82f6" 
                      strokeDasharray="5 5"
                      label={{ value: "Target", position: "insideTopRight" }}
                    />
                  )}
                  
                  <Tooltip content={<CustomTooltip />} />
                </AreaChart>
              ) : (
                <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="carbonGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={formatXAxisLabel}
                    stroke="#64748b"
                    fontSize={12}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    stroke="#64748b"
                    fontSize={12}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => `${value}g`}
                  />
                  
                  <Area
                    type="monotone"
                    dataKey="carbon"
                    stroke="#ef4444"
                    strokeWidth={3}
                    fill="url(#carbonGradient)"
                    name="Carbon Footprint"
                    dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: '#ef4444', strokeWidth: 2, fill: '#fff' }}
                  />
                  
                  {showTarget && (
                    <ReferenceLine 
                      y={targetCarbon} 
                      stroke="#3b82f6" 
                      strokeDasharray="5 5"
                      strokeWidth={2}
                      label={{ 
                        value: `Target: ${formatCarbon(targetCarbon, 'g')}`, 
                        position: "insideTopRight",
                        fill: "#3b82f6",
                        fontSize: 12
                      }}
                    />
                  )}
                  
                  <Tooltip content={<CustomTooltip />} />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>

          <div className="mt-4 pt-4 border-t border-carbon-100">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-body-sm">
              <div className="flex items-center space-x-2">
                <div className={cn(
                  'w-2 h-2 rounded-full',
                  averageCarbon <= targetCarbon ? 'bg-success-500' : 'bg-warning-500'
                )} />
                <span className="text-carbon-600">
                  {averageCarbon <= targetCarbon ? 'On track to meet target' : 'Above target average'}
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                <Zap className="h-3 w-3 text-efficiency-500" />
                <span className="text-carbon-600">
                  Efficiency trend: {trend === 'down' ? 'improving' : 'stable'}
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-primary-500" />
                <span className="text-carbon-600">
                  Best day: {format(
                    new Date(chartData.sort((a, b) => a.carbon - b.carbon)[0]?.date || new Date()), 
                    'MMM dd'
                  )}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};