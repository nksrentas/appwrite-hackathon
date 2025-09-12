import type { GeoLocation, DevelopmentPattern, DataQuality } from './pattern-types';
import type { CarbonInsight } from './insight-types';

export interface ImpactMeasurement {
  id: string;
  insightId: string;
  userId: string;
  implementationDate: Date;
  baselineCarbon: number; // kg CO2e
  actualReduction: number; // kg CO2e
  productivityImpact: ProductivityImpact;
  userSatisfaction: UserSatisfaction;
  status: ImplementationStatus;
  timeToImplement: number; // hours
  implementationNotes: string;
  rollbackDate?: Date;
  measuredAt: Date;
  confidence: number; // 0-1
  metadata: ImpactMetadata;
}

export type ImplementationStatus = 
  | 'implemented' 
  | 'partially-implemented' 
  | 'abandoned' 
  | 'rolled-back' 
  | 'measuring';

export interface ProductivityImpact {
  overallChange: number; // percentage change
  buildTimeChange: number; // percentage change
  debugTimeChange: number; // percentage change
  codeQualityChange: number; // percentage change
  teamCollaborationChange: number; // percentage change
  developerSatisfactionChange: number; // percentage change
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
  overallRating: number; // 1-5
  easeOfImplementation: number; // 1-5
  effectivenessRating: number; // 1-5
  willingnessToRecommend: number; // 1-5
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
  statisticalSignificance: number; // p-value
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
  magnitude: number; // 0-1
}

export interface Baseline {
  id: string;
  userId: string;
  insightId: string;
  period: MeasurementPeriod;
  averageCarbon: number; // kg CO2e per day
  averageProductivity: number; // tasks completed per day
  activityPatterns: BaselineActivityPattern[];
  implementationDate: Date;
  expectedReduction: number; // kg CO2e
  confidence: number; // 0-1
  createdAt: Date;
}

export interface BaselineActivityPattern {
  activityType: string;
  frequency: number; // per day
  averageDuration: number; // minutes
  averageCarbonFootprint: number; // kg CO2e
  consistency: number; // 0-1
}

export interface ImpactReport {
  id: string;
  userId: string;
  reportPeriod: MeasurementPeriod;
  totalInsightsImplemented: number;
  totalCarbonReduction: number; // kg CO2e
  totalProductivityGain: number; // percentage
  topInsights: TopInsight[];
  trends: ImpactTrend[];
  recommendations: FutureRecommendation[];
  generatedAt: Date;
  summary: ImpactSummary;
}

export interface TopInsight {
  insightId: string;
  title: string;
  carbonReduction: number; // kg CO2e
  productivityImpact: number; // percentage
  implementationEffort: number; // hours
  roi: number; // carbon reduction per hour of effort
  userSatisfaction: number; // 1-5
}

export interface ImpactTrend {
  metric: string;
  direction: 'improving' | 'declining' | 'stable';
  rate: number; // percentage change per month
  confidence: number; // 0-1
  projectedNextMonth: number;
}

export interface FutureRecommendation {
  type: string;
  description: string;
  expectedBenefit: number;
  confidence: number; // 0-1
  timeframe: string;
}

export interface ImpactSummary {
  totalCarbonSaved: number; // kg CO2e
  equivalentTrees: number; // trees that would need to be planted
  equivalentCars: number; // cars taken off road for a day
  monetaryValue: number; // USD equivalent
  rank: UserRank;
  achievements: Achievement[];
}

export interface UserRank {
  percentile: number; // 0-100
  category: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  pointsToNextLevel: number;
  currentStreak: number; // days of consistent optimization
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
  weight: number; // for training importance
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
  annualReductionTarget: number; // kg CO2e
  monthlyReductionTarget: number; // kg CO2e
  priorities: SustainabilityPriority[];
  tradeOffTolerance: TradeOffTolerance;
}

export interface SustainabilityPriority {
  category: string;
  importance: number; // 1-5
  currentPerformance: number; // 1-5
  improvementGoal: number; // percentage
}

export interface TradeOffTolerance {
  productivityForCarbon: number; // 0-1, willingness to sacrifice productivity
  convenienceForCarbon: number; // 0-1, willingness to sacrifice convenience
  costForCarbon: number; // 0-1, willingness to pay more for lower carbon
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
  currentCarbonIntensity: number; // gCO2/kWh
  forecast24h: CarbonIntensityForecast[];
  renewableEnergyPercentage: number;
  timeOfDayFactors: TimeOfDayFactor[];
  seasonalFactors: SeasonalFactor[];
  nearbyDataCenters: DataCenter[];
}

export interface CarbonIntensityForecast {
  timestamp: Date;
  intensity: number; // gCO2/kWh
  confidence: number; // 0-1
  renewablePercentage: number;
}

export interface TimeOfDayFactor {
  hour: number; // 0-23
  factor: number; // multiplier for carbon intensity
  renewableAvailability: number; // 0-1
}

export interface SeasonalFactor {
  month: number; // 1-12
  factor: number; // multiplier for carbon intensity
  renewableAvailability: number; // 0-1
}

export interface DataCenter {
  name: string;
  location: GeoLocation;
  distance: number; // km
  pue: number; // Power Usage Effectiveness
  renewablePercentage: number;
  latency: number; // ms
}