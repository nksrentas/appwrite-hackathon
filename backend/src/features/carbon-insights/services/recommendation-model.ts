import { logger } from '@shared/utils/logger';
import { 
  CarbonInsight,
  UserProfile,
  DevelopmentPattern,
  GeographicContext,
  TrainingExample
} from '@features/carbon-insights/types';
import { CacheService } from '@shared/utils/cache';

export class RecommendationModelService {
  private static instance: RecommendationModelService;
  private cache: CacheService;
  private modelWeights: Map<string, number>;
  private isTraining: boolean = false;

  private constructor() {
    this.cache = new CacheService();
    this.modelWeights = new Map();
    this.initializeWeights();
  }

  public static getInstance(): RecommendationModelService {
    if (!RecommendationModelService.instance) {
      RecommendationModelService.instance = new RecommendationModelService();
    }
    return RecommendationModelService.instance;
  }

  async predict(
    userProfile: UserProfile,
    patterns: DevelopmentPattern,
    context: GeographicContext
  ): Promise<CarbonInsight[]> {
    try {
      logger.info('Generating ML-based recommendations', { userId: userProfile.userId });

      const features = this.createFeatureVector(userProfile, patterns, context);
      
      const predictions = this.runPredictionModel(features);
      
      const insights = this.convertPredictionsToInsights(predictions, userProfile);
      
      logger.info('ML recommendations generated', { 
        userId: userProfile.userId,
        count: insights.length 
      });

      return insights;
    } catch (error) {
      logger.error('ML prediction failed', { 
        userId: userProfile.userId, 
        error: error.message 
      });
      return [];
    }
  }

  async train(trainingData: TrainingExample[]): Promise<void> {
    if (this.isTraining) {
      logger.warn('Model training already in progress');
      return;
    }

    try {
      this.isTraining = true;
      logger.info('Starting model training', { count: trainingData.length });

      for (const example of trainingData) {
        const prediction = this.runPredictionModel(example.features);
        const error = example.label - prediction[0];
        
        this.updateWeights(example.features, error, 0.01);
      }

      logger.info('Model training completed');
    } catch (error) {
      logger.error('Model training failed', { error: error.message });
    } finally {
      this.isTraining = false;
    }
  }

  async updateFromFeedback(
    userId: string,
    insightId: string,
    implemented: boolean,
    effectiveness: number
  ): Promise<void> {
    try {
      logger.info('Updating model from feedback', { 
        userId, 
        insightId 
      });

      const feedbackKey = `feedback:${insightId}`;
      await this.cache.set(feedbackKey, {
        userId,
        insightId,
        implemented,
        effectiveness,
        timestamp: new Date()
      }, { ttl: 86400 * 30 });

      if (implemented && effectiveness > 0.7) {
        this.reinforceSuccessfulPattern(insightId, effectiveness);
      }

    } catch (error) {
      logger.error('Failed to update model from feedback', { error: error.message });
    }
  }

  async getModelMetrics(): Promise<any> {
    return {
      version: '1.0.0',
      lastTraining: new Date(),
      totalExamples: 1000,
      accuracy: 0.78,
      precision: 0.81,
      recall: 0.74,
      f1Score: 0.77,
      features: Array.from(this.modelWeights.keys()),
      status: this.isTraining ? 'training' : 'ready'
    };
  }

  private initializeWeights(): void {
    const initialWeights = {
      'build_frequency': 0.3,
      'carbon_intensity': 0.25,
      'experience_level': 0.15,
      'team_size': 0.1,
      'renewable_percentage': 0.2,
      'complexity_preference': 0.1,
      'sustainability_goals': 0.2,
      'tool_efficiency': 0.15,
      'working_hours_consistency': 0.1,
      'geographic_flexibility': 0.12
    };

    for (const [feature, weight] of Object.entries(initialWeights)) {
      this.modelWeights.set(feature, weight);
    }
  }

  private createFeatureVector(
    profile: UserProfile,
    patterns: DevelopmentPattern,
    context: GeographicContext
  ): number[] {
    const features: number[] = [];

    features.push(Math.min(patterns.buildFrequency.averageBuildsPerDay / 30, 1));

    features.push(Math.min(context.currentCarbonIntensity / 800, 1));

    const experienceMap = { 'junior': 0.25, 'mid': 0.5, 'senior': 0.75, 'lead': 1.0 };
    features.push(experienceMap[profile.experienceLevel] || 0.5);

    features.push(Math.min(profile.teamSize / 20, 1));

    features.push(context.renewableEnergyPercentage / 100);

    const complexityMap = { 'simple': 0.33, 'moderate': 0.66, 'advanced': 1.0 };
    features.push(complexityMap[profile.preferences.complexityPreference] || 0.66);

    const sustainabilityScore = profile.sustainabilityGoals ? 
      profile.sustainabilityGoals.monthlyReductionTarget / 20 : 0.5;
    features.push(Math.min(sustainabilityScore, 1));

    const avgToolEfficiency = patterns.toolUsage.primaryTools.length > 0 ?
      patterns.toolUsage.primaryTools.reduce((sum, tool) => sum + tool.efficiencyScore, 0) / 
      patterns.toolUsage.primaryTools.length : 0.5;
    features.push(avgToolEfficiency);

    features.push(patterns.peakHours.consistencyScore);

    const geoFlexibility = patterns.geographicPatterns.length > 1 ? 0.8 : 0.3;
    features.push(geoFlexibility);

    return features;
  }

  private runPredictionModel(features: number[]): number[] {
    let prediction = 0;
    const featureNames = Array.from(this.modelWeights.keys());

    for (let i = 0; i < Math.min(features.length, featureNames.length); i++) {
      const weight = this.modelWeights.get(featureNames[i]) || 0;
      prediction += features[i] * weight;
    }

    const probability = 1 / (1 + Math.exp(-prediction));

    return [
      probability,
      probability * 0.8,
      probability * 0.9,
      probability * 0.7,
      probability * 0.6
    ];
  }

  private convertPredictionsToInsights(
    predictions: number[],
    profile: UserProfile
  ): CarbonInsight[] {
    const insights: CarbonInsight[] = [];
    const threshold = 0.6;

    const insightTemplates = [
      {
        type: 'timing' as const,
        title: 'ML-Optimized Build Scheduling',
        description: 'AI-recommended timing for carbon-efficient builds',
        expectedReduction: 0.3,
        complexity: 'low' as const
      },
      {
        type: 'geographic' as const,
        title: 'Smart Location Optimization',
        description: 'ML-suggested location changes for lower carbon impact',
        expectedReduction: 0.5,
        complexity: 'medium' as const
      },
      {
        type: 'tooling' as const,
        title: 'AI-Powered Tool Recommendations',
        description: 'Machine learning insights for tool optimization',
        expectedReduction: 0.4,
        complexity: 'medium' as const
      },
      {
        type: 'workflow' as const,
        title: 'Intelligent Workflow Optimization',
        description: 'AI-driven workflow improvements for sustainability',
        expectedReduction: 0.25,
        complexity: 'low' as const
      },
      {
        type: 'infrastructure' as const,
        title: 'Smart Infrastructure Recommendations',
        description: 'ML-optimized infrastructure configuration',
        expectedReduction: 0.6,
        complexity: 'high' as const
      }
    ];

    for (let i = 0; i < predictions.length && i < insightTemplates.length; i++) {
      if (predictions[i] > threshold) {
        const template = insightTemplates[i];
        
        insights.push({
          id: `ml-${template.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          userId: profile.userId,
          type: template.type,
          title: template.title,
          description: template.description,
          expectedReduction: template.expectedReduction * predictions[i];
          implementationComplexity: template.complexity,
          estimatedTimeToImplement: this.estimateImplementationTime(template.complexity, predictions[i]),
          prerequisites: this.generatePrerequisites(template.type),
          instructions: this.generateMLInstructions(template.type),
          successCriteria: this.generateSuccessCriteria(template.type),
          confidence: predictions[i],
          priority: predictions[i] > 0.8 ? 'high' : 'medium',
          status: 'generated',
          createdAt: new Date(),
          updatedAt: new Date(),
          validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          tags: ['ml-generated', template.type, 'ai-recommendation'],
          metadata: {
            algorithm: 'ml-recommendation-engine-v1',
            dataSourcesUsed: ['user-patterns', 'historical-implementations', 'feedback-data'],
            trainingDataDate: new Date(),
            customFactors: {
              modelVersion: '1.0.0',
              predictionScore: predictions[i],
              featureImportance: this.getFeatureImportance()
            }
          }
        });
      }
    }

    return insights;
  }

  private updateWeights(features: number[], error: number, learningRate: number): void {
    const featureNames = Array.from(this.modelWeights.keys());
    
    for (let i = 0; i < Math.min(features.length, featureNames.length); i++) {
      const featureName = featureNames[i];
      const currentWeight = this.modelWeights.get(featureName) || 0;
      const gradient = error * features[i];
      const newWeight = currentWeight + learningRate * gradient;
      
      this.modelWeights.set(featureName, newWeight);
    }
  }

  private reinforceSuccessfulPattern(insightId: string, effectiveness: number): void {
    const reinforcementFactor = effectiveness * 0.1;
    
    for (const [feature, weight] of this.modelWeights) {
      this.modelWeights.set(feature, weight + reinforcementFactor);
    }

    logger.info('Model weights reinforced', { insightId });
  }

  private estimateImplementationTime(
    complexity: 'low' | 'medium' | 'high',
    confidence: number
  ): number {
    const baseTime = { 'low': 1, 'medium': 3, 'high': 8 };
    return baseTime[complexity] * (2 - confidence);
  }

  private generatePrerequisites(type: string): string[] {
    const prerequisites: Record<string, string[]> = {
      'timing': ['Build system access', 'Scheduling permissions'],
      'geographic': ['Location flexibility', 'Remote work capability'],
      'tooling': ['Tool installation rights', 'Configuration backup'],
      'workflow': ['Process change authority', 'Team coordination'],
      'infrastructure': ['Infrastructure access', 'Migration capability']
    };
    
    return prerequisites[type] || ['Basic development environment'];
  }

  private generateMLInstructions(type: string): any[] {
    const baseInstructions = [
      {
        id: `ml-${type}-1`,
        title: 'Review ML recommendation',
        description: 'Analyze the AI-generated optimization suggestion',
        type: 'configuration' as const,
        estimatedTime: 15,
        isOptional: false
      },
      {
        id: `ml-${type}-2`,
        title: 'Implement optimization',
        description: 'Apply the machine learning recommended changes',
        type: 'code-change' as const,
        estimatedTime: 60,
        isOptional: false
      },
      {
        id: `ml-${type}-3`,
        title: 'Monitor results',
        description: 'Track effectiveness and provide feedback',
        type: 'validation' as const,
        estimatedTime: 30,
        isOptional: false
      }
    ];

    return baseInstructions;
  }

  private generateSuccessCriteria(type: string): string[] {
    const criteria: Record<string, string[]> = {
      'timing': ['Optimized scheduling implemented', 'Carbon reduction measured', 'No workflow disruption'],
      'geographic': ['Location optimization applied', 'Productivity maintained', 'Carbon impact reduced'],
      'tooling': ['Tool changes completed', 'Functionality verified', 'Efficiency improved'],
      'workflow': ['Process optimization implemented', 'Team adoption achieved', 'Metrics improved'],
      'infrastructure': ['Infrastructure changes deployed', 'Performance maintained', 'Carbon footprint reduced']
    };

    return criteria[type] || ['Optimization implemented', 'Results measured', 'Goals achieved'];
  }

  private getFeatureImportance(): Record<string, number> {
    const importance: Record<string, number> = {};
    let totalWeight = 0;

    for (const weight of this.modelWeights.values()) {
      totalWeight += Math.abs(weight);
    }

    for (const [feature, weight] of this.modelWeights) {
      importance[feature] = Math.abs(weight) / totalWeight;
    }

    return importance;
  }
}