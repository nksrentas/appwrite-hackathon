import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  ChevronRight,
  Calculator,
  AlertTriangle,
  Info,
  ExternalLink,
  Copy,
  CheckCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/components/ui/card';
import { Button } from '@shared/components/ui/button';
import { Badge } from '@shared/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@shared/components/ui/collapsible';
import { cn } from '@shared/utils/cn';
import type { CalculationBreakdownProps } from '@features/carbon/types';

export const CalculationBreakdown = ({
  calculationResult,
  detailLevel,
  showAlternatives = false,
  className
}: CalculationBreakdownProps) => {
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set([1]));
  const [copiedFormula, setCopiedFormula] = useState<string | null>(null);
  const [showUncertainty, setShowUncertainty] = useState(true);

  const toggleStep = (stepNumber: number) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(stepNumber)) {
      newExpanded.delete(stepNumber);
    } else {
      newExpanded.add(stepNumber);
    }
    setExpandedSteps(newExpanded);
  };

  const copyFormula = async (formula: string, stepNumber: number) => {
    try {
      await navigator.clipboard.writeText(formula);
      setCopiedFormula(`step-${stepNumber}`);
      setTimeout(() => setCopiedFormula(null), 2000);
    } catch (error) {
      console.error('Failed to copy formula:', error);
    }
  };

  const getStepIcon = (stepNumber: number) => {
    return (
      <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
        <span className="text-body-sm font-semibold text-primary-700">
          {stepNumber}
        </span>
      </div>
    );
  };

  const formatNumber = (value: number, precision: number = 6) => {
    return value.toLocaleString(undefined, { 
      minimumFractionDigits: precision,
      maximumFractionDigits: precision
    });
  };

  const getUncertaintyIndicator = (step: any) => {
    if (!showUncertainty || !step.assumptions) return null;

    const hasUncertainty = step.assumptions.some((assumption: any) => assumption.uncertainty);
    if (!hasUncertainty) return null;

    return (
      <div className="flex items-center space-x-1 text-warning-600">
        <AlertTriangle className="h-3 w-3" />
        <span className="text-caption">Uncertain values</span>
      </div>
    );
  };

  return (
    <div className={cn('space-y-6', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Calculator className="h-5 w-5 text-primary-600" />
          <h3 className="text-h5 font-semibold text-carbon-900">
            Step-by-Step Calculation
          </h3>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowUncertainty(!showUncertainty)}
            className="flex items-center space-x-1"
          >
            {showUncertainty ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            <span>Uncertainty</span>
          </Button>
          <Badge variant="outline" className="text-caption">
            {detailLevel} mode
          </Badge>
        </div>
      </div>

      <Card className="border-primary-200 bg-primary-50/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-body-sm text-primary-700 mb-1">Final Result</p>
              <p className="text-h4 font-bold text-primary-900">
                {formatNumber(calculationResult.carbonFootprint, 3)} {calculationResult.unit}
              </p>
              {calculationResult.uncertaintyBounds && showUncertainty && (
                <p className="text-body-sm text-primary-600 mt-1">
                  Confidence Range: {formatNumber(calculationResult.uncertaintyBounds.lower, 3)} - {formatNumber(calculationResult.uncertaintyBounds.upper, 3)} {calculationResult.unit}
                </p>
              )}
            </div>
            <div className="text-right">
              <Badge className={cn(
                'mb-2',
                calculationResult.confidence === 'high' ? 'bg-success-50 text-success-700 border-success-200' :
                calculationResult.confidence === 'medium' ? 'bg-warning-50 text-warning-700 border-warning-200' :
                'bg-danger-50 text-danger-700 border-danger-200'
              )}>
                {calculationResult.confidence} confidence
              </Badge>
              <p className="text-caption text-carbon-500">
                ±{calculationResult.uncertainty}% uncertainty
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <AnimatePresence>
          {calculationResult.calculationSteps.map((step, index) => {
            const isExpanded = expandedSteps.has(step.stepNumber);
            const isLastStep = index === calculationResult.calculationSteps.length - 1;

            return (
              <motion.div
                key={step.stepNumber}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className={cn(
                  'transition-all duration-200',
                  isExpanded ? 'ring-2 ring-primary-200 border-primary-300' : 'border-carbon-200 hover:border-primary-200',
                  isLastStep && 'border-primary-200 bg-primary-50/30'
                )}>
                  <Collapsible open={isExpanded} onOpenChange={() => toggleStep(step.stepNumber)}>
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-carbon-50 transition-colors">
                        <div className="flex items-center space-x-4">
                          {getStepIcon(step.stepNumber)}
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-body-base font-medium text-carbon-900">
                                {step.description}
                              </CardTitle>
                              <div className="flex items-center space-x-2">
                                {getUncertaintyIndicator(step)}
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4 text-carbon-400" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-carbon-400" />
                                )}
                              </div>
                            </div>
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-body-sm text-carbon-600">
                                Result: <span className="font-medium text-carbon-900">
                                  {formatNumber(step.result)} {step.unit}
                                </span>
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <CardContent className="space-y-4 pt-0">
                        <div className="bg-carbon-50 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="text-body-sm font-medium text-carbon-700">Formula</h5>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyFormula(step.formula, step.stepNumber)}
                              className="h-auto p-1"
                              aria-label="Copy formula"
                            >
                              {copiedFormula === `step-${step.stepNumber}` ? (
                                <CheckCircle className="h-3 w-3 text-success-600" />
                              ) : (
                                <Copy className="h-3 w-3 text-carbon-400" />
                              )}
                            </Button>
                          </div>
                          <div className="font-mono text-body-sm bg-white border border-carbon-200 rounded px-3 py-2">
                            {step.formula}
                          </div>
                          {step.calculation && (
                            <>
                              <p className="text-body-sm font-medium text-carbon-700 mt-3 mb-2">
                                With Values
                              </p>
                              <div className="font-mono text-body-sm bg-white border border-carbon-200 rounded px-3 py-2">
                                {step.calculation}
                              </div>
                            </>
                          )}
                        </div>

                        {detailLevel !== 'basic' && step.variables && step.variables.length > 0 && (
                          <div>
                            <h5 className="text-body-sm font-medium text-carbon-700 mb-3">
                              Variable Definitions
                            </h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {step.variables.map((variable, varIndex) => (
                                <div key={varIndex} className="flex items-start space-x-2 p-2 bg-white border border-carbon-100 rounded">
                                  <span className="font-mono text-body-sm font-bold text-primary-700 mt-0.5">
                                    {variable.symbol}
                                  </span>
                                  <div className="flex-1">
                                    <p className="text-body-sm text-carbon-900">{variable.definition}</p>
                                    <p className="text-caption text-carbon-500">
                                      Unit: {variable.unit}
                                      {variable.value !== undefined && (
                                        <span className="ml-2">Value: {variable.value}</span>
                                      )}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {step.assumptions && step.assumptions.length > 0 && (
                          <div>
                            <h5 className="text-body-sm font-medium text-carbon-700 mb-3">
                              Assumptions & Limitations
                            </h5>
                            <div className="space-y-3">
                              {step.assumptions.map((assumption, assIndex) => (
                                <div key={assIndex} className="border-l-4 border-warning-200 pl-4 py-2">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <p className="text-body-sm font-medium text-carbon-900">
                                        {assumption.parameter}
                                      </p>
                                      <p className="text-body-sm text-carbon-600 mt-1">
                                        {assumption.rationale}
                                      </p>
                                      <p className="text-caption text-carbon-500 mt-1">
                                        Source: {assumption.source}
                                      </p>
                                    </div>
                                    <div className="text-right ml-4">
                                      <p className="text-body-sm font-medium text-carbon-900">
                                        {assumption.value} {assumption.unit}
                                      </p>
                                      {assumption.uncertainty && showUncertainty && (
                                        <Badge variant="outline" className="text-xs text-warning-600 border-warning-200 mt-1">
                                          ±{assumption.uncertainty}%
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {detailLevel === 'expert' && showAlternatives && (
                          <div>
                            <h5 className="text-body-sm font-medium text-carbon-700 mb-3">
                              Alternative Calculation Methods
                            </h5>
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                              <div className="flex items-start space-x-2">
                                <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                <div>
                                  <p className="text-body-sm text-blue-900 font-medium">
                                    Alternative approaches available
                                  </p>
                                  <p className="text-body-sm text-blue-700 mt-1">
                                    This calculation could also be performed using regional averages, 
                                    time-of-use factors, or machine learning estimates. The current method 
                                    was selected for its balance of accuracy and data availability.
                                  </p>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="mt-2 text-blue-700 border-blue-200 hover:bg-blue-100"
                                  >
                                    <ExternalLink className="h-3 w-3 mr-1" />
                                    View Comparison Study
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {detailLevel !== 'basic' && (
        <Card className="border-carbon-200">
          <CardHeader>
            <CardTitle className="text-h6">Calculation Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-h5 font-bold text-carbon-900">
                  {calculationResult.calculationSteps.length}
                </p>
                <p className="text-caption text-carbon-500">Calculation Steps</p>
              </div>
              <div className="text-center">
                <p className="text-h5 font-bold text-carbon-900">
                  {calculationResult.dataSources.length}
                </p>
                <p className="text-caption text-carbon-500">Data Sources</p>
              </div>
              <div className="text-center">
                <p className="text-h5 font-bold text-carbon-900">
                  {calculationResult.assumptions.length}
                </p>
                <p className="text-caption text-carbon-500">Assumptions Made</p>
              </div>
              <div className="text-center">
                <p className={cn(
                  "text-h5 font-bold",
                  calculationResult.confidence === 'high' ? 'text-success-600' :
                  calculationResult.confidence === 'medium' ? 'text-warning-600' :
                  'text-danger-600'
                )}>
                  {calculationResult.uncertainty}%
                </p>
                <p className="text-caption text-carbon-500">Uncertainty</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};