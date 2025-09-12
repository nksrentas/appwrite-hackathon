import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@shared/components/ui/tabs';
import { Badge } from '@shared/components/ui/badge';
import { formatCarbon } from '@shared/utils/carbon';
import { useReducedMotion } from '@shared/utils/accessibility';
import { cn } from '@shared/utils/cn';

interface BreakdownData {
  category: string;
  value: number;
  percentage: number;
  color?: string;
}

interface EmissionBreakdownChartProps {
  data: BreakdownData[];
  timeRange: string;
  className?: string;
}

const CATEGORY_COLORS = {
  'CI/CD': '#10B981',
  'Development': '#3B82F6', 
  'Deployment': '#F59E0B',
  'Testing': '#8B5CF6',
  'Monitoring': '#EF4444',
  'Storage': '#6B7280',
  'Other': '#9CA3AF',
};

export const EmissionBreakdownChart = ({
  data,
  timeRange,
  className,
}: EmissionBreakdownChartProps) => {
  const prefersReducedMotion = useReducedMotion();

  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    return data.map((item, index) => ({
      ...item,
      color: CATEGORY_COLORS[item.category as keyof typeof CATEGORY_COLORS] || 
             `hsl(${(index * 137.508) % 360}, 50%, 50%)`,
    }));
  }, [data]);

  const totalEmissions = useMemo(() => {
    return chartData.reduce((sum, item) => sum + item.value, 0);
  }, [chartData]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || payload.length === 0) return null;

    const data = payload[0].payload;

    return (
      <div className="bg-white p-3 rounded-lg shadow-lg border border-carbon-200">
        <p className="text-body-sm font-medium text-carbon-900 mb-2">{data.category}</p>
        <div className="space-y-1">
          <div className="flex items-center justify-between space-x-4">
            <span className="text-caption text-carbon-600">Emissions:</span>
            <span className="text-body-sm font-medium text-carbon-900">
              {formatCarbon(data.value)}
            </span>
          </div>
          <div className="flex items-center justify-between space-x-4">
            <span className="text-caption text-carbon-600">Percentage:</span>
            <span className="text-body-sm font-medium text-carbon-900">
              {data.percentage.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    );
  };

  const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percentage }: any) => {
    if (percentage < 5) return null; // Don't show labels for small slices

    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize="12"
        fontWeight="medium"
      >
        {percentage.toFixed(0)}%
      </text>
    );
  };

  if (!chartData || chartData.length === 0) {
    return (
      <div className={cn('flex items-center justify-center h-64', className)}>
        <div className="text-center text-carbon-500">
          <div className="text-body-md font-medium mb-1">No breakdown data available</div>
          <div className="text-caption">Emission categories will appear as activities are recorded</div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className={cn('space-y-4', className)}
      initial={!prefersReducedMotion ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
      animate={{ opacity: 1, y: 0 }}
      transition={!prefersReducedMotion ? { duration: 0.5, delay: 0.3 } : { duration: 0 }}
    >
      <Tabs defaultValue="pie" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pie">Pie Chart</TabsTrigger>
          <TabsTrigger value="bar">Bar Chart</TabsTrigger>
        </TabsList>

        <TabsContent value="pie" className="space-y-4">
          {/* Pie Chart */}
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={CustomLabel}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  animationBegin={0}
                  animationDuration={prefersReducedMotion ? 0 : 800}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="grid grid-cols-2 gap-2">
            {chartData.map((item, index) => (
              <motion.div
                key={item.category}
                className="flex items-center space-x-2 p-2 rounded bg-carbon-50"
                initial={!prefersReducedMotion ? { opacity: 0, x: -20 } : { opacity: 1, x: 0 }}
                animate={{ opacity: 1, x: 0 }}
                transition={!prefersReducedMotion ? { delay: 0.1 * index } : { duration: 0 }}
              >
                <div
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: item.color }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-body-sm font-medium text-carbon-900 truncate">
                    {item.category}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-caption text-carbon-600">
                      {formatCarbon(item.value)}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {item.percentage.toFixed(1)}%
                    </Badge>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="bar" className="space-y-4">
          {/* Bar Chart */}
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgb(209, 213, 219)" strokeOpacity={0.5} />
                <XAxis 
                  dataKey="category" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: 'rgb(107, 114, 128)' }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: 'rgb(107, 114, 128)' }}
                  tickFormatter={(value) => formatCarbon(value)}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="value"
                  fill="#10B981"
                  radius={[4, 4, 0, 0]}
                  animationDuration={prefersReducedMotion ? 0 : 800}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-carbon-50 rounded-lg">
              <div className="text-display-sm font-bold text-carbon-900">
                {chartData.length}
              </div>
              <div className="text-caption text-carbon-600">Categories</div>
            </div>
            <div className="text-center p-3 bg-carbon-50 rounded-lg">
              <div className="text-display-sm font-bold text-carbon-900">
                {formatCarbon(totalEmissions)}
              </div>
              <div className="text-caption text-carbon-600">Total Emissions</div>
            </div>
            <div className="text-center p-3 bg-carbon-50 rounded-lg">
              <div className="text-display-sm font-bold text-primary-600">
                {chartData[0]?.category || 'N/A'}
              </div>
              <div className="text-caption text-carbon-600">Top Category</div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
};