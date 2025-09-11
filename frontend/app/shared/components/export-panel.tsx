import * as React from 'react';
import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Download,
  FileText,
  Database,
  BarChart3,
  FileSpreadsheet,
  Calendar,
  Filter,
  CheckCircle,
  AlertCircle,
  Loader2,
  X,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/components/ui/card';
import { Button } from '@shared/components/ui/button';
import { Badge } from '@shared/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@shared/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/components/ui/select';
import { Separator } from '@shared/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@shared/components/ui/collapsible';
import {
  Form,
  FormField,
  FormLabel,
  FormControl,
  FormInput,
  FormError,
  FormDescription,
} from '@shared/components/ui/form';
import { toast } from '@shared/hooks/use-toast';
import {
  exportData,
  validateExportData,
  generateFilename,
  EXPORT_PRESETS,
  type ExportFormat,
  type ExportOptions,
  type ExportData,
} from '@shared/utils/export';
import { cn } from '@shared/utils/cn';
import type { CalculationResult, CalculationHistory } from '@features/carbon/types';

interface ExportPanelProps {
  calculations: CalculationResult[];
  history?: CalculationHistory[];
  className?: string;
  trigger?: React.ReactNode;
}

const FORMAT_CONFIG = {
  csv: {
    icon: FileSpreadsheet,
    label: 'CSV',
    description: 'Comma-separated values for spreadsheet applications',
    mimeType: 'text/csv',
    useCase: 'Data analysis in Excel, Google Sheets, or other spreadsheet tools',
  },
  json: {
    icon: Database,
    label: 'JSON',
    description: 'JavaScript Object Notation for programmatic access',
    mimeType: 'application/json',
    useCase: 'Integration with other applications or detailed data analysis',
  },
  xlsx: {
    icon: FileSpreadsheet,
    label: 'Excel',
    description: 'Microsoft Excel workbook with multiple sheets',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    useCase: 'Professional reports with charts and formatted tables',
  },
  pdf: {
    icon: FileText,
    label: 'PDF',
    description: 'Portable Document Format for reports and sharing',
    mimeType: 'application/pdf',
    useCase: 'Professional reports, presentations, and documentation',
  },
};

export const ExportPanel = ({ 
  calculations, 
  history, 
  className, 
  trigger 
}: ExportPanelProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('csv');
  const [customFilename, setCustomFilename] = useState('');
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [includeTimestamp, setIncludeTimestamp] = useState(true);
  const [dateRange, setDateRange] = useState<{
    start: string;
    end: string;
  }>({
    start: '',
    end: '',
  });
  const [isExporting, setIsExporting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const defaultTrigger = (
    <Button variant="outline" className="flex items-center space-x-2">
      <Download className="h-4 w-4" />
      <span>Export Data</span>
    </Button>
  );

  const validateAndPrepareData = (): ExportData | null => {
    let filteredCalculations = calculations;

    if (dateRange.start && dateRange.end) {
      const startDate = new Date(dateRange.start);
      const endDate = new Date(dateRange.end);
      
      filteredCalculations = calculations.filter(calc => {
        const calcDate = new Date(calc.timestamp);
        return calcDate >= startDate && calcDate <= endDate;
      });
    }

    const exportData: ExportData = {
      calculations: filteredCalculations,
      history: history?.filter(h => {
        if (!dateRange.start || !dateRange.end) return true;
        const startDate = new Date(dateRange.start);
        const endDate = new Date(dateRange.end);
        const historyDate = new Date(h.timestamp);
        return historyDate >= startDate && historyDate <= endDate;
      }),
      metadata: includeMetadata ? {
        exportDate: new Date(),
        totalRecords: filteredCalculations.length,
        dateRange: dateRange.start && dateRange.end ? {
          start: new Date(dateRange.start),
          end: new Date(dateRange.end),
        } : undefined,
      } : undefined,
    };

    const validation = validateExportData(exportData);
    setValidationErrors(validation.errors);

    if (!validation.isValid) {
      return null;
    }

    return exportData;
  };

  const handleExport = async (preset?: keyof typeof EXPORT_PRESETS) => {
    setIsExporting(true);
    setValidationErrors([]);

    try {
      const exportData = validateAndPrepareData();
      if (!exportData) {
        toast.error({
          title: 'Export Failed',
          description: 'Please fix the validation errors before exporting.',
        });
        return;
      }

      const options: ExportOptions = preset ? {
        ...EXPORT_PRESETS[preset],
        filename: customFilename || undefined,
      } : {
        format: selectedFormat,
        filename: customFilename || undefined,
        includeMetadata,
        includeTimestamp,
        dateRange: dateRange.start && dateRange.end ? {
          start: new Date(dateRange.start),
          end: new Date(dateRange.end),
        } : undefined,
      };

      await exportData(exportData, options);

      toast.success({
        title: 'Export Successful',
        description: `Your data has been exported as ${options.format.toUpperCase()}.`,
      });

      setIsOpen(false);
    } catch (error) {
      console.error('Export error:', error);
      toast.error({
        title: 'Export Failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred.',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const getPreviewFilename = () => {
    const prefix = customFilename || 'carbon_footprint_report';
    return generateFilename(prefix, selectedFormat, includeTimestamp);
  };

  const getDataSummary = () => {
    let filteredCount = calculations.length;
    
    if (dateRange.start && dateRange.end) {
      const startDate = new Date(dateRange.start);
      const endDate = new Date(dateRange.end);
      filteredCount = calculations.filter(calc => {
        const calcDate = new Date(calc.timestamp);
        return calcDate >= startDate && calcDate <= endDate;
      }).length;
    }

    return {
      total: calculations.length,
      filtered: filteredCount,
      hasDateFilter: Boolean(dateRange.start && dateRange.end),
    };
  };

  const summary = getDataSummary();

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild className={className}>
        {trigger || defaultTrigger}
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Download className="h-5 w-5" />
            <span>Export Carbon Footprint Data</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-h6">Export Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary-600">{summary.filtered}</p>
                  <p className="text-body-sm text-carbon-600">
                    {summary.hasDateFilter ? 'Filtered' : 'Total'} Calculations
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary-600">
                    {calculations.filter(c => c.confidence === 'high').length}
                  </p>
                  <p className="text-body-sm text-carbon-600">High Confidence</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary-600">
                    {Array.from(new Set(calculations.flatMap(c => c.dataSources.map(ds => ds.name)))).length}
                  </p>
                  <p className="text-body-sm text-carbon-600">Data Sources</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary-600">
                    {calculations.length > 0 ? 
                      (calculations.reduce((sum, c) => sum + c.carbonFootprint, 0) / calculations.length).toFixed(1) : 
                      '0'
                    }
                  </p>
                  <p className="text-body-sm text-carbon-600">Avg kg CO2e</p>
                </div>
              </div>
              
              {summary.hasDateFilter && (
                <div className="mt-4 p-3 bg-primary-50 rounded-lg">
                  <p className="text-body-sm text-primary-700">
                    <Filter className="h-4 w-4 inline mr-1" />
                    Date filter applied: {dateRange.start} to {dateRange.end}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-h6">Quick Export</CardTitle>
              <p className="text-body-sm text-carbon-600">
                Choose a preset configuration for common export needs
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(EXPORT_PRESETS).map(([key, preset]) => {
                  const FormatIcon = FORMAT_CONFIG[preset.format].icon;
                  return (
                    <Button
                      key={key}
                      variant="outline"
                      className="h-auto p-4 flex items-start space-x-3"
                      onClick={() => handleExport(key as keyof typeof EXPORT_PRESETS)}
                      disabled={isExporting}
                    >
                      <FormatIcon className="h-5 w-5 mt-0.5 flex-shrink-0" />
                      <div className="text-left">
                        <p className="font-medium capitalize">{key} Export</p>
                        <p className="text-body-sm text-carbon-600">
                          {FORMAT_CONFIG[preset.format].description}
                        </p>
                        <Badge variant="secondary" className="mt-1">
                          {preset.format.toUpperCase()}
                        </Badge>
                      </div>
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Collapsible>
            <CollapsibleTrigger asChild>
              <Card className="cursor-pointer hover:bg-carbon-50 transition-colors">
                <CardHeader>
                  <CardTitle className="text-h6 flex items-center justify-between">
                    <span>Custom Export Configuration</span>
                    <Badge variant="outline">Advanced</Badge>
                  </CardTitle>
                  <p className="text-body-sm text-carbon-600">
                    Configure detailed export options and filters
                  </p>
                </CardHeader>
              </Card>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <Card className="mt-3">
                <CardContent className="pt-6">
                  <Form>
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField>
                          <FormLabel>Export Format</FormLabel>
                          <FormControl>
                            <Select value={selectedFormat} onValueChange={(value) => setSelectedFormat(value as ExportFormat)}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(FORMAT_CONFIG).map(([format, config]) => (
                                  <SelectItem key={format} value={format}>
                                    <div className="flex items-center space-x-2">
                                      <config.icon className="h-4 w-4" />
                                      <span>{config.label}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormDescription>
                            {FORMAT_CONFIG[selectedFormat].useCase}
                          </FormDescription>
                        </FormField>

                        <FormField>
                          <FormLabel>Custom Filename (Optional)</FormLabel>
                          <FormControl>
                            <FormInput
                              value={customFilename}
                              onChange={(e) => setCustomFilename(e.target.value)}
                              placeholder="carbon_footprint_report"
                            />
                          </FormControl>
                          <FormDescription>
                            Preview: {getPreviewFilename()}
                          </FormDescription>
                        </FormField>
                      </div>

                      <div>
                        <FormLabel>Date Range Filter (Optional)</FormLabel>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                          <FormField>
                            <FormLabel>Start Date</FormLabel>
                            <FormControl>
                              <FormInput
                                type="date"
                                value={dateRange.start}
                                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                              />
                            </FormControl>
                          </FormField>
                          <FormField>
                            <FormLabel>End Date</FormLabel>
                            <FormControl>
                              <FormInput
                                type="date"
                                value={dateRange.end}
                                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                              />
                            </FormControl>
                          </FormField>
                        </div>
                      </div>

                      <div>
                        <FormLabel>Export Options</FormLabel>
                        <div className="space-y-3 mt-2">
                          <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={includeMetadata}
                              onChange={(e) => setIncludeMetadata(e.target.checked)}
                              className="rounded border-carbon-300"
                            />
                            <span className="text-body-sm">Include metadata and export information</span>
                          </label>
                          <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={includeTimestamp}
                              onChange={(e) => setIncludeTimestamp(e.target.checked)}
                              className="rounded border-carbon-300"
                            />
                            <span className="text-body-sm">Include timestamp in filename</span>
                          </label>
                        </div>
                      </div>

                      {validationErrors.length > 0 && (
                        <div className="p-4 bg-danger-50 border border-danger-200 rounded-lg">
                          <div className="flex items-start space-x-2">
                            <AlertCircle className="h-5 w-5 text-danger-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-medium text-danger-900">Validation Errors</p>
                              <ul className="mt-2 space-y-1">
                                {validationErrors.map((error, index) => (
                                  <li key={index} className="text-body-sm text-danger-700">
                                    • {error}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex justify-end">
                        <Button
                          onClick={() => handleExport()}
                          disabled={isExporting || validationErrors.length > 0}
                          className="flex items-center space-x-2"
                        >
                          {isExporting ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span>Exporting...</span>
                            </>
                          ) : (
                            <>
                              <Download className="h-4 w-4" />
                              <span>Export Data</span>
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </Form>
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </DialogContent>
    </Dialog>
  );
};