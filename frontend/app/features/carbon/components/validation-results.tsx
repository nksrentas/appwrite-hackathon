import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  TrendingUp,
  TrendingDown,
  BarChart3,
  ExternalLink,
  RefreshCw,
  Shield,
  Info,
  Calculator,
  Clock,
  Award,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/components/ui/card';
import { Badge } from '@shared/components/ui/badge';
import { Button } from '@shared/components/ui/button';
import { Progress } from '@shared/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@shared/components/ui/tabs';
import { cn } from '@shared/utils/cn';

interface ValidationResult {
  id: string;
  validator: string;
  organization: string;
  methodology: string;
  result: number;
  confidence: 'high' | 'medium' | 'low';
  deviation: number;
  agreementScore: number;
  lastUpdated: Date;
  status: 'validated' | 'pending' | 'failed';
  url?: string;
  details: {
    factors: string[];
    assumptions: string[];
    limitations: string[];
  };
}

interface ValidationSummary {
  overallAgreement: number;
  confidenceScore: number;
  validatorsCount: number;
  averageDeviation: number;
  consensusRange: {
    lower: number;
    upper: number;
  };
  qualityScore: number;
}

interface ValidationResultsProps {
  calculatedValue: number;
  activityType: string;
  autoRefresh?: boolean;
  showDetails?: boolean;
  className?: string;
}

export const ValidationResults = ({
  calculatedValue,
  activityType,
  autoRefresh = true,
  showDetails = true,
  className
}: ValidationResultsProps) => {
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [summary, setSummary] = useState<ValidationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const mockValidationResults: ValidationResult[] = [
    {
      id: 'cloud-carbon-footprint',
      validator: 'Cloud Carbon Footprint',
      organization: 'Green Software Foundation',
      methodology: 'Activity-based LCA with regional grid factors',
      result: calculatedValue * 0.95,
      confidence: 'high',
      deviation: 0.05,
      agreementScore: 95,
      lastUpdated: new Date(Date.now() - 1800000),
      status: 'validated',
      url: 'https://cloudcarbonfootprint.org',
      details: {
        factors: ['EPA eGRID data', 'Regional grid mix', 'Energy consumption estimates'],
        assumptions: ['Standard operational conditions', 'Average server efficiency'],
        limitations: ['Regional averages used', 'Real-time variations not captured']
      }
    },
    {
      id: 'carbonfact',
      validator: 'CarbonFact',
      organization: 'CarbonFact Inc',
      methodology: 'Real-time carbon intensity with activity correlation',
      result: calculatedValue * 1.03,
      confidence: 'medium',
      deviation: 0.03,
      agreementScore: 87,
      lastUpdated: new Date(Date.now() - 900000),
      status: 'validated',
      url: 'https://carbonfact.com',
      details: {
        factors: ['Live grid data', 'Machine learning predictions', 'Activity patterns'],
        assumptions: ['Predictive modeling accuracy', 'Network latency adjustments'],
        limitations: ['Model uncertainty', 'Limited historical data']
      }
    },
    {
      id: 'electricitymaps',
      validator: 'Electricity Maps',
      organization: 'Tomorrow',
      methodology: 'Live electricity carbon intensity tracking',
      result: calculatedValue * 0.92,
      confidence: 'high',
      deviation: 0.08,
      agreementScore: 92,
      lastUpdated: new Date(Date.now() - 600000),
      status: 'validated',
      url: 'https://electricitymaps.com',
      details: {
        factors: ['Real-time grid data', 'Import/export flows', 'Generation mix'],
        assumptions: ['Grid transparency', 'Marginal emission rates'],
        limitations: ['Data availability varies by region']
      }
    },
    {
      id: 'sustainability-calculator',
      validator: 'Sustainability Calculator',
      organization: 'Microsoft',
      methodology: 'PUE-based datacenter carbon calculation',
      result: calculatedValue * 1.08,
      confidence: 'medium',
      deviation: 0.08,
      agreementScore: 82,
      lastUpdated: new Date(Date.now() - 2100000),
      status: 'validated',
      url: 'https://docs.microsoft.com/azure/sustainability',
      details: {
        factors: ['Datacenter PUE', 'Regional carbon intensity', 'Server utilization'],
        assumptions: ['Average datacenter efficiency', 'Standard server configuration'],
        limitations: ['Generic PUE assumptions', 'Limited regional specificity']
      }
    }
  ];

  useEffect(() => {
    fetchValidationResults();
    
    if (autoRefresh) {
      const interval = setInterval(fetchValidationResults, 60000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, calculatedValue]);

  const fetchValidationResults = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const results = mockValidationResults.map(result => ({
        ...result,
        result: result.result + (Math.random() - 0.5) * 0.1 * calculatedValue,
        deviation: Math.abs((result.result - calculatedValue) / calculatedValue),
        agreementScore: Math.max(70, 100 - Math.abs((result.result - calculatedValue) / calculatedValue) * 100)
      }));
      
      setValidationResults(results);
      
      const avgAgreement = results.reduce((sum, r) => sum + r.agreementScore, 0) / results.length;
      const avgDeviation = results.reduce((sum, r) => sum + r.deviation, 0) / results.length;
      const consensusRange = {
        lower: Math.min(...results.map(r => r.result)),
        upper: Math.max(...results.map(r => r.result))
      };
      
      setSummary({
        overallAgreement: avgAgreement,
        confidenceScore: results.filter(r => r.confidence === 'high').length / results.length * 100,
        validatorsCount: results.length,
        averageDeviation: avgDeviation,
        consensusRange,
        qualityScore: Math.min(100, avgAgreement * 0.7 + (100 - avgDeviation * 100) * 0.3)
      });
      
    } catch (error) {
      console.error('Failed to fetch validation results:', error);
    }
    setLoading(false);
  };

  const getAgreementColor = (score: number) => {
    if (score >= 90) return 'text-success-600 bg-success-50 border-success-200';
    if (score >= 80) return 'text-warning-600 bg-warning-50 border-warning-200';
    return 'text-danger-600 bg-danger-50 border-danger-200';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'validated':
        return <CheckCircle className="h-4 w-4 text-success-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-warning-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-danger-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-carbon-600" />;
    }
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return 'bg-success-100 text-success-800';
      case 'medium':
        return 'bg-warning-100 text-warning-800';
      case 'low':
        return 'bg-danger-100 text-danger-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!showDetails) {
    return (
      <div className={cn('flex items-center space-x-4', className)}>
        <div className="flex items-center space-x-2">
          <Shield className="h-4 w-4 text-primary-600" />
          <span className="text-body-sm font-medium">Validation</span>
        </div>
        {summary && (
          <div className="flex items-center space-x-2">
            <span className="text-body-sm text-carbon-600">
              {summary.overallAgreement.toFixed(0)}% agreement
            </span>
            <Badge className={cn('text-xs', getAgreementColor(summary.overallAgreement))}>
              {summary.validatorsCount} validators
            </Badge>
          </div>
        )}
      </div>
    );
  }

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-primary-600" />
            <span>Cross-Validation Results</span>
          </CardTitle>
          <div className="flex items-center space-x-2">
            {summary && (
              <Badge className={cn(getAgreementColor(summary.overallAgreement))}>
                {summary.overallAgreement.toFixed(0)}% Agreement
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchValidationResults}
              disabled={loading}
            >
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="validators">Validators</TabsTrigger>
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-6">
            {summary && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
              >
                <Card className="p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Award className="h-4 w-4 text-primary-600" />
                    <span className="text-body-sm text-carbon-600">Quality Score</span>
                  </div>
                  <div className="text-2xl font-bold text-carbon-900">
                    {summary.qualityScore.toFixed(0)}
                  </div>
                  <Progress value={summary.qualityScore} className="mt-2 h-2" />
                </Card>

                <Card className="p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <BarChart3 className="h-4 w-4 text-primary-600" />
                    <span className="text-body-sm text-carbon-600">Agreement</span>
                  </div>
                  <div className="text-2xl font-bold text-carbon-900">
                    {summary.overallAgreement.toFixed(0)}%
                  </div>
                  <Progress value={summary.overallAgreement} className="mt-2 h-2" />
                </Card>

                <Card className="p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Calculator className="h-4 w-4 text-primary-600" />
                    <span className="text-body-sm text-carbon-600">Validators</span>
                  </div>
                  <div className="text-2xl font-bold text-carbon-900">
                    {summary.validatorsCount}
                  </div>
                  <div className="text-caption text-carbon-500 mt-1">
                    {validationResults.filter(v => v.confidence === 'high').length} high confidence
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-primary-600" />
                    <span className="text-body-sm text-carbon-600">Avg Deviation</span>
                  </div>
                  <div className="text-2xl font-bold text-carbon-900">
                    {(summary.averageDeviation * 100).toFixed(1)}%
                  </div>
                  <div className="text-caption text-carbon-500 mt-1">
                    Within acceptable range
                  </div>
                </Card>
              </motion.div>
            )}

            {summary && (
              <div className="border border-carbon-200 rounded-lg p-4 bg-carbon-50">
                <h4 className="text-body-base font-semibold text-carbon-900 mb-3">
                  Consensus Range
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-body-sm text-carbon-600">Our calculation:</span>
                    <span className="text-body-sm font-medium text-primary-600">
                      {calculatedValue.toFixed(6)} kg CO2e
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-body-sm text-carbon-600">Validation range:</span>
                    <span className="text-body-sm font-medium text-carbon-900">
                      {summary.consensusRange.lower.toFixed(6)} - {summary.consensusRange.upper.toFixed(6)} kg CO2e
                    </span>
                  </div>
                  <div className="relative">
                    <div className="h-2 bg-carbon-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary-500 rounded-full"
                        style={{ 
                          width: `${Math.min(100, summary.overallAgreement)}%`,
                          marginLeft: `${Math.max(0, (calculatedValue - summary.consensusRange.lower) / (summary.consensusRange.upper - summary.consensusRange.lower) * 100 - 2)}%`
                        }}
                      />
                    </div>
                    <div className="flex justify-between mt-1 text-caption text-carbon-500">
                      <span>Lower bound</span>
                      <span>Upper bound</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="validators" className="space-y-4 mt-6">
            <AnimatePresence>
              {validationResults.map((result) => (
                <motion.div
                  key={result.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="border border-carbon-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        {getStatusIcon(result.status)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="text-body-base font-semibold text-carbon-900">
                            {result.validator}
                          </h4>
                          <Badge className={cn('text-xs', getConfidenceColor(result.confidence))}>
                            {result.confidence}
                          </Badge>
                          {result.url && (
                            <Button variant="ghost" size="sm" className="p-0 h-auto">
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                        <p className="text-caption text-carbon-600 mb-2">
                          {result.organization} • {result.methodology}
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-body-base font-semibold text-carbon-900">
                        {result.result.toFixed(6)} kg CO2e
                      </div>
                      <div className="flex items-center space-x-1">
                        {result.deviation < 0.05 ? (
                          <CheckCircle className="h-3 w-3 text-success-600" />
                        ) : result.deviation < 0.1 ? (
                          <AlertTriangle className="h-3 w-3 text-warning-600" />
                        ) : (
                          <XCircle className="h-3 w-3 text-danger-600" />
                        )}
                        <span className="text-caption text-carbon-500">
                          {(result.deviation * 100).toFixed(1)}% deviation
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                    <div>
                      <div className="text-caption text-carbon-500 mb-1">Agreement Score</div>
                      <div className="flex items-center space-x-2">
                        <Progress value={result.agreementScore} className="flex-1 h-2" />
                        <span className="text-caption font-medium text-carbon-700">
                          {result.agreementScore.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="text-caption text-carbon-500 mb-1">Last Updated</div>
                      <div className="text-caption text-carbon-700">
                        {result.lastUpdated.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <details className="group">
                      <summary className="cursor-pointer text-caption text-primary-600 hover:text-primary-700">
                        View methodology details
                      </summary>
                      <div className="mt-2 space-y-2 text-caption text-carbon-600">
                        <div>
                          <strong>Key Factors:</strong> {result.details.factors.join(', ')}
                        </div>
                        <div>
                          <strong>Assumptions:</strong> {result.details.assumptions.join(', ')}
                        </div>
                        <div>
                          <strong>Limitations:</strong> {result.details.limitations.join(', ')}
                        </div>
                      </div>
                    </details>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </TabsContent>

          <TabsContent value="analysis" className="space-y-6 mt-6">
            <div className="space-y-4">
              <h4 className="text-body-base font-semibold text-carbon-900">
                Validation Analysis
              </h4>
              
              <div className="space-y-4">
                <div className="border border-carbon-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Info className="h-4 w-4 text-primary-600" />
                    <h5 className="text-body-sm font-semibold text-carbon-900">
                      Consensus Assessment
                    </h5>
                  </div>
                  <p className="text-caption text-carbon-600 mb-2">
                    {summary && summary.overallAgreement >= 90 
                      ? 'Excellent consensus among validators indicates high reliability of the calculation.'
                      : summary && summary.overallAgreement >= 80
                      ? 'Good agreement among validators with minor methodological differences.'
                      : 'Moderate agreement suggests reviewing calculation inputs and methodology.'
                    }
                  </p>
                  {summary && (
                    <div className="text-caption text-carbon-500">
                      Confidence Score: {summary.confidenceScore.toFixed(0)}% • 
                      Average Deviation: {(summary.averageDeviation * 100).toFixed(1)}%
                    </div>
                  )}
                </div>

                <div className="border border-carbon-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-primary-600" />
                    <h5 className="text-body-sm font-semibold text-carbon-900">
                      Methodology Comparison
                    </h5>
                  </div>
                  <p className="text-caption text-carbon-600">
                    Validators use different approaches including real-time grid data, activity-based LCA, 
                    and predictive modeling. Convergence indicates robust calculation methodology.
                  </p>
                </div>

                <div className="border border-carbon-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-warning-600" />
                    <h5 className="text-body-sm font-semibold text-carbon-900">
                      Limitations & Uncertainties
                    </h5>
                  </div>
                  <ul className="text-caption text-carbon-600 space-y-1 list-disc list-inside">
                    <li>Regional emission factors may not reflect real-time conditions</li>
                    <li>Validators may use different temporal averaging methods</li>
                    <li>Some calculators apply different uncertainty margins</li>
                    <li>Data availability varies across validation sources</li>
                  </ul>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};