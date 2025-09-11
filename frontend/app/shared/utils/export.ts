import { format } from 'date-fns';
import type { CalculationResult, CalculationHistory } from '@features/carbon/types';

export type ExportFormat = 'csv' | 'json' | 'pdf' | 'xlsx';

export interface ExportOptions {
  format: ExportFormat;
  filename?: string;
  includeMetadata?: boolean;
  includeTimestamp?: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface ExportData {
  calculations: CalculationResult[];
  history?: CalculationHistory[];
  metadata?: {
    exportDate: Date;
    exportedBy?: string;
    totalRecords: number;
    dateRange?: {
      start: Date;
      end: Date;
    };
  };
}

export function generateCSV(data: ExportData): string {
  const headers = [
    'Date',
    'Activity Type',
    'Carbon Footprint (kg CO2e)',
    'Unit',
    'Confidence Level',
    'Uncertainty (%)',
    'Data Sources',
    'Methodology',
    'Location',
    'Description',
  ];

  const rows = data.calculations.map(calc => [
    format(calc.timestamp, 'yyyy-MM-dd HH:mm:ss'),
    calc.methodology.approach || 'N/A',
    calc.carbonFootprint.toFixed(3),
    calc.unit,
    calc.confidence,
    calc.uncertainty.toFixed(1),
    calc.dataSources.map(ds => ds.name).join('; '),
    calc.methodology.standards.join('; '),
    '', // Location would need to be passed from calculation request
    calc.limitations.slice(0, 2).join('; ') || 'N/A',
  ]);

  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');

  return csvContent;
}

export function generateJSON(data: ExportData, pretty: boolean = true): string {
  const exportObject = {
    ...data,
    metadata: {
      ...data.metadata,
      exportDate: data.metadata?.exportDate?.toISOString(),
      dateRange: data.metadata?.dateRange ? {
        start: data.metadata.dateRange.start.toISOString(),
        end: data.metadata.dateRange.end.toISOString(),
      } : undefined,
    },
    calculations: data.calculations.map(calc => ({
      ...calc,
      timestamp: calc.timestamp.toISOString(),
      dataSources: calc.dataSources.map(ds => ({
        ...ds,
        lastUpdated: ds.lastUpdated.toISOString(),
      })),
      auditTrail: calc.auditTrail?.map(entry => ({
        ...entry,
        timestamp: entry.timestamp.toISOString(),
      })),
    })),
  };

  return pretty ? JSON.stringify(exportObject, null, 2) : JSON.stringify(exportObject);
}

export function generateXLSXData(data: ExportData) {
  return {
    summary: {
      sheetName: 'Summary',
      data: [
        ['Export Summary'],
        ['Export Date', data.metadata?.exportDate ? format(data.metadata.exportDate, 'yyyy-MM-dd HH:mm:ss') : ''],
        ['Total Calculations', data.calculations.length],
        ['Date Range', data.metadata?.dateRange ? 
          `${format(data.metadata.dateRange.start, 'yyyy-MM-dd')} to ${format(data.metadata.dateRange.end, 'yyyy-MM-dd')}` : 
          'All time'
        ],
        ['Average Carbon Footprint', data.calculations.length > 0 ? 
          (data.calculations.reduce((sum, calc) => sum + calc.carbonFootprint, 0) / data.calculations.length).toFixed(3) + ' kg CO2e' : 
          'N/A'
        ],
        [],
        ['Confidence Distribution'],
        ['High Confidence', data.calculations.filter(c => c.confidence === 'high').length],
        ['Medium Confidence', data.calculations.filter(c => c.confidence === 'medium').length],
        ['Low Confidence', data.calculations.filter(c => c.confidence === 'low').length],
      ],
    },
    calculations: {
      sheetName: 'Calculations',
      headers: [
        'Date',
        'Carbon Footprint (kg CO2e)',
        'Unit',
        'Confidence',
        'Uncertainty (%)',
        'Methodology',
        'Standards',
        'Primary Data Source',
        'Version',
      ],
      data: data.calculations.map(calc => [
        format(calc.timestamp, 'yyyy-MM-dd HH:mm:ss'),
        calc.carbonFootprint,
        calc.unit,
        calc.confidence,
        calc.uncertainty,
        calc.methodology.approach,
        calc.methodology.standards.join(', '),
        calc.dataSources[0]?.name || 'N/A',
        calc.version,
      ]),
    },
    dataSources: {
      sheetName: 'Data Sources',
      headers: [
        'Name',
        'Authority',
        'Type',
        'Reliability',
        'Last Updated',
        'Peer Reviewed',
        'URL',
      ],
      data: Array.from(
        new Map(
          data.calculations
            .flatMap(calc => calc.dataSources)
            .map(ds => [ds.name, ds])
        ).values()
      ).map(ds => [
        ds.name,
        ds.authority,
        ds.type,
        ds.reliability,
        format(ds.lastUpdated, 'yyyy-MM-dd'),
        ds.peerReviewed ? 'Yes' : 'No',
        ds.url,
      ]),
    },
  };
}

export function downloadFile(content: string | Blob, filename: string, mimeType: string) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function generateFilename(
  prefix: string,
  format: ExportFormat,
  includeTimestamp: boolean = true
): string {
  const timestamp = includeTimestamp ? `_${format(new Date(), 'yyyyMMdd_HHmmss')}` : '';
  return `${prefix}${timestamp}.${format}`;
}

export async function exportData(
  data: ExportData,
  options: ExportOptions
): Promise<void> {
  const {
    format,
    filename,
    includeMetadata = true,
    includeTimestamp = true,
  } = options;

  if (includeMetadata && !data.metadata) {
    data.metadata = {
      exportDate: new Date(),
      totalRecords: data.calculations.length,
      dateRange: options.dateRange,
    };
  }

  const defaultFilename = generateFilename('carbon_footprint_report', format, includeTimestamp);
  const finalFilename = filename || defaultFilename;

  try {
    switch (format) {
      case 'csv': {
        const csvContent = generateCSV(data);
        downloadFile(csvContent, finalFilename, 'text/csv');
        break;
      }
      
      case 'json': {
        const jsonContent = generateJSON(data, true);
        downloadFile(jsonContent, finalFilename, 'application/json');
        break;
      }
      
      case 'xlsx': {
        console.warn('XLSX export requires additional library integration');
        const csvContent = generateCSV(data);
        downloadFile(csvContent, finalFilename.replace('.xlsx', '.csv'), 'text/csv');
        break;
      }
      
      case 'pdf': {
        console.warn('PDF export requires additional library integration');
        const textContent = generateReportText(data);
        downloadFile(textContent, finalFilename.replace('.pdf', '.txt'), 'text/plain');
        break;
      }
      
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  } catch (error) {
    console.error('Export failed:', error);
    throw new Error(`Failed to export data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function generateReportText(data: ExportData): string {
  const lines = [
    'CARBON FOOTPRINT REPORT',
    '=' .repeat(50),
    '',
    `Export Date: ${data.metadata?.exportDate ? format(data.metadata.exportDate, 'yyyy-MM-dd HH:mm:ss') : 'N/A'}`,
    `Total Calculations: ${data.calculations.length}`,
    '',
    'SUMMARY STATISTICS',
    '-'.repeat(30),
  ];

  if (data.calculations.length > 0) {
    const totalFootprint = data.calculations.reduce((sum, calc) => sum + calc.carbonFootprint, 0);
    const avgFootprint = totalFootprint / data.calculations.length;
    const highConfidence = data.calculations.filter(c => c.confidence === 'high').length;
    const mediumConfidence = data.calculations.filter(c => c.confidence === 'medium').length;
    const lowConfidence = data.calculations.filter(c => c.confidence === 'low').length;

    lines.push(
      `Total Carbon Footprint: ${totalFootprint.toFixed(3)} kg CO2e`,
      `Average per Calculation: ${avgFootprint.toFixed(3)} kg CO2e`,
      '',
      'Confidence Distribution:',
      `  High: ${highConfidence} (${((highConfidence / data.calculations.length) * 100).toFixed(1)}%)`,
      `  Medium: ${mediumConfidence} (${((mediumConfidence / data.calculations.length) * 100).toFixed(1)}%)`,
      `  Low: ${lowConfidence} (${((lowConfidence / data.calculations.length) * 100).toFixed(1)}%)`,
      '',
      'DETAILED CALCULATIONS',
      '-'.repeat(30),
    );

    data.calculations.forEach((calc, index) => {
      lines.push(
        '',
        `${index + 1}. ${format(calc.timestamp, 'yyyy-MM-dd HH:mm:ss')}`,
        `   Carbon Footprint: ${calc.carbonFootprint.toFixed(3)} ${calc.unit}`,
        `   Confidence: ${calc.confidence} (${calc.uncertainty.toFixed(1)}% uncertainty)`,
        `   Methodology: ${calc.methodology.approach}`,
        `   Standards: ${calc.methodology.standards.join(', ')}`,
        `   Data Sources: ${calc.dataSources.map(ds => ds.name).join(', ')}`,
      );
    });
  }

  return lines.join('\n');
}

export function validateExportData(data: ExportData): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.calculations || !Array.isArray(data.calculations)) {
    errors.push('Calculations data is required and must be an array');
  }

  if (data.calculations && data.calculations.length === 0) {
    errors.push('No calculation data available for export');
  }

  data.calculations?.forEach((calc, index) => {
    if (typeof calc.carbonFootprint !== 'number' || isNaN(calc.carbonFootprint)) {
      errors.push(`Invalid carbon footprint value at calculation ${index + 1}`);
    }
    if (!calc.timestamp || !(calc.timestamp instanceof Date)) {
      errors.push(`Invalid timestamp at calculation ${index + 1}`);
    }
    if (!calc.unit || typeof calc.unit !== 'string') {
      errors.push(`Invalid unit at calculation ${index + 1}`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export const EXPORT_PRESETS = {
  summary: {
    format: 'csv' as ExportFormat,
    includeMetadata: true,
    includeTimestamp: true,
  },
  detailed: {
    format: 'json' as ExportFormat,
    includeMetadata: true,
    includeTimestamp: true,
  },
  analysis: {
    format: 'xlsx' as ExportFormat,
    includeMetadata: true,
    includeTimestamp: true,
  },
  report: {
    format: 'pdf' as ExportFormat,
    includeMetadata: true,
    includeTimestamp: true,
  },
} as const;