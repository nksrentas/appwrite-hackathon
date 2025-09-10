import { motion, AnimatePresence } from 'framer-motion';
import { X, Calculator, Zap, Database, TrendingUp, Info, ExternalLink, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@shared/components/ui/dialog';
import { Button } from '@shared/components/ui/button';
import { Badge } from '@shared/components/ui/badge';
import { Separator } from '@shared/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/components/ui/card';
import { cn } from '@shared/utils/cn';

interface MethodologyModalProps {
  trigger?: React.ReactNode;
  carbonValue: number;
  carbonUnit?: string;
  calculation?: {
    methodology: string;
    emissionFactors: Record<string, unknown>;
    confidence: number;
    dataSource: string;
    version: string;
  };
  className?: string;
}

export const MethodologyModal = ({
  trigger,
  carbonValue,
  carbonUnit = 'g',
  calculation = {
    methodology: 'GitHub Activity Carbon Footprint Calculator v2.1',
    emissionFactors: {
      'commit': { value: 4.2, unit: 'gCO2e', source: 'Green Software Foundation' },
      'pr': { value: 12.8, unit: 'gCO2e', source: 'Green Software Foundation' },
      'ci_run': { value: 45.3, unit: 'gCO2e', source: 'Cloud Carbon Footprint' },
      'deployment': { value: 89.7, unit: 'gCO2e', source: 'Cloud Carbon Footprint' },
    },
    confidence: 87,
    dataSource: 'GitHub API + Cloud Provider APIs',
    version: 'v2.1.3',
  },
  className,
}: MethodologyModalProps) => {
  const defaultTrigger = (
    <Button variant="ghost" size="sm" className="text-carbon-500 hover:text-carbon-700 p-0 h-auto">
      <Info className="h-4 w-4 mr-1" />
      How is this calculated?
    </Button>
  );

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-success-600 bg-success-50';
    if (confidence >= 70) return 'text-warning-600 bg-warning-50';
    return 'text-danger-600 bg-danger-50';
  };

  const methodologySteps = [
    {
      step: 1,
      title: 'Activity Detection',
      description: 'Monitor GitHub activities via webhook events',
      details: 'Captures commits, pull requests, CI/CD runs, and deployments in real-time',
      icon: Database,
    },
    {
      step: 2,
      title: 'Resource Calculation',
      description: 'Estimate computational resources used',
      details: 'Analyzes code complexity, build duration, and infrastructure scaling',
      icon: Calculator,
    },
    {
      step: 3,
      title: 'Carbon Conversion',
      description: 'Convert resources to carbon emissions',
      details: 'Uses regional grid carbon intensity and cloud provider emission factors',
      icon: Zap,
    },
    {
      step: 4,
      title: 'Aggregation & Trends',
      description: 'Combine data and calculate trends',
      details: 'Provides personal, team, and historical carbon footprint insights',
      icon: TrendingUp,
    },
  ];

  return (
    <Dialog>
      <DialogTrigger asChild className={className}>
        {trigger || defaultTrigger}
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2 text-carbon-900">
            <Calculator className="h-5 w-5" />
            <span>Carbon Calculation Methodology</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Current Calculation</span>
                <Badge className={cn('px-3 py-1', getConfidenceColor(calculation.confidence))}>
                  {calculation.confidence}% confidence
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-body-sm text-carbon-500">Total Carbon</p>
                  <p className="metric-display text-carbon-900">
                    {carbonValue.toFixed(1)}{carbonUnit} CO₂e
                  </p>
                </div>
                <div>
                  <p className="text-body-sm text-carbon-500">Methodology</p>
                  <p className="text-body-base font-medium text-carbon-700">
                    {calculation.methodology}
                  </p>
                </div>
                <div>
                  <p className="text-body-sm text-carbon-500">Data Source</p>
                  <p className="text-body-base text-carbon-700">{calculation.dataSource}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <h3 className="text-h5 font-semibold text-carbon-900">Calculation Process</h3>
            <div className="space-y-4">
              {methodologySteps.map((step, index) => (
                <motion.div
                  key={step.step}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-start space-x-4 p-4 bg-white border border-carbon-200 rounded-lg hover:border-primary-300 transition-colors"
                >
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                      <span className="text-body-sm font-semibold text-primary-700">
                        {step.step}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <step.icon className="h-4 w-4 text-primary-600" />
                      <h4 className="text-body-base font-semibold text-carbon-900">
                        {step.title}
                      </h4>
                    </div>
                    <p className="text-body-sm text-carbon-600 mb-2">{step.description}</p>
                    <p className="text-caption text-carbon-500">{step.details}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-carbon-400 flex-shrink-0" />
                </motion.div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-h5 font-semibold text-carbon-900">Emission Factors</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(calculation.emissionFactors).map(([activity, factor]: [string, any]) => (
                <Card key={activity} className="bg-carbon-50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline" className="capitalize">
                        {activity.replace('_', ' ')}
                      </Badge>
                      <span className="text-body-sm font-semibold text-carbon-900">
                        {factor.value} {factor.unit}
                      </span>
                    </div>
                    <p className="text-caption text-carbon-500">
                      Source: {factor.source}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="text-h5 font-semibold text-carbon-900">Technical Details</h3>
            <div className="bg-carbon-50 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-body-sm text-carbon-600">Algorithm Version</span>
                <Badge variant="secondary">{calculation.version}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-body-sm text-carbon-600">Update Frequency</span>
                <span className="text-body-sm text-carbon-900">Real-time</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-body-sm text-carbon-600">Regional Factors</span>
                <span className="text-body-sm text-carbon-900">Auto-detected by IP</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-body-sm text-carbon-600">Measurement Standard</span>
                <span className="text-body-sm text-carbon-900">ISO 14067</span>
              </div>
            </div>
          </div>

          <div className="bg-primary-50 rounded-lg p-4 space-y-3">
            <h4 className="text-body-base font-semibold text-primary-900">
              Want to learn more?
            </h4>
            <p className="text-body-sm text-primary-700">
              Our carbon calculation methodology is based on industry standards and continuously
              updated with the latest research.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" asChild>
                <a
                  href="https://docs.ecotrace.dev/methodology"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-1"
                >
                  <span>Full Documentation</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a
                  href="https://github.com/ecotrace/carbon-calculator"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-1"
                >
                  <span>View Source Code</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};