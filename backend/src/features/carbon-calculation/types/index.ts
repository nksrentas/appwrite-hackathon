export interface ActivityData {
  activityType: 'cloud_compute' | 'data_transfer' | 'storage' | 'electricity' | 'transport' | 'commit' | 'deployment';
  timestamp: string;
  location?: {
    postalCode?: string;
    region?: string;
    country: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  metadata: Record<string, any>;
}

export interface CloudComputeActivity extends ActivityData {
  activityType: 'cloud_compute';
  metadata: {
    provider: 'aws' | 'azure' | 'gcp' | 'other';
    instanceType?: string;
    region: string;
    cpuHours?: number;
    memoryGbHours?: number;
    vcpuCount?: number;
    duration: number;
  };
}

export interface DataTransferActivity extends ActivityData {
  activityType: 'data_transfer';
  metadata: {
    bytesTransferred: number;
    sourceRegion?: string;
    destinationRegion?: string;
    networkType?: 'internet' | 'cdn' | 'internal';
  };
}

export interface StorageActivity extends ActivityData {
  activityType: 'storage';
  metadata: {
    storageType: 'ssd' | 'hdd' | 'object' | 'archive';
    sizeGB: number;
    duration: number;
    region?: string;
  };
}

export interface ElectricityActivity extends ActivityData {
  activityType: 'electricity';
  metadata: {
    kWhConsumed: number;
    timeOfDay?: 'peak' | 'off_peak' | 'shoulder';
    source?: 'grid' | 'renewable' | 'mixed';
  };
}

export interface CarbonCalculationResult {
  carbonKg: number;
  confidence: 'low' | 'medium' | 'high' | 'very_high';
  methodology: CalculationMethodology;
  sources: DataSource[];
  uncertaintyRange: {
    lower: number;
    upper: number;
  };
  calculatedAt: string;
  validUntil: string;
  auditTrail: AuditEntry[];
}

export interface CalculationMethodology {
  name: string;
  version: string;
  emissionFactors: EmissionFactor[];
  conversionFactors: ConversionFactor[];
  assumptions: string[];
  standards: ('IPCC_AR6' | 'GHG_Protocol' | 'ISO_14040' | 'SCI_Spec')[];
}

export interface EmissionFactor {
  id: string;
  name: string;
  value: number;
  unit: string;
  source: string;
  region?: string;
  lastUpdated: string;
  validFrom: string;
  validUntil?: string;
  uncertainty?: number;
}

export interface ConversionFactor {
  from: string;
  to: string;
  factor: number;
  source: string;
  uncertainty?: number;
}

export interface DataSource {
  name: string;
  type: 'EPA_eGRID' | 'AWS_Carbon' | 'Electricity_Maps' | 'Green_Software_Foundation' | 'IPCC' | 'Custom';
  lastUpdated: string;
  freshness: 'real_time' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually';
  reliability: number;
  coverage: {
    geographic: string[];
    temporal: string;
    activities: string[];
  };
}

export interface AuditEntry {
  timestamp: string;
  action: 'calculate' | 'validate' | 'update_sources' | 'override';
  details: {
    userId?: string;
    changes?: Record<string, any>;
    version?: string;
    reason?: string;
  };
  systemInfo: {
    version: string;
    environment: string;
    requestId: string;
  };
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  confidence: number;
  crossReferences: CrossReference[];
}

export interface ValidationError {
  field: string;
  code: string;
  message: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export interface ValidationWarning {
  field: string;
  code: string;
  message: string;
  impact: 'data_quality' | 'accuracy' | 'completeness';
}

export interface CrossReference {
  source: string;
  expectedValue: number;
  actualValue: number;
  variance: number;
  status: 'match' | 'close' | 'divergent' | 'failed';
}

export interface EPAGridData {
  subregion: string;
  state: string;
  postalCodes: string[];
  emissionRate: number;
  unit: 'kg_CO2_per_MWh' | 'lb_CO2_per_MWh';
  year: number;
  quarter: number;
  lastUpdated: string;
  source: string;
}

export interface ElectricityMapsData {
  zone: string;
  carbonIntensity: number;
  unit: 'gCO2eq/kWh';
  timestamp: string;
  source: 'real_time' | 'forecast' | 'historical';
  renewable: number;
  fossil: number;
}

export interface AWSCarbonData {
  region: string;
  service: string;
  carbonIntensity: number;
  unit: string;
  timestamp: string;
  source: 'Customer_Carbon_Footprint_Tool';
}

export interface CircuitBreakerState {
  isOpen: boolean;
  failureCount: number;
  lastFailure?: string;
  nextAttempt?: string;
}

export interface SCICalculation {
  carbonIntensity: number;
  energyConsumption: number;
  embodiedEmissions: number;
  functionalUnit: number;
  sciValue: number;
  sciRating: 'A' | 'B' | 'C' | 'D' | 'E';
  methodology: {
    temporal: 'real_time' | 'time_averaged';
    marginal: boolean;
    locationBased: boolean;
  };
  components: {
    operational: number;
    embodied: number;
  };
}

export interface EmbodiedEmissions {
  hardware: {
    servers: number;
    networking: number;
    storage: number;
    totalLifespanYears: number;
    utilizationRate: number;
  };
  software: {
    development: number;
    deployment: number;
    maintenance: number;
  };
  infrastructure: {
    datacenter: number;
    cooling: number;
    powerInfrastructure: number;
  };
  total: number;
}

export interface FunctionalUnitSpec {
  type: 'request' | 'user_session' | 'transaction' | 'data_processed' | 'computation_cycle';
  value: number;
  unit: string;
  description: string;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: string;
  ttl: number;
  source: string;
}

export interface PerformanceMetrics {
  calculationTime: number;
  dataFetchTime: number;
  validationTime: number;
  totalTime: number;
  cachehits: number;
  cacheMisses: number;
}

export type ActivityType = ActivityData['activityType'];
export type ConfidenceLevel = CarbonCalculationResult['confidence'];
export type DataSourceType = DataSource['type'];
export type FreshnessLevel = DataSource['freshness'];