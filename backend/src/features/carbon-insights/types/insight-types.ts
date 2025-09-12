import type { GeoLocation } from './pattern-types';

export interface CarbonInsight {
  id: string;
  userId: string;
  type: InsightType;
  title: string;
  description: string;
  expectedReduction: number; // kg CO2e
  implementationComplexity: ImplementationComplexity;
  estimatedTimeToImplement: number; // hours
  prerequisites: string[];
  instructions: ImplementationStep[];
  successCriteria: string[];
  confidence: number; // 0-1 confidence score
  priority: InsightPriority;
  status: InsightStatus;
  createdAt: Date;
  updatedAt: Date;
  validUntil: Date;
  tags: string[];
  metadata: InsightMetadata;
}

export type InsightType = 'timing' | 'geographic' | 'tooling' | 'workflow' | 'infrastructure';

export type ImplementationComplexity = 'low' | 'medium' | 'high';

export type InsightPriority = 'low' | 'medium' | 'high' | 'critical';

export type InsightStatus = 'generated' | 'presented' | 'accepted' | 'implemented' | 'dismissed' | 'expired';

export interface ImplementationStep {
  id: string;
  title: string;
  description: string;
  type: StepType;
  estimatedTime: number; // minutes
  isOptional: boolean;
  code?: CodeExample;
  validation?: ValidationStep;
}

export type StepType = 'configuration' | 'code-change' | 'tool-installation' | 'workflow-change' | 'validation';

export interface CodeExample {
  language: string;
  code: string;
  filename?: string;
  description: string;
}

export interface ValidationStep {
  description: string;
  expectedOutput?: string;
  command?: string;
}

export interface InsightMetadata {
  algorithm: string;
  dataSourcesUsed: string[];
  trainingDataDate: Date;
  geographicRelevance?: GeographicRelevance;
  temporalRelevance?: TemporalRelevance;
  customFactors?: Record<string, any>;
}

export interface GeographicRelevance {
  location: GeoLocation;
  gridRegion: string;
  seasonalFactors: boolean;
  timezoneConsidered: boolean;
}

export interface TemporalRelevance {
  timeOfDay: string[];
  daysOfWeek: string[];
  seasonalPattern: boolean;
  gridIntensityPattern: boolean;
}

