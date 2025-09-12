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
  ReferenceLine,
} from 'recharts';
import { format, addDays } from 'date-fns';
import { TrendingUp, Target, Lightbulb, AlertTriangle } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@shared/components/ui/card';
import { Badge } from '@shared/components/ui/badge';
import { Button } from '@shared/components/ui/button';
import { Progress } from '@shared/components/ui/progress';
import { formatCarbon } from '@shared/utils/carbon';
import { useReducedMotion } from '@shared/utils/accessibility';
import { cn } from '@shared/utils/cn';

interface CarbonForecast {
  predictions: Array<{
    timestamp: string;
    predicted: number;
    confidence: number;
    lower: number;
    upper: number;
  }>;
  recommendations: Array<{
    type: 'efficiency' | 'timing' | 'methodology';
    title: string;
    description: string;
    impact: number;
    difficulty: 'low' | 'medium' | 'high';
  }>;
}

interface ConfidenceMetrics {
  overall: number;
  dataQuality: number;
  methodological: number;
  temporal: number;
  coverage: number;
}

interface CarbonForecastWidgetProps {
  forecast?: CarbonForecast | null;
  currentEmissions: number;
  confidence?: ConfidenceMetrics | null;
  className?: string;
}

export const CarbonForecastWidget = ({
  forecast,
  currentEmissions,
  confidence,
  className,
}: CarbonForecastWidgetProps) => {
  const prefersReducedMotion = useReducedMotion();

  const chartData = useMemo(() => {
    if (!forecast?.predictions) return [];

    return [
      {
        timestamp: new Date().toISOString(),
        predicted: currentEmissions,
        confidence: 100,
        lower: currentEmissions,
        upper: currentEmissions,
        formattedDate: 'Now',
        isActual: true,
      },
      ...forecast.predictions.map((point) => ({
        ...point,
        formattedDate: format(new Date(point.timestamp), 'MMM d'),
        confidencePercentage: Math.round(point.confidence * 100),
        isActual: false,
      })),
    ];
  }, [forecast, currentEmissions]);

  const forecastSummary = useMemo(() => {
    if (!forecast?.predictions || forecast.predictions.length === 0) {
      return { trend: 'stable', projectedChange: 0, projectedValue: currentEmissions };
    }

    const lastPrediction = forecast.predictions[forecast.predictions.length - 1];
    const projectedChange = lastPrediction.predicted - currentEmissions;
    const changePercentage = currentEmissions > 0 ? (projectedChange / currentEmissions) * 100 : 0;
    
    let trend: 'up' | 'down' | 'stable';
    if (Math.abs(changePercentage) < 10) {
      trend = 'stable';
    } else if (projectedChange > 0) {
      trend = 'up';
    } else {
      trend = 'down';
    }

    return {
      trend,
      projectedChange,
      projectedValue: lastPrediction.predicted,
      changePercentage,
    };
  }, [forecast, currentEmissions]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null;

    const data = payload[0].payload;

    return (
      <div className="bg-white p-3 rounded-lg shadow-lg border border-carbon-200">
        <p className="text-body-sm font-medium text-carbon-900 mb-2">{label}</p>
        <div className="space-y-1">
          <div className="flex items-center justify-between space-x-4">
            <span className="text-caption text-carbon-600">
              {data.isActual ? 'Current:' : 'Predicted:'}
            </span>
            <span className="text-body-sm font-medium text-carbon-900">
              {formatCarbon(data.predicted)}
            </span>
          </div>
          {!data.isActual && (
            <>
              <div className="flex items-center justify-between space-x-4">
                <span className="text-caption text-carbon-600">Range:</span>
                <span className="text-caption text-carbon-700">
                  {formatCarbon(data.lower)} - {formatCarbon(data.upper)}
                </span>
              </div>
              <div className="flex items-center justify-between space-x-4">
                <span className="text-caption text-carbon-600">Confidence:</span>
                <Badge 
                  variant={data.confidencePercentage >= 80 ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {data.confidencePercentage}%
                </Badge>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  const getRecommendationIcon = (type: string) => {
    switch (type) {
      case 'efficiency':
        return <Target className="h-4 w-4" />;
      case 'timing':
        return <TrendingUp className="h-4 w-4" />;
      case 'methodology':
        return <Lightbulb className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'low':
        return 'bg-primary-100 text-primary-800';
      case 'medium':
        return 'bg-efficiency-100 text-efficiency-800';
      case 'high':
        return 'bg-danger-100 text-danger-800';
      default:
        return 'bg-carbon-100 text-carbon-800';
    }
  };

  return (
    <div className={cn('grid grid-cols-1 lg:grid-cols-2 gap-6', className)}>
      {/* Forecast Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>30-Day Forecast</span>
            <Badge variant={forecastSummary.trend === 'down' ? 'default' : 'destructive'}>
              {forecastSummary.trend === 'up' && 'Increasing'}
              {forecastSummary.trend === 'down' && 'Decreasing'}
              {forecastSummary.trend === 'stable' && 'Stable'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-body-sm text-carbon-600">Projected Impact</div>
                <div className="text-display-sm font-bold text-carbon-900">
                  {forecastSummary.projectedChange > 0 ? '+' : ''}
                  {formatCarbon(Math.abs(forecastSummary.projectedChange))}
                </div>
              </div>
              <div className="text-right">
                <div className="text-body-sm text-carbon-600">Forecast Confidence</div>
                <div className="text-display-sm font-bold text-primary-600">
                  {confidence?.overall || 85}%
                </div>
              </div>
            </div>

            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgb(209, 213, 219)" strokeOpacity={0.5} />
                  <XAxis
                    dataKey="formattedDate"
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
                  <ReferenceLine x="Now" stroke="rgb(139, 69, 19)" strokeDasharray="5 5" />
                  <Line
                    type="monotone"
                    dataKey="predicted"
                    stroke="rgb(16, 185, 129)"
                    strokeWidth={2}
                    dot={{ fill: 'rgb(16, 185, 129)', strokeWidth: 2, r: 4 }}
                    connectNulls
                    animationDuration={prefersReducedMotion ? 0 : 1000}
                  />
                  <Line
                    type="monotone"
                    dataKey="lower"
                    stroke="rgb(156, 163, 175)"
                    strokeWidth={1}
                    strokeDasharray="3 3"
                    dot={false}
                    connectNulls
                    animationDuration={prefersReducedMotion ? 0 : 1200}
                  />
                  <Line
                    type="monotone"
                    dataKey="upper"
                    stroke="rgb(156, 163, 175)"
                    strokeWidth={1}
                    strokeDasharray="3 3"
                    dot={false}
                    connectNulls
                    animationDuration={prefersReducedMotion ? 0 : 1200}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Optimization Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {forecast?.recommendations?.length ? (
              forecast.recommendations.slice(0, 4).map((recommendation, index) => (
                <motion.div
                  key={index}
                  className="p-3 rounded-lg border border-carbon-200 bg-carbon-50"
                  initial={!prefersReducedMotion ? { opacity: 0, x: -20 } : { opacity: 1, x: 0 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={!prefersReducedMotion ? { delay: index * 0.1 } : { duration: 0 }}
                >
                  <div className="flex items-start space-x-3">
                    <div className="mt-1 p-1 rounded bg-primary-100 text-primary-600">
                      {getRecommendationIcon(recommendation.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-body-sm font-medium text-carbon-900 truncate">
                          {recommendation.title}
                        </h4>
                        <Badge className={getDifficultyColor(recommendation.difficulty)} variant="outline">
                          {recommendation.difficulty}
                        </Badge>
                      </div>
                      <p className="text-caption text-carbon-600 mb-2">
                        {recommendation.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-caption text-carbon-500">Potential Impact:</span>
                          <span className="text-caption font-medium text-primary-600">
                            -{formatCarbon(recommendation.impact)}
                          </span>
                        </div>
                        <Progress 
                          value={Math.min((recommendation.impact / currentEmissions) * 100, 100)} 
                          className="w-16 h-1"
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-8 text-carbon-500">
                <Lightbulb className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-body-sm">No optimization recommendations available</p>
                <p className="text-caption">Recommendations will appear based on your usage patterns</p>
              </div>
            )}

            {forecast?.recommendations && forecast.recommendations.length > 4 && (
              <Button variant="outline" className="w-full mt-4">
                View All {forecast.recommendations.length} Recommendations
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};