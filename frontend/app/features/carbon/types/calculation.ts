export type ConfidenceLevel = 'high' | 'medium' | 'low';

export type ActivityType = 
  | 'github-actions'
  | 'cloud-compute'
  | 'local-development'
  | 'ci-cd-pipeline'
  | 'deployment'
  | 'generic';

export type DataSourceType = 'government' | 'academic' | 'commercial' | 'open-source';

export interface Coordinates {
  lat: number;
  lon: number;
}

export interface GeographicLocation {
  country: string;
  region?: string;
  postalCode?: string;
  coordinates?: Coordinates;
}

export interface DataSource {
  name: string;
  authority: string;
  url: string;
  lastUpdated: Date;
  type: DataSourceType;
  reliability: ConfidenceLevel;
  peerReviewed?: boolean;
  establishedDate?: Date;
}

export interface EmissionFactor {
  type: string;
  value: number;
  unit: string;
  source: DataSource;
  confidence: ConfidenceLevel;
  geographic: 'global' | 'regional' | 'grid-specific';
  temporal?: {
    validFrom: Date;
    validTo?: Date;
  };
}

export interface CalculationStep {
  stepNumber: number;
  description: string;
  formula: string;
  calculation?: string;
  result: number;
  unit: string;
  variables?: Variable[];
  assumptions?: Assumption[];
}

export interface Variable {
  symbol: string;
  definition: string;
  unit: string;
  value?: number;
}

export interface Assumption {
  parameter: string;
  value: number | string;
  unit?: string;
  source: string;
  rationale: string;
  uncertainty?: number;
}

export interface ValidationResult {
  validator: string;
  result: number;
  confidence: ConfidenceLevel;
  methodology: string;
  deviation?: number;
}

export interface UncertaintyBounds {
  lower: number;
  upper: number;
  confidence: number;
  method: 'statistical' | 'expert-judgment' | 'monte-carlo';
}

export interface CalculationResult {
  carbonFootprint: number;
  unit: string;
  confidence: ConfidenceLevel;
  uncertainty: number;
  uncertaintyBounds?: UncertaintyBounds;
  methodology: MethodologyExplanation;
  calculationSteps: CalculationStep[];
  dataSources: DataSource[];
  assumptions: Assumption[];
  limitations: string[];
  validationResults?: ValidationResult[];
  timestamp: Date;
  version: string;
  auditTrail?: AuditEntry[];
}

export interface MethodologyExplanation {
  overview: string;
  approach: string;
  conservativeBias?: string;
  peerReviewed: boolean;
  standards: string[];
  references: Reference[];
}

export interface Reference {
  title: string;
  authors: string[];
  publication: string;
  year: number;
  doi?: string;
  url?: string;
}

export interface AuditEntry {
  timestamp: Date;
  action: 'calculation' | 'methodology-update' | 'data-refresh' | 'validation';
  version: string;
  changes?: string[];
  user?: string;
  automated: boolean;
}

export interface CalculationRequest {
  activityType: ActivityType;
  metadata: Record<string, unknown>;
  location: GeographicLocation;
  timestamp: Date;
  userPreferences?: {
    conservativeApproach?: boolean;
    uncertaintyDisplay?: boolean;
    detailLevel?: 'basic' | 'advanced' | 'expert';
  };
}

export interface ConfidenceAssessment {
  level: ConfidenceLevel;
  uncertainty: number;
  score: number;
  factors: string[];
  breakdown: ConfidenceMetric[];
}

export interface ConfidenceMetric {
  name: string;
  weight: number;
  score: number;
  description: string;
  improvementSuggestions?: string[];
}

export interface DataQuality {
  freshness: {
    score: number;
    lastUpdate: Date;
    staleness: number;
  };
  completeness: {
    score: number;
    missingFields: string[];
  };
  accuracy: {
    score: number;
    validationErrors: string[];
  };
  consistency: {
    score: number;
    conflicts: DataConflict[];
  };
}

export interface DataConflict {
  source1: string;
  source2: string;
  parameter: string;
  value1: number;
  value2: number;
  deviation: number;
  resolution?: 'use-primary' | 'average' | 'conservative' | 'manual';
}

export interface CalculationHistory {
  id: string;
  request: CalculationRequest;
  result: CalculationResult;
  timestamp: Date;
  version: string;
  changes?: CalculationChange[];
}

export interface CalculationChange {
  parameter: string;
  oldValue: unknown;
  newValue: unknown;
  reason: string;
  impact: number;
}

export interface TechnicalDocumentation {
  methodology: {
    summary: string;
    detailedSteps: DetailedStep[];
    formulas: FormulaDocumentation[];
    assumptions: AssumptionDocumentation[];
  };
  dataSources: DataSourceDocumentation[];
  validation: ValidationDocumentation;
  limitations: LimitationDocumentation[];
  changelog: ChangelogEntry[];
}

export interface DetailedStep {
  number: number;
  title: string;
  explanation: string;
  formula?: FormulaDocumentation;
  rationale: string;
  alternatives?: string[];
}

export interface FormulaDocumentation {
  id: string;
  name: string;
  description: string;
  latex?: string;
  mathml?: string;
  plainText: string;
  variables: Variable[];
  examples: FormulaExample[];
}

export interface FormulaExample {
  scenario: string;
  inputs: Record<string, number>;
  calculation: string;
  result: number;
  unit: string;
}

export interface AssumptionDocumentation {
  category: string;
  assumptions: Assumption[];
  sensitivity: SensitivityAnalysis[];
}

export interface SensitivityAnalysis {
  parameter: string;
  baseValue: number;
  variations: {
    change: number;
    impact: number;
  }[];
}

export interface DataSourceDocumentation {
  source: DataSource;
  usage: string;
  updateSchedule: string;
  accessMethod: string;
  qualityAssessment: DataQuality;
  alternatives?: DataSource[];
}

export interface ValidationDocumentation {
  methods: string[];
  crossValidation: {
    external: ExternalValidator[];
    benchmarks: BenchmarkDataset[];
  };
  physicalConstraints: PhysicalConstraint[];
  accuracy: AccuracyMetric[];
}

export interface ExternalValidator {
  name: string;
  methodology: string;
  coverage: string[];
  lastValidation: Date;
  agreement: number;
}

export interface BenchmarkDataset {
  name: string;
  description: string;
  scenarios: BenchmarkScenario[];
}

export interface BenchmarkScenario {
  name: string;
  inputs: Record<string, unknown>;
  expectedRange: {
    min: number;
    max: number;
    unit: string;
  };
}

export interface PhysicalConstraint {
  parameter: string;
  minimum: number;
  maximum: number;
  unit: string;
  rationale: string;
}

export interface AccuracyMetric {
  name: string;
  target: number;
  current: number;
  unit: string;
  trend: 'improving' | 'stable' | 'declining';
}

export interface LimitationDocumentation {
  category: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  mitigation?: string;
  roadmap?: string;
}

export interface ChangelogEntry {
  version: string;
  date: Date;
  changes: {
    type: 'feature' | 'improvement' | 'bugfix' | 'data-update';
    description: string;
    impact: string;
  }[];
  migration?: string;
}