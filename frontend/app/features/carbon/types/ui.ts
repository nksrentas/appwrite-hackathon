import type { CalculationResult, DataSource, ConfidenceLevel, DataQuality } from './calculation';

export interface MethodologyModalProps {
  trigger?: React.ReactNode;
  calculationResult: CalculationResult;
  className?: string;
  onClose?: () => void;
}

export interface CalculationBreakdownProps {
  calculationResult: CalculationResult;
  detailLevel: 'basic' | 'advanced' | 'expert';
  showAlternatives?: boolean;
  className?: string;
}

export interface DataSourcesPanelProps {
  dataSources: DataSource[];
  showQuality?: boolean;
  className?: string;
}

export interface ConfidenceIndicatorProps {
  confidence: ConfidenceLevel;
  uncertainty?: number;
  score?: number;
  interactive?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  className?: string;
}

export interface UncertaintyBoundsProps {
  value: number;
  bounds: {
    lower: number;
    upper: number;
    confidence: number;
  };
  unit: string;
  visualization?: 'bar' | 'range' | 'distribution';
  className?: string;
}

export interface DataFreshnessProps {
  lastUpdated: Date;
  maxAge: number;
  status: 'fresh' | 'stale' | 'expired';
  showDetails?: boolean;
  className?: string;
}

export interface QualityMetricsProps {
  quality: DataQuality;
  compact?: boolean;
  interactive?: boolean;
  className?: string;
}

export interface SourceValidationProps {
  sources: DataSource[];
  validationStatus: ValidationStatus[];
  showConflicts?: boolean;
  className?: string;
}

export interface ValidationStatus {
  sourceId: string;
  status: 'validated' | 'pending' | 'failed';
  lastValidated?: Date;
  issues?: string[];
}

export interface HistoricalContextProps {
  currentValue: number;
  historicalValues: HistoricalDataPoint[];
  period: 'day' | 'week' | 'month' | 'year';
  showTrend?: boolean;
  className?: string;
}

export interface HistoricalDataPoint {
  timestamp: Date;
  value: number;
  confidence: ConfidenceLevel;
}

export interface ConservativeEstimationProps {
  baseEstimate: number;
  conservativeFactor: number;
  finalEstimate: number;
  unit: string;
  rationale: string;
  className?: string;
}

export interface AuditTrailProps {
  entries: AuditTrailEntry[];
  maxEntries?: number;
  showFilters?: boolean;
  className?: string;
}

export interface AuditTrailEntry {
  id: string;
  timestamp: Date;
  action: string;
  user?: string;
  changes: string[];
  version: string;
  automated: boolean;
}

export interface VersionTrackingProps {
  currentVersion: string;
  versions: VersionInfo[];
  showChangelog?: boolean;
  className?: string;
}

export interface VersionInfo {
  version: string;
  date: Date;
  changes: string[];
  breaking: boolean;
  deprecated?: string[];
}

export interface ExternalValidationProps {
  validationResults: ExternalValidationResult[];
  threshold?: number;
  className?: string;
}

export interface ExternalValidationResult {
  validator: string;
  result: number;
  deviation: number;
  status: 'pass' | 'warning' | 'fail';
  methodology: string;
}

export interface TechnicalDocumentationProps {
  documentation: TechnicalDocumentation;
  searchable?: boolean;
  downloadable?: boolean;
  className?: string;
}

export interface TechnicalDocumentation {
  sections: DocumentationSection[];
  version: string;
  lastUpdated: Date;
}

export interface DocumentationSection {
  id: string;
  title: string;
  content: string;
  subsections?: DocumentationSection[];
  formulas?: FormulaBlock[];
  codeExamples?: CodeExample[];
}

export interface FormulaBlock {
  id: string;
  latex?: string;
  mathml?: string;
  description: string;
  variables: FormulaVariable[];
}

export interface FormulaVariable {
  symbol: string;
  description: string;
  unit?: string;
  example?: number;
}

export interface CodeExample {
  language: string;
  code: string;
  description: string;
  runnable?: boolean;
}

export interface OpenSourceFormulasProps {
  formulas: OpenSourceFormula[];
  repository?: string;
  license: string;
  className?: string;
}

export interface OpenSourceFormula {
  name: string;
  description: string;
  formula: string;
  implementation: string;
  tests: FormulaTest[];
  documentation: string;
}

export interface FormulaTest {
  name: string;
  input: Record<string, number>;
  expectedOutput: number;
  tolerance?: number;
}

export interface LimitationsCommunicationProps {
  limitations: Limitation[];
  severity?: 'info' | 'warning' | 'critical';
  expandable?: boolean;
  className?: string;
}

export interface Limitation {
  category: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  mitigation?: string;
  examples?: string[];
}

export interface QualityAssuranceProps {
  validationResults: ValidationSummary;
  crossValidation: CrossValidationResults;
  physicalConstraints: ConstraintValidation[];
  className?: string;
}

export interface ValidationSummary {
  totalTests: number;
  passed: number;
  failed: number;
  warnings: number;
  lastRun: Date;
}

export interface CrossValidationResults {
  external: ExternalValidationResult[];
  benchmarks: BenchmarkResult[];
  agreement: number;
}

export interface BenchmarkResult {
  name: string;
  ourResult: number;
  benchmarkResult: number;
  deviation: number;
  status: 'pass' | 'fail';
}

export interface ConstraintValidation {
  constraint: string;
  value: number;
  min: number;
  max: number;
  status: 'valid' | 'warning' | 'violation';
}

export interface CalculationExplorerProps {
  calculationResult: CalculationResult;
  interactive?: boolean;
  defaultLevel?: 'basic' | 'advanced' | 'expert';
  className?: string;
}

export interface InteractiveStepProps {
  step: CalculationStep;
  stepNumber: number;
  isActive: boolean;
  level: 'basic' | 'advanced' | 'expert';
  onClick: () => void;
  className?: string;
}

export type ThemeMode = 'light' | 'dark' | 'system';

export interface AccessibilityOptions {
  reduceMotion: boolean;
  highContrast: boolean;
  fontSize: 'small' | 'medium' | 'large';
  screenReader: boolean;
}

export interface ChartDataPoint {
  label: string;
  value: number;
  confidence?: ConfidenceLevel;
  metadata?: Record<string, unknown>;
}

export interface ChartConfiguration {
  type: 'bar' | 'line' | 'pie' | 'scatter' | 'heatmap';
  data: ChartDataPoint[];
  options: ChartOptions;
}

export interface ChartOptions {
  responsive: boolean;
  accessibility: boolean;
  colorScheme: 'primary' | 'carbon' | 'confidence';
  showLegend: boolean;
  showTooltips: boolean;
  animations: boolean;
}