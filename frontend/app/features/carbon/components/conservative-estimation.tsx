import { motion } from 'framer-motion';
import {
  TrendingUp,
  Shield,
  AlertTriangle,
  Info,
  Calculator,
  Target,
  ArrowRight,
  Leaf
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/components/ui/card';
import { Badge } from '@shared/components/ui/badge';
import { Progress } from '@shared/components/ui/progress';
import { cn } from '@shared/utils/cn';
import type { ConservativeEstimationProps } from '@features/carbon/types';

export const ConservativeEstimation = ({
  baseEstimate,
  conservativeFactor,
  finalEstimate,
  unit,
  rationale,
  className
}: ConservativeEstimationProps) => {
  const conservativeIncrease = ((finalEstimate - baseEstimate) / baseEstimate) * 100;

  return (
    <Card className={cn('border-primary-200 bg-primary-50/30', className)}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-primary-600" />
            <span>Conservative Approach</span>
          </div>
          <Badge className="bg-primary-100 text-primary-700 border-primary-200">
            <TrendingUp className="h-3 w-3 mr-1" />
            {conservativeIncrease.toFixed(1)}% buffer
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-center space-x-4">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="text-center flex-1"
            >
              <div className="bg-white border-2 border-carbon-200 rounded-lg p-4">
                <div className="flex items-center justify-center mb-2">
                  <Calculator className="h-4 w-4 text-carbon-500" />
                </div>
                <p className="text-caption text-carbon-500 mb-1">Base Calculation</p>
                <p className="text-h6 font-bold text-carbon-900">
                  {baseEstimate.toFixed(3)} {unit}
                </p>
                <p className="text-caption text-carbon-600 mt-1">Standard methodology</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="flex-shrink-0"
            >
              <div className="flex flex-col items-center space-y-1">
                <ArrowRight className="h-5 w-5 text-primary-600" />
                <span className="text-caption text-primary-600 font-medium">
                  ×{conservativeFactor}
                </span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="text-center flex-1"
            >
              <div className="bg-primary-100 border-2 border-primary-300 rounded-lg p-4">
                <div className="flex items-center justify-center mb-2">
                  <Target className="h-4 w-4 text-primary-700" />
                </div>
                <p className="text-caption text-primary-700 mb-1">Conservative Estimate</p>
                <p className="text-h6 font-bold text-primary-900">
                  {finalEstimate.toFixed(3)} {unit}
                </p>
                <p className="text-caption text-primary-700 mt-1">Upper-bound approach</p>
              </div>
            </motion.div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-body-sm text-carbon-600">Conservative Buffer Applied</span>
              <span className="text-body-sm font-semibold text-primary-700">
                +{conservativeIncrease.toFixed(1)}%
              </span>
            </div>
            <Progress 
              value={conservativeIncrease} 
              className="h-2 [&>div]:bg-primary-500"
            />
          </div>
        </div>

        <div className="bg-success-50 border border-success-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-3">
            <Leaf className="h-4 w-4 text-success-600" />
            <span className="text-body-sm font-medium text-success-900">
              Environmental Commitment
            </span>
          </div>
          <p className="text-body-sm text-success-800 mb-3">
            By using conservative estimates, we ensure your carbon footprint is never 
            underestimated, promoting genuine environmental responsibility.
          </p>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-h6 font-bold text-success-700">
                {((conservativeIncrease / 100) * baseEstimate).toFixed(3)}
              </p>
              <p className="text-caption text-success-600">Additional {unit} accounted</p>
            </div>
            <div>
              <p className="text-h6 font-bold text-success-700">0%</p>
              <p className="text-caption text-success-600">Risk of underestimation</p>
            </div>
          </div>
        </div>

        <div className="border-t border-primary-200 pt-4">
          <div className="flex items-start space-x-3">
            <Info className="h-5 w-5 text-primary-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-body-base font-medium text-carbon-900 mb-2">
                Why We Use Conservative Estimates
              </h4>
              <p className="text-body-sm text-carbon-700 mb-3">{rationale}</p>
              <div className="space-y-2">
                <div className="flex items-start space-x-2">
                  <div className="w-1 h-1 bg-primary-500 rounded-full mt-2 flex-shrink-0" />
                  <p className="text-body-sm text-carbon-600">
                    Prevents greenwashing by avoiding underestimation of environmental impact
                  </p>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-1 h-1 bg-primary-500 rounded-full mt-2 flex-shrink-0" />
                  <p className="text-body-sm text-carbon-600">
                    Accounts for measurement uncertainties and data limitations
                  </p>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-1 h-1 bg-primary-500 rounded-full mt-2 flex-shrink-0" />
                  <p className="text-body-sm text-carbon-600">
                    Promotes genuine environmental responsibility and transparency
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-warning-50 border border-warning-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-warning-600" />
            <span className="text-body-sm font-medium text-warning-900">
              Industry Comparison
            </span>
          </div>
          <p className="text-body-sm text-warning-800">
            Many carbon calculators may underestimate emissions to appear more 
            favorable. Our conservative approach ensures scientific integrity and 
            environmental accountability.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};