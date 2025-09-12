import type { GeoLocation, DevelopmentPattern, DataQuality } from './pattern-types';
import type { CarbonInsight } from './insight-types';

export interface ImpactMeasurement {
  id: string;
  insightId: string;
  userId: string;
  implementationDate: Date;
  baselineCarbon: number;
  actualReduction: number;
  productivityImpact: ProductivityImpact;
  userSatisfaction: UserSatisfaction;
  status: ImplementationStatus;
  timeToImplement: number;
  implementationNotes: string;
  rollbackDate?: Date;
  measuredAt: Date;
  confidence: number;
  metadata: ImpactMetadata;
}

export type ImplementationStatus = 
  | 'implemented' 
  | 'partially-implemented' 
  | 'abandoned' 
  | 'rolled-back' 
  | 'measuring';

export interface ProductivityImpact {
  overallChange: number;
  buildTimeChange: number;
  debugTimeChange: number;
  codeQualityChange: number;
  teamCollaborationChange: number;
  developerSatisfactionChange: number;
  metrics: ProductivityMetric[];
}

export interface ProductivityMetric {
  name: string;
  beforeValue: number;
  afterValue: number;
  unit: string;
  changePercentage: number;
  significance: 'high' | 'medium' | 'low';
}

export interface UserSatisfaction {
  overallRating: number;
  easeOfImplementation: number;
  effectivenessRating: number;
  willingnessToRecommend: number;
  feedback: UserFeedback;
  surveyDate: Date;
}

export interface UserFeedback {
  positiveAspects: string[];
  negativeAspects: string[];
  suggestions: string[];
  additionalComments: string;
  wouldImplementAgain: boolean;
}

export interface ImpactMetadata {
  measurementPeriod: MeasurementPeriod;
  comparisonMethod: string;
  statisticalSignificance: number;
  confoundingFactors: string[];
  dataQuality: DataQuality;
  externalFactors: ExternalFactor[];
}

export interface MeasurementPeriod {
  baselineStart: Date;
  baselineEnd: Date;
  postImplementationStart: Date;
  postImplementationEnd: Date;
  totalDays: number;
}

export interface ExternalFactor {
  name: string;
  description: string;
  impact: 'positive' | 'negative' | 'neutral';
  magnitude: number;
}

export interface Baseline {
  id: string;
  userId: string;
  insightId: string;
  period: MeasurementPeriod;
  averageCarbon: number;
  averageProductivity: number;
  activityPatterns: BaselineActivityPattern[];
  implementationDate: Date;
  expectedReduction: number;
  confidence: number;
  createdAt: Date;
}

export interface BaselineActivityPattern {
  activityType: string;
  frequency: number;
  averageDuration: number;
  averageCarbonFootprint: number;
  consistency: number;
}

export interface ImpactReport {
  id: string;
  userId: string;
  reportPeriod: MeasurementPeriod;
  totalInsightsImplemented: number;
  totalCarbonReduction: number;
  totalProductivityGain: number;
  topInsights: TopInsight[];
  trends: ImpactTrend[];
  recommendations: FutureRecommendation[];
  generatedAt: Date;
  summary: ImpactSummary;
}

export interface TopInsight {
  insightId: string;
  title: string;
  carbonReduction: number;
  productivityImpact: number;
  implementationEffort: number;
  roi: number;
  userSatisfaction: number;
}

export interface ImpactTrend {
  metric: string;
  direction: 'improving' | 'declining' | 'stable';
  rate: number;
  confidence: number;
  projectedNextMonth: number;
}

export interface FutureRecommendation {
  type: string;
  description: string;
  expectedBenefit: number;
  confidence: number;
  timeframe: string;
}

export interface ImpactSummary {
  totalCarbonSaved: number;
  equivalentTrees: number;
  equivalentCars: number;
  monetaryValue: number;
  rank: UserRank;
  achievements: Achievement[];
}

export interface UserRank {
  percentile: number;
  category: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  pointsToNextLevel: number;
  currentStreak: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  iconUrl: string;
  unlockedAt: Date;
  category: AchievementCategory;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
}

export type AchievementCategory = 
  | 'carbon-reduction'
  | 'implementation'
  | 'consistency'
  | 'innovation'
  | 'collaboration'
  | 'milestone';

export interface TrainingExample {
  userId: string;
  userProfile: UserProfile;
  patterns: DevelopmentPattern;
  geographicContext: GeographicContext;
  implementedInsight: CarbonInsight;
  actualImpact: ImpactMeasurement;
  success: boolean;
  features: number[];
  label: number;
  weight: number;
}

export interface UserProfile {
  userId: string;
  location: GeoLocation;
  timezone: string;
  experienceLevel: 'junior' | 'mid' | 'senior' | 'lead';
  primaryLanguages: string[];
  primaryFrameworks: string[];
  teamSize: number;
  workStyle: 'individual' | 'collaborative' | 'mixed';
  environmentPreference: 'local' | 'cloud' | 'hybrid';
  sustainabilityGoals: SustainabilityGoals;
  preferences: UserPreferences;
  createdAt: Date;
  updatedAt: Date;
}

export interface SustainabilityGoals {
  annualReductionTarget: number;
  monthlyReductionTarget: number;
  priorities: SustainabilityPriority[];
  tradeOffTolerance: TradeOffTolerance;
}

export interface SustainabilityPriority {
  category: string;
  importance: number;
  currentPerformance: number;
  improvementGoal: number;
}

export interface TradeOffTolerance {
  productivityForCarbon: number;
  convenienceForCarbon: number;
  costForCarbon: number;
}

export interface UserPreferences {
  notificationFrequency: 'real-time' | 'daily' | 'weekly' | 'monthly';
  complexityPreference: 'simple' | 'moderate' | 'advanced';
  implementationStyle: 'gradual' | 'immediate' | 'batch';
  feedbackVerbosity: 'minimal' | 'standard' | 'detailed';
  privacyLevel: 'anonymous' | 'aggregated' | 'detailed';
}

export interface GeographicContext {
  currentLocation: GeoLocation;
  gridRegion: string;
  currentCarbonIntensity: number;
  forecast24h: CarbonIntensityForecast[];
  renewableEnergyPercentage: number;
  timeOfDayFactors: TimeOfDayFactor[];
  seasonalFactors: SeasonalFactor[];
  nearbyDataCenters: DataCenter[];
}

export interface CarbonIntensityForecast {
  timestamp: Date;
  intensity: number;
  confidence: number;
  renewablePercentage: number;
}

export interface TimeOfDayFactor {
  hour: number;
  factor: number;
  renewableAvailability: number;
}

export interface SeasonalFactor {
  month: number;
  factor: number;
  renewableAvailability: number;
}

export interface DataCenter {
  name: string;
  location: GeoLocation;
  distance: number;
  pue: number;
  renewablePercentage: number;
  latency: number;
}