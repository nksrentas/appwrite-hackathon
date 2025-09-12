import { useMemo } from 'react';
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
} from 'recharts';
import { format } from 'date-fns';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

import { Badge } from '@shared/components/ui/badge';
import { formatCarbon } from '@shared/utils/carbon';
import { useReducedMotion } from '@shared/utils/accessibility';
import { cn } from '@shared/utils/cn';

interface CarbonTrendData {
  timestamp: string;
  value: number;
  category: string;
  confidence: number;
}

interface CarbonTrendChartProps {
  data: CarbonTrendData[];
  timeRange: string;
  height?: number;
  showConfidence?: boolean;
  className?: string;
}

export const CarbonTrendChart = ({
  data,
  timeRange,
  height = 300,
  showConfidence = true,
  className,
}: CarbonTrendChartProps) => {
  const prefersReducedMotion = useReducedMotion();

  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    return data
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .map((point) => ({
        ...point,
        formattedTime: formatTimeForRange(point.timestamp, timeRange),
        displayValue: point.value,
        confidencePercentage: Math.round(point.confidence * 100),
      }));
  }, [data, timeRange]);

  const trendAnalysis = useMemo(() => {
    if (chartData.length < 2) {
      return { direction: 'stable', change: 0, changePercentage: 0 };
    }

    const first = chartData[0].value;
    const last = chartData[chartData.length - 1].value;
    const change = last - first;
    const changePercentage = first > 0 ? (change / first) * 100 : 0;

    let direction: 'up' | 'down' | 'stable';
    if (Math.abs(changePercentage) < 5) {
      direction = 'stable';
    } else if (change > 0) {
      direction = 'up';
    } else {
      direction = 'down';
    }

    return {
      direction,
      change,
      changePercentage,
    };
  }, [chartData]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null;

    const data = payload[0].payload;

    return (
      <div className="bg-white p-3 rounded-lg shadow-lg border border-carbon-200">
        <p className="text-body-sm font-medium text-carbon-900 mb-1">{label}</p>
        <div className="space-y-1">
          <div className="flex items-center justify-between space-x-4">
            <span className="text-caption text-carbon-600">Emissions:</span>
            <span className="text-body-sm font-medium text-carbon-900">
              {formatCarbon(data.value)}
            </span>
          </div>
          {showConfidence && (
            <div className="flex items-center justify-between space-x-4">
              <span className="text-caption text-carbon-600">Confidence:</span>
              <Badge 
                variant={data.confidencePercentage >= 80 ? 'default' : 'secondary'}
                className="text-xs"
              >
                {data.confidencePercentage}%
              </Badge>
            </div>
          )}
        </div>
      </div>
    );
  };

  const getTrendIcon = () => {
    switch (trendAnalysis.direction) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-danger" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-primary-500" />;
      default:
        return <Minus className="h-4 w-4 text-carbon-500" />;
    }
  };

  const getTrendColor = () => {
    switch (trendAnalysis.direction) {
      case 'up':
        return 'text-danger';
      case 'down':
        return 'text-primary-500';
      default:
        return 'text-carbon-500';
    }
  };

  if (!chartData || chartData.length === 0) {
    return (
      <div className={cn('flex items-center justify-center', className)} style={{ height }}>
        <div className="text-center text-carbon-500">
          <div className="text-body-md font-medium mb-1">No trend data available</div>
          <div className="text-caption">Data will appear as activities are recorded</div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className={cn('space-y-4', className)}
      initial={!prefersReducedMotion ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
      animate={{ opacity: 1, y: 0 }}
      transition={!prefersReducedMotion ? { duration: 0.5, delay: 0.2 } : { duration: 0 }}
    >
      {/* Trend Summary */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            {getTrendIcon()}
            <span className={cn('text-body-sm font-medium', getTrendColor())}>
              {Math.abs(trendAnalysis.changePercentage).toFixed(1)}% 
              {trendAnalysis.direction === 'up' && ' increase'}
              {trendAnalysis.direction === 'down' && ' decrease'}
              {trendAnalysis.direction === 'stable' && ' stable'}
            </span>
          </div>
          <span className="text-caption text-carbon-500">
            over {timeRange}
          </span>
        </div>

        <div className="text-right">
          <div className="text-body-sm font-medium text-carbon-900">
            {formatCarbon(chartData[chartData.length - 1]?.value || 0)}
          </div>
          <div className="text-caption text-carbon-500">current</div>
        </div>
      </div>

      {/* Chart */}
      <div style={{ height }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          >
            <defs>
              <linearGradient id="carbonGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgb(16, 185, 129)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="rgb(16, 185, 129)" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="rgb(209, 213, 219)" 
              strokeOpacity={0.5}
            />
            
            <XAxis
              dataKey="formattedTime"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: 'rgb(107, 114, 128)' }}
            />
            
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: 'rgb(107, 114, 128)' }}
              tickFormatter={(value) => formatCarbon(value)}
            />
            
            <Tooltip content={<CustomTooltip />} />
            
            <Area
              type="monotone"
              dataKey="displayValue"
              stroke="rgb(16, 185, 129)"
              strokeWidth={2}
              fill="url(#carbonGradient)"
              connectNulls
              animationDuration={prefersReducedMotion ? 0 : 1000}
            />

            {showConfidence && (
              <Line
                type="monotone"
                dataKey="confidencePercentage"
                stroke="rgb(139, 69, 19)"
                strokeWidth={1}
                strokeDasharray="5 5"
                dot={false}
                connectNulls
                yAxisId="confidence"
                animationDuration={prefersReducedMotion ? 0 : 1000}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center space-x-6 text-caption text-carbon-600">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-primary-500 rounded-sm" />
          <span>Carbon Emissions</span>
        </div>
        {showConfidence && (
          <div className="flex items-center space-x-2">
            <div className="w-3 h-0.5 bg-carbon-500 border-dashed" />
            <span>Data Confidence</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

function formatTimeForRange(timestamp: string, range: string): string {
  const date = new Date(timestamp);
  
  switch (range) {
    case '24h':
      return format(date, 'HH:mm');
    case '7d':
      return format(date, 'EEE');
    case '30d':
      return format(date, 'MMM d');
    default:
      return format(date, 'MMM d');
  }
}