import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Info,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronUp,
  Target,
  Database,
  Activity
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/components/ui/card';
import { Badge } from '@shared/components/ui/badge';
import { Progress } from '@shared/components/ui/progress';
import { Button } from '@shared/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@shared/components/ui/collapsible';
import { cn } from '@shared/utils/cn';
import type { QualityMetricsProps } from '@features/carbon/types';

export const QualityMetrics = ({
  quality,
  compact = false,
  interactive = true,
  className
}: QualityMetricsProps) => {
  const [isExpanded, setIsExpanded] = useState(!compact);
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-success-600';
    if (score >= 70) return 'text-warning-600';
    return 'text-danger-600';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 90) return 'bg-success-50 border-success-200';
    if (score >= 70) return 'bg-warning-50 border-warning-200';
    return 'bg-danger-50 border-danger-200';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 90) return CheckCircle;
    if (score >= 70) return AlertTriangle;
    return XCircle;
  };

  const getTrendIcon = (current: number, previous?: number) => {
    if (!previous) return Minus;
    if (current > previous) return TrendingUp;
    if (current < previous) return TrendingDown;
    return Minus;
  };

  const getTrendColor = (current: number, previous?: number) => {
    if (!previous) return 'text-carbon-400';
    if (current > previous) return 'text-success-600';
    if (current < previous) return 'text-danger-600';
    return 'text-carbon-400';
  };

  const calculateOverallScore = () => {
    const scores = [
      quality.freshness.score,
      quality.completeness.score,
      quality.accuracy.score,
      quality.consistency.score
    ];
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  };

  const getMetricDetails = (metricName: string) => {
    switch (metricName) {
      case 'freshness':
        return {
          title: 'Data Freshness',
          description: 'How recent and up-to-date the data is',
          icon: Activity,
          details: [
            `Last updated: ${quality.freshness.lastUpdate.toLocaleDateString()}`,
            `Staleness: ${Math.round(quality.freshness.staleness / 3600)}h`,
          ]
        };
      case 'completeness':
        return {
          title: 'Data Completeness',
          description: 'Percentage of required data fields available',
          icon: Database,
          details: [
            `Missing fields: ${quality.completeness.missingFields.length}`,
            quality.completeness.missingFields.length > 0 
              ? `Missing: ${quality.completeness.missingFields.slice(0, 3).join(', ')}`
              : 'All required fields present'
          ]
        };
      case 'accuracy':
        return {
          title: 'Data Accuracy',
          description: 'Validation against known standards and constraints',
          icon: Target,
          details: [
            `Validation errors: ${quality.accuracy.validationErrors.length}`,
            quality.accuracy.validationErrors.length > 0
              ? `Issues: ${quality.accuracy.validationErrors.slice(0, 2).join(', ')}`
              : 'All validations passed'
          ]
        };
      case 'consistency':
        return {
          title: 'Data Consistency',
          description: 'Agreement between different data sources',
          icon: BarChart3,
          details: [
            `Conflicts found: ${quality.consistency.conflicts.length}`,
            quality.consistency.conflicts.length > 0
              ? `Major conflicts: ${quality.consistency.conflicts.filter(c => c.deviation > 0.2).length}`
              : 'All sources in agreement'
          ]
        };
      default:
        return null;
    }
  };

  const overallScore = calculateOverallScore();
  const OverallIcon = getScoreIcon(overallScore);

  if (compact) {
    return (
      <Card className={cn('', className)}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <OverallIcon className={cn('h-5 w-5', getScoreColor(overallScore))} />
              <div>
                <p className="text-body-sm font-medium text-carbon-900">Data Quality</p>
                <p className="text-caption text-carbon-500">Overall assessment</p>
              </div>
            </div>
            <div className="text-right">
              <p className={cn('text-h6 font-bold', getScoreColor(overallScore))}>
                {overallScore}%
              </p>
              <div className="flex space-x-1">
                {[
                  { name: 'F', score: quality.freshness.score },
                  { name: 'C', score: quality.completeness.score },
                  { name: 'A', score: quality.accuracy.score },
                  { name: 'S', score: quality.consistency.score }
                ].map((metric) => (
                  <div
                    key={metric.name}
                    className={cn(
                      'w-2 h-2 rounded-full',
                      metric.score >= 90 ? 'bg-success-500' :
                      metric.score >= 70 ? 'bg-warning-500' : 'bg-danger-500'
                    )}
                    title={`${metric.name}: ${metric.score}%`}
                  />
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5 text-primary-600" />
            <span>Data Quality Metrics</span>
          </CardTitle>
          <Badge className={cn('flex items-center space-x-1', getScoreBgColor(overallScore))}>
            <OverallIcon className="h-3 w-3" />
            <span>{overallScore}% Overall</span>
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="text-center py-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="relative inline-flex items-center justify-center"
          >
            <svg className="w-24 h-24 transform -rotate-90">
              <circle
                cx="48"
                cy="48"
                r="40"
                stroke="currentColor"
                strokeWidth="8"
                fill="transparent"
                className="text-carbon-200"
              />
              <motion.circle
                cx="48"
                cy="48"
                r="40"
                stroke="currentColor"
                strokeWidth="8"
                fill="transparent"
                strokeDasharray={`${2 * Math.PI * 40}`}
                strokeDashoffset={`${2 * Math.PI * 40 * (1 - overallScore / 100)}`}
                strokeLinecap="round"
                className={getScoreColor(overallScore)}
                initial={{ strokeDashoffset: 2 * Math.PI * 40 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 40 * (1 - overallScore / 100) }}
                transition={{ duration: 1, delay: 0.5 }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={cn('text-2xl font-bold', getScoreColor(overallScore))}>
                {overallScore}
              </span>
            </div>
          </motion.div>
          <p className="text-body-sm text-carbon-600 mt-2">Quality Score</p>
        </div>

        <div className="space-y-4">
          {[
            { key: 'freshness', score: quality.freshness.score, label: 'Freshness' },
            { key: 'completeness', score: quality.completeness.score, label: 'Completeness' },
            { key: 'accuracy', score: quality.accuracy.score, label: 'Accuracy' },
            { key: 'consistency', score: quality.consistency.score, label: 'Consistency' }
          ].map((metric, index) => {
            const details = getMetricDetails(metric.key);
            const MetricIcon = details?.icon || Info;
            const isSelected = selectedMetric === metric.key;

            return (
              <motion.div
                key={metric.key}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div
                  className={cn(
                    'border rounded-lg transition-all duration-200',
                    isSelected ? 'border-primary-300 bg-primary-50/50' : 'border-carbon-200',
                    interactive && 'cursor-pointer hover:border-primary-200'
                  )}
                  onClick={() => interactive && setSelectedMetric(isSelected ? null : metric.key)}
                >
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <MetricIcon className="h-5 w-5 text-primary-600" />
                        <div>
                          <p className="text-body-sm font-medium text-carbon-900">
                            {details?.title || metric.label}
                          </p>
                          <p className="text-caption text-carbon-500">
                            {details?.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="text-right">
                          <span className={cn('text-body-base font-semibold', getScoreColor(metric.score))}>
                            {metric.score}%
                          </span>
                        </div>
                        {interactive && (
                          <div className="flex items-center">
                            {isSelected ? (
                              <ChevronUp className="h-4 w-4 text-carbon-400" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-carbon-400" />
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-3">
                      <Progress
                        value={metric.score}
                        className={cn(
                          'h-2',
                          metric.score >= 90 ? '[&>div]:bg-success-500' :
                          metric.score >= 70 ? '[&>div]:bg-warning-500' : '[&>div]:bg-danger-500'
                        )}
                      />
                    </div>
                  </div>

                  <AnimatePresence>
                    {isSelected && details && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 border-t border-primary-100">
                          <div className="pt-3 space-y-2">
                            {details.details.map((detail, detailIndex) => (
                              <div key={detailIndex} className="flex items-center space-x-2">
                                <div className="w-1 h-1 bg-primary-400 rounded-full" />
                                <p className="text-caption text-carbon-600">{detail}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}
        </div>

        {(quality.completeness.missingFields.length > 0 || 
          quality.accuracy.validationErrors.length > 0 || 
          quality.consistency.conflicts.length > 0) && (
          <div className="border-t border-carbon-200 pt-6">
            <h4 className="text-body-base font-medium text-carbon-900 mb-3">
              Issues Requiring Attention
            </h4>
            <div className="space-y-2">
              {quality.completeness.missingFields.length > 0 && (
                <div className="flex items-start space-x-2 text-warning-700 bg-warning-50 rounded p-2">
                  <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span className="text-caption">
                    {quality.completeness.missingFields.length} missing data fields
                  </span>
                </div>
              )}
              {quality.accuracy.validationErrors.length > 0 && (
                <div className="flex items-start space-x-2 text-danger-700 bg-danger-50 rounded p-2">
                  <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span className="text-caption">
                    {quality.accuracy.validationErrors.length} validation errors detected
                  </span>
                </div>
              )}
              {quality.consistency.conflicts.length > 0 && (
                <div className="flex items-start space-x-2 text-warning-700 bg-warning-50 rounded p-2">
                  <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span className="text-caption">
                    {quality.consistency.conflicts.length} data source conflicts
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};