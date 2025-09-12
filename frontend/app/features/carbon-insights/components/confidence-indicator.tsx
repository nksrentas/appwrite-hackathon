import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Info, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

import { Badge } from '@shared/components/ui/badge';
import { Button } from '@shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/components/ui/card';
import { Progress } from '@shared/components/ui/progress';
import { Popover, PopoverContent, PopoverTrigger } from '@shared/components/ui/popover';
import { useReducedMotion } from '@shared/utils/accessibility';
import { cn } from '@shared/utils/cn';

interface ConfidenceMetrics {
  overall: number;
  dataQuality: number;
  methodological: number;
  temporal: number;
  coverage: number;
  factors?: Array<{
    name: string;
    impact: 'positive' | 'negative';
    description: string;
  }>;
}

interface ConfidenceIndicatorProps {
  confidence: ConfidenceMetrics;
  showDetails?: boolean;
  className?: string;
}

export const ConfidenceIndicator = ({
  confidence,
  showDetails = false,
  className,
}: ConfidenceIndicatorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  const getConfidenceLevel = (score: number): { level: string; color: string; icon: any } => {
    if (score >= 90) {
      return { level: 'Excellent', color: 'text-primary-600', icon: CheckCircle };
    } else if (score >= 80) {
      return { level: 'Good', color: 'text-efficiency-600', icon: CheckCircle };
    } else if (score >= 70) {
      return { level: 'Fair', color: 'text-carbon-600', icon: AlertTriangle };
    } else {
      return { level: 'Poor', color: 'text-danger-600', icon: XCircle };
    }
  };

  const confidenceInfo = getConfidenceLevel(confidence.overall);
  const ConfidenceIcon = confidenceInfo.icon;

  const metrics = [
    { label: 'Data Quality', value: confidence.dataQuality, description: 'Quality and accuracy of source data' },
    { label: 'Methodology', value: confidence.methodological, description: 'Robustness of calculation methods' },
    { label: 'Temporal', value: confidence.temporal, description: 'Recency and relevance of data' },
    { label: 'Coverage', value: confidence.coverage, description: 'Completeness of data coverage' },
  ];

  const getMetricColor = (value: number) => {
    if (value >= 90) return 'bg-primary-500';
    if (value >= 80) return 'bg-efficiency-500';
    if (value >= 70) return 'bg-carbon-500';
    return 'bg-danger-500';
  };

  if (!showDetails) {
    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn('flex items-center space-x-2', className)}
          >
            <Shield className="h-4 w-4" />
            <span className="text-body-sm font-medium">
              {confidence.overall}% Confidence
            </span>
            <Info className="h-3 w-3 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="end">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <ConfidenceIcon className={cn('h-5 w-5', confidenceInfo.color)} />
              <span className="font-semibold">{confidenceInfo.level} Confidence</span>
            </div>
            
            <div className="space-y-3">
              {metrics.map((metric) => (
                <div key={metric.label} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-carbon-700">{metric.label}</span>
                    <span className="font-medium">{metric.value}%</span>
                  </div>
                  <Progress 
                    value={metric.value} 
                    className="h-2"
                    indicatorClassName={getMetricColor(metric.value)}
                  />
                  <p className="text-xs text-carbon-500">{metric.description}</p>
                </div>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Shield className="h-5 w-5 text-primary-500" />
          <span>Data Confidence</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Score */}
        <div className="text-center space-y-2">
          <motion.div
            className="flex items-center justify-center space-x-3"
            initial={!prefersReducedMotion ? { opacity: 0, scale: 0.8 } : { opacity: 1, scale: 1 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={!prefersReducedMotion ? { duration: 0.5, delay: 0.2 } : { duration: 0 }}
          >
            <ConfidenceIcon className={cn('h-8 w-8', confidenceInfo.color)} />
            <div>
              <div className="text-display-md font-bold text-carbon-900">
                {confidence.overall}%
              </div>
              <div className={cn('text-body-sm font-medium', confidenceInfo.color)}>
                {confidenceInfo.level}
              </div>
            </div>
          </motion.div>
          <p className="text-caption text-carbon-600">
            Overall confidence in carbon calculations
          </p>
        </div>

        {/* Detailed Metrics */}
        <div className="space-y-4">
          <h4 className="text-body-sm font-semibold text-carbon-900">Confidence Breakdown</h4>
          
          {metrics.map((metric, index) => (
            <motion.div
              key={metric.label}
              className="space-y-2"
              initial={!prefersReducedMotion ? { opacity: 0, x: -20 } : { opacity: 1, x: 0 }}
              animate={{ opacity: 1, x: 0 }}
              transition={!prefersReducedMotion ? { delay: 0.1 * index } : { duration: 0 }}
            >
              <div className="flex items-center justify-between">
                <span className="text-body-sm text-carbon-700">{metric.label}</span>
                <Badge variant="outline" className="text-xs">
                  {metric.value}%
                </Badge>
              </div>
              <Progress 
                value={metric.value} 
                className="h-2"
                indicatorClassName={getMetricColor(metric.value)}
              />
              <p className="text-caption text-carbon-500">{metric.description}</p>
            </motion.div>
          ))}
        </div>

        {/* Confidence Factors */}
        {confidence.factors && confidence.factors.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-body-sm font-semibold text-carbon-900">Key Factors</h4>
            <div className="space-y-2">
              {confidence.factors.map((factor, index) => (
                <motion.div
                  key={index}
                  className="flex items-start space-x-2 p-2 rounded-lg bg-carbon-50"
                  initial={!prefersReducedMotion ? { opacity: 0, y: 10 } : { opacity: 1, y: 0 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={!prefersReducedMotion ? { delay: 0.1 * index } : { duration: 0 }}
                >
                  <div className={cn(
                    'mt-0.5 h-2 w-2 rounded-full',
                    factor.impact === 'positive' ? 'bg-primary-500' : 'bg-danger-500'
                  )} />
                  <div className="flex-1 min-w-0">
                    <p className="text-caption font-medium text-carbon-900">{factor.name}</p>
                    <p className="text-caption text-carbon-600">{factor.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};