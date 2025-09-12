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
  completeness: number; // 0-1
  consistency: number; // 0-1
  recency: number; // 0-1
  overallScore: number; // 0-1
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
  start: number; // 0-23
  end: number; // 0-23
  intensity: number; // 0-1
  carbonEfficiency: number; // lower is better
}

export interface DayOfWeekPattern {
  day: string;
  activityLevel: number; // 0-1
  averageHours: number;
  carbonIntensity: number;
}

export interface ToolUsagePattern {
  primaryTools: ToolUsage[];
  languageDistribution: Record<string, number>;
  frameworkUsage: Record<string, number>;
  cicdPatterns: CICDPattern[];
  localVsRemoteRatio: number; // 0-1, 0 = all local, 1 = all remote
}

export interface ToolUsage {
  toolName: string;
  usageHours: number;
  carbonFootprintPerHour: number;
  efficiencyScore: number; // 0-1
  alternatives: ToolAlternative[];
}

export interface ToolAlternative {
  name: string;
  carbonReduction: number; // percentage
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
  timeSpent: number; // hours
  carbonIntensityDuringWork: number;
  travelPatterns: TravelPattern[];
  remoteWorkEfficiency: number; // 0-1
}

export interface TravelPattern {
  fromLocation: GeoLocation;
  toLocation: GeoLocation;
  frequency: string; // daily, weekly, monthly
  transportMethod: string;
  workPatternChanges: WorkPatternChange[];
}

export interface WorkPatternChange {
  metric: string;
  change: number; // percentage change
  carbonImpact: number;
}

export interface HighCarbonPattern {
  pattern: PatternSignature;
  carbonFootprint: number; // kg CO2e
  frequency: number; // occurrences per week
  context: PatternContext;
  optimizationOpportunities: OptimizationOpportunity[];
}

export interface PatternSignature {
  type: string;
  description: string;
  triggers: string[];
  duration: number; // minutes
  complexity: number; // 1-10
}

export interface PatternContext {
  timeOfDay: number[]; // hours when this pattern occurs
  dayOfWeek: string[];
  gridCarbonIntensity: number;
  userProductivity: number; // 0-1
  teamCollaboration: boolean;
}

export interface OptimizationOpportunity {
  description: string;
  expectedReduction: number; // percentage
  implementationEffort: ImplementationComplexity;
  riskLevel: 'low' | 'medium' | 'high';
  dependencies: string[];
}

export interface WorkingHabitPattern {
  focusTimePatterns: FocusTimePattern[];
  interruptionFrequency: number; // per hour
  multitaskingRatio: number; // 0-1
  deepWorkSessions: DeepWorkSession[];
  energyLevels: EnergyLevelPattern[];
}

export interface FocusTimePattern {
  timeRange: HourRange;
  averageDuration: number; // minutes
  productivityScore: number; // 0-1
  carbonEfficiency: number; // 0-1
}

export interface DeepWorkSession {
  averageDuration: number; // minutes
  frequency: number; // per day
  carbonFootprintPerMinute: number;
  qualityScore: number; // 0-1
}

export interface EnergyLevelPattern {
  timeRange: HourRange;
  energyLevel: number; // 0-1
  correlationWithCarbonEfficiency: number; // -1 to 1
}

export interface CollaborationPattern {
  meetingFrequency: number; // per day
  averageMeetingDuration: number; // minutes
  remoteVsInPersonRatio: number; // 0-1
  pairProgrammingHours: number; // per week
  asyncCommunicationRatio: number; // 0-1
  teamSizePreference: number;
}

export interface Activity {
  id: string;
  userId: string;
  type: ActivityType;
  timestamp: Date;
  duration: number; // minutes
  carbonFootprint: number; // kg CO2e
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
  complexity: number; // cyclomatic complexity
  testCoverage: number; // percentage
}

export interface ResourceUsage {
  cpu: number; // percentage
  memory: number; // MB
  storage: number; // MB
  network: number; // MB
}