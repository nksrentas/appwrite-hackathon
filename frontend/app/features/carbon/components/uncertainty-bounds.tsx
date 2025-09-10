import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  Target,
  TrendingUp,
  TrendingDown,
  Info,
  AlertTriangle,
  Activity,
  Zap
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/components/ui/card';
import { Badge } from '@shared/components/ui/badge';
import { Button } from '@shared/components/ui/button';
import { Progress } from '@shared/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@shared/components/ui/tabs';
import { cn } from '@shared/utils/cn';
import type { UncertaintyBoundsProps } from '@features/carbon/types';

export const UncertaintyBounds = ({
  value,
  bounds,
  unit,
  visualization = 'range',
  className
}: UncertaintyBoundsProps) => {
  const [selectedVisualization, setSelectedVisualization] = useState(visualization);

  const range = bounds.upper - bounds.lower;
  const uncertainty = ((range / 2) / value) * 100;
  const lowerDeviation = ((value - bounds.lower) / value) * 100;
  const upperDeviation = ((bounds.upper - value) / value) * 100;

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 95) return 'text-success-600';
    if (confidence >= 90) return 'text-primary-600';
    if (confidence >= 80) return 'text-warning-600';
    return 'text-danger-600';
  };

  const getConfidenceBgColor = (confidence: number) => {
    if (confidence >= 95) return 'bg-success-50 border-success-200';
    if (confidence >= 90) return 'bg-primary-50 border-primary-200';
    if (confidence >= 80) return 'bg-warning-50 border-warning-200';
    return 'bg-danger-50 border-danger-200';
  };

  const BarVisualization = () => (
    <div className="space-y-4">
      <div className="relative">
        <div className="h-8 bg-carbon-100 rounded-lg relative overflow-hidden">
          <motion.div
            className="absolute h-full bg-primary-100 border border-primary-200"
            style={{
              left: `${((bounds.lower - bounds.lower) / (bounds.upper - bounds.lower)) * 100}%`,
              width: `100%`
            }}
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
            transition={{ duration: 1, delay: 0.2 }}
          />
          
          <motion.div
            className="absolute h-full bg-primary-200"
            style={{
              left: `${((value - (range * 0.341)) - bounds.lower) / (bounds.upper - bounds.lower) * 100}%`,
              width: `${(range * 0.682) / (bounds.upper - bounds.lower) * 100}%`
            }}
            initial={{ width: 0 }}
            animate={{ width: `${(range * 0.682) / (bounds.upper - bounds.lower) * 100}%` }}
            transition={{ duration: 1, delay: 0.5 }}
          />
          
          <motion.div
            className="absolute top-0 bottom-0 w-0.5 bg-primary-600"
            style={{
              left: `${((value - bounds.lower) / (bounds.upper - bounds.lower)) * 100}%`
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          />
        </div>
        
        <div className="flex justify-between text-caption text-carbon-500 mt-2">
          <span>{bounds.lower.toFixed(3)} {unit}</span>
          <span className="font-medium text-primary-700">
            {value.toFixed(3)} {unit}
          </span>
          <span>{bounds.upper.toFixed(3)} {unit}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 justify-center">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-primary-600 rounded-sm" />
          <span className="text-caption text-carbon-600">Best Estimate</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-primary-200 rounded-sm" />
          <span className="text-caption text-carbon-600">68% Confidence</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-primary-100 border border-primary-200 rounded-sm" />
          <span className="text-caption text-carbon-600">{bounds.confidence}% Confidence</span>
        </div>
      </div>
    </div>
  );

  const RangeVisualization = () => (
    <div className="space-y-6">
      <div className="text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5 }}
          className="inline-flex flex-col items-center p-6 bg-primary-50 border-2 border-primary-200 rounded-xl"
        >
          <Target className="h-6 w-6 text-primary-600 mb-2" />
          <div className="text-h4 font-bold text-primary-900 mb-1">
            {value.toFixed(3)}
          </div>
          <div className="text-body-sm text-primary-700 mb-3">{unit}</div>
          <Badge className="bg-primary-100 text-primary-700 border-primary-200">
            ±{uncertainty.toFixed(1)}% uncertainty
          </Badge>
        </motion.div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="text-center p-4 border border-carbon-200 rounded-lg"
        >
          <TrendingDown className="h-5 w-5 text-carbon-500 mx-auto mb-2" />
          <div className="text-h6 font-semibold text-carbon-900">
            {bounds.lower.toFixed(3)}
          </div>
          <div className="text-caption text-carbon-500">Lower Bound</div>
          <div className="text-caption text-carbon-600 mt-1">
            -{lowerDeviation.toFixed(1)}%
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="text-center p-4 border border-carbon-200 rounded-lg"
        >
          <TrendingUp className="h-5 w-5 text-carbon-500 mx-auto mb-2" />
          <div className="text-h6 font-semibold text-carbon-900">
            {bounds.upper.toFixed(3)}
          </div>
          <div className="text-caption text-carbon-500">Upper Bound</div>
          <div className="text-caption text-carbon-600 mt-1">
            +{upperDeviation.toFixed(1)}%
          </div>
        </motion.div>
      </div>
    </div>
  );

  const DistributionVisualization = () => {
    
    const points = 50;
    const distributionData = Array.from({ length: points }, (_, i) => {
      const x = bounds.lower + (i / (points - 1)) * range;
      
      const stdDev = range / 6; 
      const mean = value;
      const y = Math.exp(-0.5 * Math.pow((x - mean) / stdDev, 2));
      return { x, y };
    });

    const maxY = Math.max(...distributionData.map(p => p.y));
    const normalizedData = distributionData.map(p => ({ ...p, y: p.y / maxY }));

    return (
      <div className="space-y-4">
        <div className="relative h-24 bg-carbon-50 rounded-lg overflow-hidden">
          <svg className="absolute inset-0 w-full h-full">
            <defs>
              <linearGradient id="distributionGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.1" />
              </linearGradient>
            </defs>
            
            <motion.path
              d={`M ${normalizedData.map((p, i) => 
                `${(i / (points - 1)) * 100},${95 - p.y * 90}`
              ).join(' L ')}`}
              stroke="#3B82F6"
              strokeWidth="2"
              fill="none"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.5, delay: 0.2 }}
            />
            
            <motion.path
              d={`M 0,95 L ${normalizedData.map((p, i) => 
                `${(i / (points - 1)) * 100},${95 - p.y * 90}`
              ).join(' L ')} L 100,95 Z`}
              fill="url(#distributionGradient)"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.5, delay: 0.5 }}
            />

            <motion.line
              x1={`${((value - bounds.lower) / range) * 100}%`}
              y1="5%"
              x2={`${((value - bounds.lower) / range) * 100}%`}
              y2="95%"
              stroke="#1D4ED8"
              strokeWidth="2"
              strokeDasharray="4,4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
            />
          </svg>
        </div>
        
        <div className="flex justify-between text-caption text-carbon-500">
          <span>Lower: {bounds.lower.toFixed(3)}</span>
          <span className="font-medium text-primary-700">
            Best: {value.toFixed(3)}
          </span>
          <span>Upper: {bounds.upper.toFixed(3)}</span>
        </div>

        <div className="text-center">
          <p className="text-body-sm text-carbon-600">
            Probability distribution showing likelihood of different values
          </p>
        </div>
      </div>
    );
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5 text-primary-600" />
            <span>Uncertainty Bounds</span>
          </CardTitle>
          <Badge className={cn(
            'flex items-center space-x-1',
            getConfidenceBgColor(bounds.confidence),
            getConfidenceColor(bounds.confidence)
          )}>
            <Zap className="h-3 w-3" />
            <span>{bounds.confidence}% confident</span>
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-h6 font-bold text-carbon-900">
              {uncertainty.toFixed(1)}%
            </div>
            <div className="text-caption text-carbon-500">Uncertainty</div>
          </div>
          <div className="text-center">
            <div className="text-h6 font-bold text-carbon-900">
              {range.toFixed(3)}
            </div>
            <div className="text-caption text-carbon-500">Range ({unit})</div>
          </div>
          <div className="text-center">
            <div className={cn('text-h6 font-bold', getConfidenceColor(bounds.confidence))}>
              {bounds.confidence}%
            </div>
            <div className="text-caption text-carbon-500">Confidence</div>
          </div>
        </div>

        <Tabs value={selectedVisualization} onValueChange={(value) => setSelectedVisualization(value as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="range">Range</TabsTrigger>
            <TabsTrigger value="bar">Bar</TabsTrigger>
            <TabsTrigger value="distribution">Distribution</TabsTrigger>
          </TabsList>

          <TabsContent value="range" className="mt-6">
            <RangeVisualization />
          </TabsContent>

          <TabsContent value="bar" className="mt-6">
            <BarVisualization />
          </TabsContent>

          <TabsContent value="distribution" className="mt-6">
            <DistributionVisualization />
          </TabsContent>
        </Tabs>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-body-base font-medium text-blue-900 mb-2">
                Understanding Uncertainty
              </h4>
              <div className="space-y-2 text-body-sm text-blue-800">
                <p>
                  We are {bounds.confidence}% confident the true value lies between{' '}
                  <span className="font-medium">{bounds.lower.toFixed(3)}</span> and{' '}
                  <span className="font-medium">{bounds.upper.toFixed(3)} {unit}</span>.
                </p>
                <p>
                  The uncertainty of ±{uncertainty.toFixed(1)}% reflects limitations in 
                  data quality, measurement precision, and modeling assumptions.
                </p>
              </div>
            </div>
          </div>
        </div>

        {uncertainty > 25 && (
          <div className="bg-warning-50 border border-warning-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-warning-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-body-base font-medium text-warning-900 mb-2">
                  High Uncertainty Detected
                </h4>
                <p className="text-body-sm text-warning-800">
                  The uncertainty in this calculation is relatively high ({uncertainty.toFixed(1)}%). 
                  Consider reviewing data sources or methodology to improve precision.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};