import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  BarChart3,
  Target,
  Zap
} from 'lucide-react';
import { Badge } from '@shared/components/ui/badge';
import { Progress } from '@shared/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@shared/components/ui/tooltip';
import { cn } from '@shared/utils/cn';
import type { ConfidenceIndicatorProps, ConfidenceLevel } from '@features/carbon/types';

export const ConfidenceIndicators = ({
  confidence,
  uncertainty,
  score,
  interactive = true,
  size = 'md',
  showTooltip = true,
  className
}: ConfidenceIndicatorProps) => {
  const getConfidenceDetails = (confidence: ConfidenceLevel) => {
    switch (confidence) {
      case 'high':
        return {
          icon: CheckCircle,
          label: 'High Confidence',
          color: 'text-success-600',
          bgColor: 'bg-success-50',
          borderColor: 'border-success-200',
          description: 'Calculation based on authoritative, recent data with minimal uncertainty',
          numericRange: '90-100%',
          recommendations: ['Safe to use for decision making', 'High accuracy expected']
        };
      case 'medium':
        return {
          icon: AlertTriangle,
          label: 'Medium Confidence',
          color: 'text-warning-600',
          bgColor: 'bg-warning-50',
          borderColor: 'border-warning-200',
          description: 'Good data quality with some limitations or moderate uncertainty',
          numericRange: '70-89%',
          recommendations: ['Consider uncertainty bounds', 'Valid for general estimates']
        };
      case 'low':
        return {
          icon: XCircle,
          label: 'Low Confidence',
          color: 'text-danger-600',
          bgColor: 'bg-danger-50',
          borderColor: 'border-danger-200',
          description: 'Limited data quality, significant uncertainty, or assumptions',
          numericRange: 'Below 70%',
          recommendations: ['Use with caution', 'Consider alternative sources', 'Review methodology']
        };
    }
  };

  const getSizeClasses = (size: 'sm' | 'md' | 'lg') => {
    switch (size) {
      case 'sm':
        return {
          icon: 'h-3 w-3',
          text: 'text-caption',
          badge: 'text-xs px-2 py-0.5'
        };
      case 'lg':
        return {
          icon: 'h-6 w-6',
          text: 'text-body-base',
          badge: 'text-sm px-3 py-1'
        };
      default:
        return {
          icon: 'h-4 w-4',
          text: 'text-body-sm',
          badge: 'text-xs px-2.5 py-1'
        };
    }
  };

  const details = getConfidenceDetails(confidence);
  const sizeClasses = getSizeClasses(size);
  const ConfidenceIcon = details.icon;
  const confidenceScore = score || (
    confidence === 'high' ? 95 :
    confidence === 'medium' ? 80 : 65
  );

  const tooltipContent = showTooltip ? (
    <div className="space-y-3 max-w-sm">
      <div>
        <p className="font-medium text-carbon-900 mb-1">{details.label}</p>
        <p className="text-body-sm text-carbon-700">{details.description}</p>
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-caption text-carbon-500">Confidence Score</span>
          <span className={cn('text-caption font-medium', details.color)}>
            {confidenceScore}%
          </span>
        </div>
        {uncertainty !== undefined && (
          <div className="flex items-center justify-between">
            <span className="text-caption text-carbon-500">Uncertainty</span>
            <span className="text-caption text-carbon-700">±{uncertainty}%</span>
          </div>
        )}
      </div>

      <div>
        <p className="text-caption font-medium text-carbon-700 mb-1">Recommendations:</p>
        <ul className="text-caption text-carbon-600 space-y-1">
          {details.recommendations.map((rec, index) => (
            <li key={index} className="flex items-start space-x-1">
              <span className="text-carbon-400 mt-1">•</span>
              <span>{rec}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  ) : null;

  const BadgeComponent = (
    <Badge 
      className={cn(
        'flex items-center space-x-1 transition-all duration-200',
        details.bgColor, 
        details.color, 
        details.borderColor,
        sizeClasses.badge,
        interactive && 'hover:shadow-sm cursor-help',
        className
      )}
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1 }}
      >
        <ConfidenceIcon className={sizeClasses.icon} />
      </motion.div>
      <span>{confidence}</span>
      {uncertainty !== undefined && (
        <span className="opacity-75">±{uncertainty}%</span>
      )}
    </Badge>
  );

  if (!showTooltip || !interactive) {
    return BadgeComponent;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {BadgeComponent}
        </TooltipTrigger>
        <TooltipContent side="top" className="p-4">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};


export const DetailedConfidenceIndicators = ({
  confidence,
  uncertainty,
  score,
  breakdown,
  className
}: ConfidenceIndicatorProps & { breakdown?: Array<{ name: string; score: number; weight: number }> }) => {
  const details = getConfidenceDetails(confidence);
  const ConfidenceIcon = details.icon;
  const confidenceScore = score || (
    confidence === 'high' ? 95 :
    confidence === 'medium' ? 80 : 65
  );

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <ConfidenceIcon className={cn('h-5 w-5', details.color)} />
          <div>
            <h4 className="text-body-base font-medium text-carbon-900">
              {details.label}
            </h4>
            <p className="text-caption text-carbon-500">
              Calculation confidence assessment
            </p>
          </div>
        </div>
        <Badge className={cn(
          'flex items-center space-x-1',
          details.bgColor,
          details.color,
          details.borderColor
        )}>
          <span>{confidenceScore}%</span>
        </Badge>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-body-sm text-carbon-600">Overall Score</span>
          <span className={cn('text-body-sm font-semibold', details.color)}>
            {confidenceScore}%
          </span>
        </div>
        <Progress 
          value={confidenceScore} 
          className={cn(
            'h-2',
            confidence === 'high' ? '[&>div]:bg-success-500' :
            confidence === 'medium' ? '[&>div]:bg-warning-500' : '[&>div]:bg-danger-500'
          )}
        />
      </div>

      {uncertainty !== undefined && (
        <div className="flex items-center justify-between p-3 bg-carbon-50 rounded-lg">
          <div className="flex items-center space-x-2">
            <Target className="h-4 w-4 text-carbon-500" />
            <span className="text-body-sm text-carbon-700">Uncertainty Range</span>
          </div>
          <span className="text-body-sm font-medium text-carbon-900">±{uncertainty}%</span>
        </div>
      )}

      {breakdown && breakdown.length > 0 && (
        <div className="space-y-3">
          <h5 className="text-body-sm font-medium text-carbon-700 flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>Contributing Factors</span>
          </h5>
          <div className="space-y-2">
            {breakdown.map((factor, index) => (
              <div key={index} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={cn(
                      'w-2 h-2 rounded-full',
                      factor.score >= 90 ? 'bg-success-500' :
                      factor.score >= 70 ? 'bg-warning-500' : 'bg-danger-500'
                    )} />
                    <span className="text-caption text-carbon-600 capitalize">
                      {factor.name.replace('-', ' ')}
                    </span>
                    <span className="text-caption text-carbon-400">
                      ({Math.round(factor.weight * 100)}%)
                    </span>
                  </div>
                  <span className={cn(
                    'text-caption font-medium',
                    factor.score >= 90 ? 'text-success-600' :
                    factor.score >= 70 ? 'text-warning-600' : 'text-danger-600'
                  )}>
                    {factor.score}%
                  </span>
                </div>
                <Progress 
                  value={factor.score} 
                  className={cn(
                    'h-1',
                    factor.score >= 90 ? '[&>div]:bg-success-400' :
                    factor.score >= 70 ? '[&>div]:bg-warning-400' : '[&>div]:bg-danger-400'
                  )}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="border-t border-carbon-200 pt-3">
        <p className="text-body-sm text-carbon-600 mb-3">{details.description}</p>
        <div className="space-y-1">
          {details.recommendations.map((rec, index) => (
            <div key={index} className="flex items-start space-x-2">
              <div className="w-1 h-1 bg-carbon-400 rounded-full mt-2 flex-shrink-0" />
              <p className="text-caption text-carbon-600">{rec}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};


export const CompactConfidenceIndicator = ({
  confidence,
  uncertainty,
  size = 'sm',
  className
}: Omit<ConfidenceIndicatorProps, 'interactive' | 'showTooltip'>) => {
  const details = getConfidenceDetails(confidence);
  const ConfidenceIcon = details.icon;

  return (
    <div className={cn('flex items-center space-x-1', className)}>
      <ConfidenceIcon className={cn(
        size === 'sm' ? 'h-3 w-3' : 'h-4 w-4',
        details.color
      )} />
      <span className={cn(
        size === 'sm' ? 'text-caption' : 'text-body-sm',
        'text-carbon-600'
      )}>
        {confidence}
      </span>
      {uncertainty !== undefined && (
        <span className={cn(
          size === 'sm' ? 'text-caption' : 'text-body-sm',
          'text-carbon-500'
        )}>
          ±{uncertainty}%
        </span>
      )}
    </div>
  );
};