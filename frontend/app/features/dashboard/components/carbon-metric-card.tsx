import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, Leaf, Zap, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/components/ui/card';
import { Badge } from '@shared/components/ui/badge';
import { formatCarbon, getCarbonIntensity, getCarbonIntensityClasses } from '@shared/utils/carbon';
import { cn } from '@shared/utils/cn';
import { generateAriaProps, useReducedMotion } from '@shared/utils/accessibility';

interface CarbonMetricCardProps {
  title: string;
  value: number;
  unit?: 'g' | 'kg' | 'lb';
  trend?: 'up' | 'down' | 'stable';
  trendValue?: number;
  period?: string;
  isLoading?: boolean;
  isRealtime?: boolean;
  lastUpdated?: string;
  className?: string;
  icon?: React.ElementType;
}

export const CarbonMetricCard = ({
  title,
  value,
  unit = 'g',
  trend,
  trendValue,
  period = 'vs yesterday',
  isLoading = false,
  isRealtime = false,
  lastUpdated,
  className,
  icon: Icon = Leaf,
}: CarbonMetricCardProps) => {
  const intensity = getCarbonIntensity(value);
  const intensityClasses = getCarbonIntensityClasses(intensity);
  const prefersReducedMotion = useReducedMotion();

  const cardDescription = `${title}: ${formatCarbon(value, unit)}. Carbon intensity: ${intensity}.${
    trend && trendValue !== undefined 
      ? ` Trend: ${trend} by ${Math.abs(trendValue).toFixed(1)}% ${period}.`
      : ''
  }${isRealtime ? ' Updates in real-time.' : ''}`;

  const liveRegionProps = isRealtime ? generateAriaProps.liveRegion('polite') : {};

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4" />;
      case 'down':
        return <TrendingDown className="h-4 w-4" />;
      case 'stable':
      default:
        return <Minus className="h-4 w-4" />;
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return 'text-danger';
      case 'down':
        return 'text-primary-500';
      case 'stable':
      default:
        return 'text-carbon-500';
    }
  };

  if (isLoading) {
    return (
      <Card 
        className={cn('relative', className)}
        role="region"
        aria-label={`${title} loading`}
        aria-busy="true"
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-body-sm font-medium">{title}</CardTitle>
          <div className="loading-skeleton h-4 w-4 rounded" aria-hidden="true" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2" aria-hidden="true">
            <div className="loading-skeleton h-8 w-24 rounded" />
            <div className="loading-skeleton h-4 w-16 rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      layout
      initial={!prefersReducedMotion ? { opacity: 0, scale: 0.9 } : { opacity: 1, scale: 1 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={!prefersReducedMotion ? { duration: 0.3 } : { duration: 0 }}
    >
      <Card 
        className={cn('relative overflow-hidden', className)}
        role="region"
        aria-label={cardDescription}
        {...liveRegionProps}
      >
        {isRealtime && (
          <motion.div
            className="absolute top-2 right-2 flex items-center space-x-1"
            initial={!prefersReducedMotion ? { opacity: 0 } : { opacity: 1 }}
            animate={{ opacity: 1 }}
            transition={!prefersReducedMotion ? { delay: 0.2 } : { duration: 0 }}
            role="status"
            aria-label="Real-time updates enabled"
          >
            <motion.div
              className="h-2 w-2 bg-primary-500 rounded-full"
              animate={!prefersReducedMotion ? { scale: [1, 1.2, 1] } : {}}
              transition={!prefersReducedMotion ? { repeat: Infinity, duration: 2 } : {}}
              aria-hidden="true"
            />
            <span className="text-caption text-carbon-500">Live</span>
          </motion.div>
        )}

        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-body-sm font-medium text-carbon-600">{title}</CardTitle>
          <Icon className="h-4 w-4 text-carbon-400" />
        </CardHeader>

        <CardContent>
          <div className="space-y-3">
            <div className="flex items-baseline space-x-2">
              <motion.div
                className="metric-display text-carbon-900"
                key={value}
                initial={{ opacity: 0.7, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              >
                {formatCarbon(value, unit)}
              </motion.div>

              <Badge className={intensityClasses}>{intensity}</Badge>
            </div>

            {trend && trendValue !== undefined && (
              <div className="flex items-center space-x-2">
                <div className={cn('flex items-center space-x-1', getTrendColor())}>
                  {getTrendIcon()}
                  <span className="text-body-sm font-medium">
                    {Math.abs(trendValue).toFixed(1)}%
                  </span>
                </div>
                <span className="text-body-sm text-carbon-500">{period}</span>
              </div>
            )}

            {lastUpdated && (
              <div className="flex items-center space-x-1 text-caption text-carbon-400">
                <Clock className="h-3 w-3" />
                <span>Updated {new Date(lastUpdated).toLocaleTimeString()}</span>
              </div>
            )}

            {value > 0 && (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1">
                  <Zap className="h-3 w-3 text-efficiency-500" />
                  <span className="text-caption text-carbon-500">Efficiency Score</span>
                </div>
                <motion.div
                  className="text-body-sm font-medium text-efficiency-600"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  {Math.max(1, Math.round((1000 / Math.max(value, 1)) * 100))}
                </motion.div>
              </div>
            )}
          </div>
        </CardContent>

        {intensity === 'high' && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-danger/5 to-transparent pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.5, 0] }}
            transition={{ repeat: Infinity, duration: 3 }}
          />
        )}

        {intensity === 'low' && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-primary-500/5 to-transparent pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.3, 0] }}
            transition={{ repeat: Infinity, duration: 4 }}
          />
        )}
      </Card>
    </motion.div>
  );
};