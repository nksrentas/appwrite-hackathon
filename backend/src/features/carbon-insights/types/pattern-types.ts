export enum ImplementationComplexity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  VERY_HIGH = 'very_high'
}

export interface GeoLocation {
  latitude: number;
  longitude: number;
  city?: string;
  region?: string;
  country?: string;
  timezone?: string;
  gridRegion?: string;
}

export interface DevelopmentPattern {
  userId: string;
  timeframe: PatternTimeframe;
  buildFrequency: BuildFrequencyPattern;
  peakHours: PeakHoursPattern;
  toolUsage: ToolUsagePattern;
  geographicPatterns: GeographicPattern[];
  carbonIntensivePatterns: HighCarbonPattern[];
  workingHabitPatterns: WorkingHabitPattern;
  collaborationPatterns: CollaborationPattern;
  lastAnalyzed: Date;
}

export interface PatternTimeframe {
  startDate: Date;
  endDate: Date;
  daysCovered: number;
  dataQuality: DataQuality;
}

export interface DataQuality {
  completeness: number;
  consistency: number;
  recency: number;
  overallScore: number;
}

export interface BuildFrequencyPattern {
  averageBuildsPerDay: number;
  peakBuildDays: string[];
  buildDurationDistribution: BuildDurationStats;
  buildTypeDistribution: Record<string, number>;
  failureRate: number;
  retryPatterns: RetryPattern[];
}

export interface BuildDurationStats {
  mean: number;
  median: number;
  p95: number;
  p99: number;
  standardDeviation: number;
}

export interface RetryPattern {
  averageRetries: number;
  timeToRetry: number; // minutes
  successRateAfterRetry: number;
}

export interface PeakHoursPattern {
  primaryWorkingHours: HourRange[];
  timezone: string;
  weekdayPattern: DayOfWeekPattern[];
  seasonalVariation: boolean;
  consistencyScore: number; // 0-1
}

export interface HourRange {
  start: number;
  end: number;
  intensity: number;
  carbonEfficiency: number;
}

export interface DayOfWeekPattern {
  day: string;
  activityLevel: number;
  averageHours: number;
  carbonIntensity: number;
}

export interface ToolUsagePattern {
  primaryTools: ToolUsage[];
  languageDistribution: Record<string, number>;
  frameworkUsage: Record<string, number>;
  frameworkDistribution: Record<string, number>;
  cicdPatterns: CICDPattern[];
  localVsRemoteRatio: number;
}

export interface ToolUsage {
  toolName: string;
  usageHours: number;
  carbonFootprintPerHour: number;
  efficiencyScore: number;
  alternatives: ToolAlternative[];
}

export interface ToolAlternative {
  name: string;
  carbonReduction: number;
  effortToSwitch: ImplementationComplexity;
  featureComparison: string;
}

export interface CICDPattern {
  platform: string;
  averageBuildsPerCommit: number;
  parallelization: number;
  cacheHitRatio: number;
  testCoverage: number;
  deploymentFrequency: string;
}

export interface GeographicPattern {
  location: GeoLocation;
  timeSpent: number;
  carbonIntensityDuringWork: number;
  travelPatterns: TravelPattern[];
  remoteWorkEfficiency: number;
}

export interface TravelPattern {
  fromLocation: GeoLocation;
  toLocation: GeoLocation;
  frequency: string;
  transportMethod: string;
  workPatternChanges: WorkPatternChange[];
}

export interface WorkPatternChange {
  metric: string;
  change: number;
  carbonImpact: number;
}

export interface HighCarbonPattern {
  pattern: PatternSignature;
  carbonFootprint: number;
  frequency: number;
  context: PatternContext;
  optimizationOpportunities: OptimizationOpportunity[];
}

export interface PatternSignature {
  type: string;
  description: string;
  triggers: string[];
  duration: number;
  complexity: number;
}

export interface PatternContext {
  timeOfDay: number[];
  dayOfWeek: string[];
  gridCarbonIntensity: number;
  userProductivity: number;
  teamCollaboration: boolean;
}

export interface OptimizationOpportunity {
  description: string;
  expectedReduction: number;
  implementationEffort: ImplementationComplexity;
  riskLevel: 'low' | 'medium' | 'high';
  dependencies: string[];
}

export interface WorkingHabitPattern {
  focusTimePatterns: FocusTimePattern[];
  interruptionFrequency: number;
  multitaskingRatio: number;
  deepWorkSessions: DeepWorkSession[];
  energyLevels: EnergyLevelPattern[];
}

export interface FocusTimePattern {
  timeRange: HourRange;
  averageDuration: number;
  productivityScore: number;
  carbonEfficiency: number;
}

export interface DeepWorkSession {
  averageDuration: number;
  frequency: number;
  carbonFootprintPerMinute: number;
  qualityScore: number;
}

export interface EnergyLevelPattern {
  timeRange: HourRange;
  energyLevel: number;
  correlationWithCarbonEfficiency: number;
}

export interface CollaborationPattern {
  meetingFrequency: number;
  averageMeetingDuration: number;
  remoteVsInPersonRatio: number;
  pairProgrammingHours: number;
  asyncCommunicationRatio: number;
  teamSizePreference: number;
}

export interface Activity {
  id: string;
  userId: string;
  type: ActivityType;
  timestamp: Date;
  duration: number;
  carbonFootprint: number;
  location: GeoLocation;
  metadata: ActivityMetadata;
}

export type ActivityType = 
  | 'build'
  | 'test' 
  | 'deploy'
  | 'code'
  | 'meeting'
  | 'research'
  | 'review'
  | 'debug';

export interface ActivityMetadata {
  toolsUsed: string[];
  languagesUsed: string[];
  projectContext: string;
  collaborators?: string[];
  buildDetails?: BuildMetadata;
  codeDetails?: CodeMetadata;
}

export interface BuildMetadata {
  buildType: string;
  success: boolean;
  testsRun: number;
  testsPassed: number;
  cacheHit: boolean;
  parallelJobs: number;
  resourceUsage: ResourceUsage;
}

export interface CodeMetadata {
  linesChanged: number;
  filesModified: number;
  complexity: number;
  testCoverage: number;
}

export interface ResourceUsage {
  cpu: number;
  memory: number;
  storage: number;
  network: number;
}