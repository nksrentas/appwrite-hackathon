import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Calculator, 
  Database, 
  TrendingUp, 
  Info, 
  ExternalLink, 
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  Clock,
  Globe,
  BookOpen,
  FileText
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@shared/components/ui/dialog';
import { Button } from '@shared/components/ui/button';
import { Badge } from '@shared/components/ui/badge';
import { Separator } from '@shared/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@shared/components/ui/tabs';
import { cn } from '@shared/utils/cn';
import type { MethodologyModalProps, ConfidenceLevel } from '@features/carbon/types';

export const MethodologyModal = ({
  trigger,
  calculationResult,
  className,
  onClose
}: MethodologyModalProps) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [detailLevel, setDetailLevel] = useState<'basic' | 'advanced' | 'expert'>('advanced');

  const defaultTrigger = (
    <Button 
      variant="ghost" 
      size="sm" 
      className="text-carbon-500 hover:text-carbon-700 p-0 h-auto"
      aria-label="View calculation methodology"
    >
      <Info className="h-4 w-4 mr-1" />
      How is this calculated?
    </Button>
  );

  const getConfidenceColor = (confidence: ConfidenceLevel) => {
    switch (confidence) {
      case 'high':
        return 'text-success-600 bg-success-50 border-success-200';
      case 'medium':
        return 'text-warning-600 bg-warning-50 border-warning-200';
      case 'low':
        return 'text-danger-600 bg-danger-50 border-danger-200';
      default:
        return 'text-carbon-600 bg-carbon-50 border-carbon-200';
    }
  };

  const getDataSourceIcon = (type: string) => {
    switch (type) {
      case 'government':
        return <Globe className="h-4 w-4 text-primary-600" />;
      case 'academic':
        return <BookOpen className="h-4 w-4 text-primary-600" />;
      case 'commercial':
        return <TrendingUp className="h-4 w-4 text-primary-600" />;
      default:
        return <Database className="h-4 w-4 text-primary-600" />;
    }
  };

  return (
    <Dialog onOpenChange={(open) => !open && onClose?.()}>
      <DialogTrigger asChild className={className}>
        {trigger || defaultTrigger}
      </DialogTrigger>
      
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center space-x-2 text-carbon-900">
            <Calculator className="h-5 w-5" />
            <span>Scientific Carbon Calculation Methodology</span>
            <Badge 
              className={cn('ml-auto', getConfidenceColor(calculationResult.confidence))}
              role="status"
              aria-label={`Calculation confidence: ${calculationResult.confidence}`}
            >
              {calculationResult.confidence} confidence ({calculationResult.uncertainty}% uncertainty)
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-5 flex-shrink-0">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="calculation">Calculation</TabsTrigger>
              <TabsTrigger value="sources">Data Sources</TabsTrigger>
              <TabsTrigger value="validation">Validation</TabsTrigger>
              <TabsTrigger value="documentation">Technical Docs</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto mt-4">
              <TabsContent value="overview" className="space-y-6 m-0">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Current Calculation Summary</CardTitle>
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-carbon-400" />
                        <span className="text-caption text-carbon-500">
                          {calculationResult.timestamp.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <p className="text-body-sm text-carbon-500 mb-1">Carbon Footprint</p>
                        <p className="metric-display text-carbon-900">
                          {calculationResult.carbonFootprint.toFixed(3)} {calculationResult.unit}
                        </p>
                        {calculationResult.uncertaintyBounds && (
                          <p className="text-caption text-carbon-500 mt-1">
                            Range: {calculationResult.uncertaintyBounds.lower.toFixed(3)} - {calculationResult.uncertaintyBounds.upper.toFixed(3)} {calculationResult.unit}
                          </p>
                        )}
                      </div>
                      <div>
                        <p className="text-body-sm text-carbon-500 mb-1">Methodology</p>
                        <p className="text-body-base font-medium text-carbon-700 mb-2">
                          {calculationResult.methodology.approach}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {calculationResult.methodology.standards.map((standard) => (
                            <Badge key={standard} variant="outline" className="text-xs">
                              {standard}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-body-sm text-carbon-500 mb-1">Quality Assessment</p>
                        <div className="flex items-center space-x-2 mb-2">
                          {calculationResult.confidence === 'high' ? (
                            <CheckCircle className="h-4 w-4 text-success-600" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-warning-600" />
                          )}
                          <span className="text-body-base text-carbon-700">
                            {calculationResult.dataSources.length} authoritative sources
                          </span>
                        </div>
                        {calculationResult.methodology.peerReviewed && (
                          <Badge variant="outline" className="text-xs text-success-600 border-success-200">
                            Peer Reviewed
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-h6">Key Principles</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-start space-x-3">
                        <CheckCircle className="h-5 w-5 text-success-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-body-base font-medium text-carbon-900">Scientific Rigor</p>
                          <p className="text-body-sm text-carbon-600">
                            All emission factors sourced from authoritative government and peer-reviewed databases
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <CheckCircle className="h-5 w-5 text-success-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-body-base font-medium text-carbon-900">Conservative Approach</p>
                          <p className="text-body-sm text-carbon-600">
                            {calculationResult.methodology.conservativeBias || 
                             'Upper-bound estimates to prevent underreporting environmental impact'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <CheckCircle className="h-5 w-5 text-success-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-body-base font-medium text-carbon-900">Complete Transparency</p>
                          <p className="text-body-sm text-carbon-600">
                            All calculations, assumptions, and data sources publicly documented
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-h6">Limitations & Uncertainty</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {calculationResult.limitations.slice(0, 3).map((limitation, index) => (
                          <div key={index} className="flex items-start space-x-2">
                            <AlertTriangle className="h-4 w-4 text-warning-500 mt-0.5 flex-shrink-0" />
                            <p className="text-body-sm text-carbon-600">{limitation}</p>
                          </div>
                        ))}
                        {calculationResult.limitations.length > 3 && (
                          <p className="text-caption text-carbon-500 italic">
                            +{calculationResult.limitations.length - 3} more limitations (see Technical Docs)
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="calculation" className="space-y-6 m-0">
                <div className="flex justify-between items-center">
                  <h3 className="text-h5 font-semibold text-carbon-900">Calculation Steps</h3>
                  <div className="flex items-center space-x-2">
                    <label htmlFor="detail-level" className="text-body-sm text-carbon-600">
                      Detail Level:
                    </label>
                    <select 
                      id="detail-level"
                      value={detailLevel} 
                      onChange={(e) => setDetailLevel(e.target.value as any)}
                      className="border border-carbon-200 rounded px-2 py-1 text-body-sm"
                    >
                      <option value="basic">Basic</option>
                      <option value="advanced">Advanced</option>
                      <option value="expert">Expert</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  {calculationResult.calculationSteps.map((step, index) => (
                    <motion.div
                      key={step.stepNumber}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="border border-carbon-200 rounded-lg p-4 hover:border-primary-300 transition-colors"
                    >
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                            <span className="text-body-sm font-semibold text-primary-700">
                              {step.stepNumber}
                            </span>
                          </div>
                        </div>
                        <div className="flex-1 space-y-3">
                          <h4 className="text-body-base font-semibold text-carbon-900">
                            {step.description}
                          </h4>
                          
                          <div className="bg-carbon-50 rounded-lg p-3">
                            <p className="text-body-sm text-carbon-700 mb-2">Formula:</p>
                            <code className="text-body-sm font-mono text-carbon-900 bg-white px-2 py-1 rounded border">
                              {step.formula}
                            </code>
                            {step.calculation && (
                              <>
                                <p className="text-body-sm text-carbon-700 mt-2 mb-1">Calculation:</p>
                                <code className="text-body-sm font-mono text-carbon-900 bg-white px-2 py-1 rounded border">
                                  {step.calculation}
                                </code>
                              </>
                            )}
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span className="text-body-sm text-carbon-600">Result:</span>
                              <span className="text-body-base font-semibold text-carbon-900">
                                {step.result.toFixed(6)} {step.unit}
                              </span>
                            </div>
                          </div>

                          {detailLevel !== 'basic' && step.assumptions && step.assumptions.length > 0 && (
                            <div className="pt-3 border-t border-carbon-100">
                              <p className="text-body-sm font-medium text-carbon-700 mb-2">Assumptions:</p>
                              <div className="space-y-2">
                                {step.assumptions.map((assumption, assumptionIndex) => (
                                  <div key={assumptionIndex} className="text-body-sm text-carbon-600">
                                    <span className="font-medium">{assumption.parameter}:</span> {assumption.rationale}
                                    {assumption.uncertainty && (
                                      <span className="text-warning-600 ml-2">
                                        (±{assumption.uncertainty}%)
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="sources" className="space-y-6 m-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {calculationResult.dataSources.map((source, index) => (
                    <Card key={index} className="relative">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            {getDataSourceIcon(source.type)}
                            <CardTitle className="text-body-base">{source.name}</CardTitle>
                          </div>
                          <Badge className={getConfidenceColor(source.reliability)}>
                            {source.reliability}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <p className="text-body-sm text-carbon-500">Authority</p>
                          <p className="text-body-sm text-carbon-900">{source.authority}</p>
                        </div>
                        <div>
                          <p className="text-body-sm text-carbon-500">Last Updated</p>
                          <div className="flex items-center space-x-2">
                            <Clock className="h-3 w-3 text-carbon-400" />
                            <p className="text-body-sm text-carbon-900">
                              {source.lastUpdated.toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        {source.peerReviewed && (
                          <Badge variant="outline" className="text-xs text-success-600 border-success-200">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Peer Reviewed
                          </Badge>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          className="w-full"
                        >
                          <a
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center space-x-1"
                          >
                            <span>View Source</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="validation" className="space-y-6 m-0">
                {calculationResult.validationResults && calculationResult.validationResults.length > 0 ? (
                  <div className="space-y-4">
                    <h3 className="text-h5 font-semibold text-carbon-900">Cross-Validation Results</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {calculationResult.validationResults.map((validation, index) => (
                        <Card key={index}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-body-base font-medium text-carbon-900">
                                {validation.validator}
                              </h4>
                              <Badge className={getConfidenceColor(validation.confidence)}>
                                {validation.confidence}
                              </Badge>
                            </div>
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span className="text-body-sm text-carbon-600">Their Result:</span>
                                <span className="text-body-sm text-carbon-900">
                                  {validation.result.toFixed(3)} {calculationResult.unit}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-body-sm text-carbon-600">Our Result:</span>
                                <span className="text-body-sm text-carbon-900">
                                  {calculationResult.carbonFootprint.toFixed(3)} {calculationResult.unit}
                                </span>
                              </div>
                              {validation.deviation !== undefined && (
                                <div className="flex justify-between">
                                  <span className="text-body-sm text-carbon-600">Deviation:</span>
                                  <span className={cn(
                                    "text-body-sm font-medium",
                                    validation.deviation < 0.1 ? "text-success-600" :
                                    validation.deviation < 0.2 ? "text-warning-600" : "text-danger-600"
                                  )}>
                                    {(validation.deviation * 100).toFixed(1)}%
                                  </span>
                                </div>
                              )}
                            </div>
                            <p className="text-caption text-carbon-500 mt-2">
                              {validation.methodology}
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <AlertTriangle className="h-12 w-12 text-warning-400 mx-auto mb-3" />
                    <h3 className="text-h6 font-medium text-carbon-700 mb-2">No Validation Data Available</h3>
                    <p className="text-body-sm text-carbon-500">
                      External validation results are not currently available for this calculation.
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="documentation" className="space-y-6 m-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <FileText className="h-5 w-5" />
                        <span>References</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {calculationResult.methodology.references.map((ref, index) => (
                        <div key={index} className="border-l-2 border-primary-200 pl-4">
                          <p className="text-body-sm font-medium text-carbon-900">{ref.title}</p>
                          <p className="text-body-sm text-carbon-600">
                            {ref.authors.join(', ')} ({ref.year})
                          </p>
                          <p className="text-caption text-carbon-500">{ref.publication}</p>
                          {ref.doi && (
                            <a 
                              href={`https://doi.org/${ref.doi}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-caption text-primary-600 hover:text-primary-700"
                            >
                              DOI: {ref.doi}
                            </a>
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Technical Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-body-sm text-carbon-600">Version</span>
                        <Badge variant="secondary">{calculationResult.version}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-body-sm text-carbon-600">Standards Compliance</span>
                        <div className="flex flex-wrap gap-1">
                          {(calculationResult.methodology.standards || []).map((standard: string) => (
                            <Badge key={standard} variant="outline" className="text-xs">
                              {standard}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-body-sm text-carbon-600">Calculation Time</span>
                        <span className="text-body-sm text-carbon-900">
                          {calculationResult.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      {calculationResult.auditTrail && (
                        <div className="pt-3 border-t border-carbon-100">
                          <span className="text-body-sm text-carbon-600 mb-2 block">Recent Changes</span>
                          <div className="space-y-2">
                            {calculationResult.auditTrail.slice(0, 3).map((entry, index) => (
                              <div key={index} className="text-caption text-carbon-500">
                                {entry.timestamp.toLocaleDateString()}: {entry.action}
                                {entry.changes && entry.changes.length > 0 && (
                                  <span className="ml-1">({entry.changes[0]})</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};