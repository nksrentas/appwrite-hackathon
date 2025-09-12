import { logger } from '@shared/utils/logger';
import { 
  ImpactMeasurement,
  Baseline,
  ImpactReport,
  UserProfile,
  CarbonInsight,
  Activity,
  ImplementationStatus,
  ProductivityImpact,
  UserSatisfaction
} from '@features/carbon-insights/types';
import { CacheService } from '@shared/utils/cache';
import { PatternAnalyzerService } from '@features/carbon-insights/services/pattern-analyzer';

export class ImpactTrackerService {
  private static instance: ImpactTrackerService;
  private cache: CacheService;
  private patternAnalyzer: PatternAnalyzerService;

  private constructor() {
    this.cache = new CacheService();
    this.patternAnalyzer = PatternAnalyzerService.getInstance();
  }

  public static getInstance(): ImpactTrackerService {
    if (!ImpactTrackerService.instance) {
      ImpactTrackerService.instance = new ImpactTrackerService();
    }
    return ImpactTrackerService.instance;
  }

  async trackImplementation(userId: string, insightId: string): Promise<void> {
    try {
      logger.info('Starting impact tracking', { userId, insightId });

      const baseline = await this.establishBaseline(userId, insightId);
      
      const implementationPeriod = this.getImplementationPeriod(insightId);
      
      setTimeout(async () => {
        try {
          const impact = await this.measureImpact(userId, insightId, baseline);
          await this.recordImpact(impact);
          await this.updateRecommendationModel(impact);
          
          logger.info('Impact measurement completed', { 
            userId, 
            insightId
          });
        } catch (error) {
          logger.error('Failed to measure impact', { userId, insightId, error: error.message });
        }
      }, implementationPeriod);

    } catch (error) {
      logger.error('Failed to start impact tracking', { userId, insightId, error: error.message });
      throw error;
    }
  }

  async recordImplementationStatus(
    userId: string,
    insightId: string,
    status: ImplementationStatus,
    notes?: string
  ): Promise<void> {
    try {
      const statusUpdate = {
        userId,
        insightId,
        status,
        notes: notes || '',
        timestamp: new Date()
      };

      const statusKey = `implementation-status:${insightId}`;
      await this.cache.set(statusKey, statusUpdate, { ttl: 86400 * 30 }); // Keep for 30 days

      logger.info('Implementation status recorded', { userId, insightId });

      if (status === 'implemented') {
        await this.trackImplementation(userId, insightId);
      }

    } catch (error) {
      logger.error('Failed to record implementation status', { error: error.message });
      throw error;
    }
  }

  async getImpactMeasurement(insightId: string): Promise<ImpactMeasurement | null> {
    try {
      const impactKey = `impact:${insightId}`;
      return await this.cache.get(impactKey);
    } catch (error) {
      logger.error('Failed to get impact measurement', { insightId, error: error.message });
      return null;
    }
  }

  async generateImpactReport(userId: string, days: number = 30): Promise<ImpactReport> {
    try {
      logger.info('Generating impact report', { userId, days });

      const reportPeriod = {
        startDate: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
        endDate: new Date(),
        totalDays: days
      };

      const impactMeasurements = await this.getImpactMeasurementsForPeriod(userId, reportPeriod);
      
      const totalCarbonReduction = impactMeasurements.reduce(
        (sum, impact) => sum + impact.actualReduction, 0
      );
      
      const averageProductivityGain = impactMeasurements.length > 0 ?
        impactMeasurements.reduce((sum, impact) => 
          sum + impact.productivityImpact.overallChange, 0
        ) / impactMeasurements.length : 0;

      const topInsights = await this.identifyTopInsights(impactMeasurements);
      
      const trends = await this.analyzeTrends(userId, reportPeriod);
      
      const recommendations = await this.generateFutureRecommendations(userId, impactMeasurements);

      const report: ImpactReport = {
        id: `report-${userId}-${Date.now()}`,
        userId,
        reportPeriod: {
          ...reportPeriod,
          baselineStart: reportPeriod.startDate,
          baselineEnd: reportPeriod.startDate,
          postImplementationStart: reportPeriod.startDate,
          postImplementationEnd: reportPeriod.endDate
        },
        totalInsightsImplemented: impactMeasurements.length,
        totalCarbonReduction,
        totalProductivityGain: averageProductivityGain,
        topInsights,
        trends,
        recommendations,
        generatedAt: new Date(),
        summary: await this.generateImpactSummary(userId, totalCarbonReduction, impactMeasurements)
      };

      logger.info('Impact report generated', { 
        userId, 
        count: impactMeasurements.length 
      });

      return report;
    } catch (error) {
      logger.error('Failed to generate impact report', { userId, error: error.message });
      throw error;
    }
  }

  async collectUserFeedback(
    userId: string,
    insightId: string,
    satisfaction: UserSatisfaction
  ): Promise<void> {
    try {
      const feedbackKey = `feedback:${insightId}`;
      const feedback = {
        userId,
        insightId,
        satisfaction,
        timestamp: new Date()
      };

      await this.cache.set(feedbackKey, feedback, { ttl: 86400 * 90 }); // Keep for 90 days
      
      logger.info('User feedback collected', { 
        userId, 
        insightId
      });

      await this.updateImpactWithFeedback(insightId, satisfaction);

    } catch (error) {
      logger.error('Failed to collect user feedback', { error: error.message });
      throw error;
    }
  }

  private async establishBaseline(userId: string, insightId: string): Promise<Baseline> {
    const activities = await this.getRecentActivities(userId, 14);
    
    if (activities.length === 0) {
      throw new Error('Insufficient activity data for baseline establishment');
    }

    const averageCarbon = activities.reduce((sum, a) => sum + a.carbonFootprint, 0) / activities.length;
    const averageProductivity = this.calculateAverageProductivity(activities);
    const activityPatterns = this.analyzeBaselinePatterns(activities);

    const baseline: Baseline = {
      id: `baseline-${insightId}`,
      userId,
      insightId,
      period: {
        baselineStart: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        baselineEnd: new Date(),
        postImplementationStart: new Date(),
        postImplementationEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        totalDays: 14
      },
      averageCarbon,
      averageProductivity,
      activityPatterns,
      implementationDate: new Date(),
      expectedReduction: await this.getExpectedReduction(insightId),
      confidence: 0.8,
      createdAt: new Date()
    };

    const baselineKey = `baseline:${insightId}`;
    await this.cache.set(baselineKey, baseline, { ttl: 86400 * 60 });

    logger.info('Baseline established', { 
      userId, 
      insightId
    });

    return baseline;
  }

  private async measureImpact(
    userId: string,
    insightId: string,
    baseline: Baseline
  ): Promise<ImpactMeasurement> {
    const postActivities = await this.getRecentActivities(userId, 14);
    
    if (postActivities.length === 0) {
      throw new Error('Insufficient post-implementation data for impact measurement');
    }

    const postAverageCarbon = postActivities.reduce((sum, a) => sum + a.carbonFootprint, 0) / postActivities.length;
    const actualReduction = Math.max(0, baseline.averageCarbon - postAverageCarbon);

    const productivityImpact = await this.measureProductivityImpact(baseline, postActivities);

    const userSatisfaction = await this.getUserSatisfaction(userId, insightId);

    const implementationStatus = this.determineImplementationStatus(
      actualReduction, 
      baseline.expectedReduction
    );

    const impact: ImpactMeasurement = {
      id: `impact-${insightId}`,
      insightId,
      userId,
      implementationDate: baseline.implementationDate,
      baselineCarbon: baseline.averageCarbon,
      actualReduction,
      productivityImpact,
      userSatisfaction: userSatisfaction || this.getDefaultSatisfaction(),
      status: implementationStatus,
      timeToImplement: this.calculateTimeToImplement(insightId),
      implementationNotes: '',
      measuredAt: new Date(),
      confidence: this.calculateMeasurementConfidence(baseline, postActivities),
      metadata: {
        measurementPeriod: baseline.period,
        comparisonMethod: 'before-after-analysis',
        statisticalSignificance: this.calculateStatisticalSignificance(
          baseline, 
          postActivities
        ),
        confoundingFactors: ['seasonal-variation', 'workload-changes'],
        dataQuality: {
          completeness: Math.min(postActivities.length / (14 * 5), 1),
          consistency: 0.8,
          recency: 1.0,
          overallScore: 0.85
        },
        externalFactors: []
      }
    };

    return impact;
  }

  private async recordImpact(impact: ImpactMeasurement): Promise<void> {
    const impactKey = `impact:${impact.insightId}`;
    await this.cache.set(impactKey, impact, { ttl: 86400 * 90 });
    
    const historyKey = `impact-history:${impact.userId}`;
    const history = (await this.cache.get(historyKey)) || [];
    history.push(impact);
    await this.cache.set(historyKey, history, { ttl: 86400 * 365 });
  }

  private async updateRecommendationModel(impact: ImpactMeasurement): Promise<void> {
    logger.info('Updating recommendation model with impact data', {
      insightId: impact.insightId
    });
  }

  private getImplementationPeriod(insightId: string): number {
    return 60 * 1000;
  }

  private async getRecentActivities(userId: string, days: number): Promise<Activity[]> {
    return this.patternAnalyzer['getRecentActivities'](userId, days);
  }

  private calculateAverageProductivity(activities: Activity[]): number {
    if (activities.length === 0) return 0;
    
    const successfulActivities = activities.filter(a => 
      !a.metadata.buildDetails || a.metadata.buildDetails.success
    );
    
    return successfulActivities.length / activities.length;
  }

  private analyzeBaselinePatterns(activities: Activity[]): any[] {
    return activities.map(activity => ({
      activityType: activity.type,
      frequency: 1,
      averageDuration: activity.duration,
      averageCarbonFootprint: activity.carbonFootprint,
      consistency: 0.8
    }));
  }

  private async getExpectedReduction(insightId: string): Promise<number> {
    // Get expected reduction from cached insight
    const insightKey = `insight:${insightId}`;
    const insight = await this.cache.get(insightKey);
    return insight?.expectedReduction || 0.1;
  }

  private async measureProductivityImpact(
    baseline: Baseline, 
    postActivities: Activity[]
  ): Promise<ProductivityImpact> {
    const baselineProductivity = baseline.averageProductivity;
    const postProductivity = this.calculateAverageProductivity(postActivities);
    
    const overallChange = ((postProductivity - baselineProductivity) / baselineProductivity) * 100;

    return {
      overallChange,
      buildTimeChange: this.calculateBuildTimeChange(postActivities),
      debugTimeChange: 0,
      codeQualityChange: 0,
      teamCollaborationChange: 0,
      developerSatisfactionChange: 0,
      metrics: [
        {
          name: 'Build Success Rate',
          beforeValue: baselineProductivity,
          afterValue: postProductivity,
          unit: 'percentage',
          changePercentage: overallChange,
          significance: Math.abs(overallChange) > 5 ? 'high' : 'low'
        }
      ]
    };
  }

  private calculateBuildTimeChange(activities: Activity[]): number {
    const buildActivities = activities.filter(a => a.type === 'build');
    if (buildActivities.length === 0) return 0;
    
    const avgBuildTime = buildActivities.reduce((sum, a) => sum + a.duration, 0) / buildActivities.length;
    const baselineBuildTime = 300;
    
    return ((baselineBuildTime - avgBuildTime) / baselineBuildTime) * 100;
  }

  private async getUserSatisfaction(userId: string, insightId: string): Promise<UserSatisfaction | null> {
    const feedbackKey = `feedback:${insightId}`;
    const feedback = await this.cache.get(feedbackKey);
    return feedback?.satisfaction || null;
  }

  private getDefaultSatisfaction(): UserSatisfaction {
    return {
      overallRating: 3,
      easeOfImplementation: 3,
      effectivenessRating: 3,
      willingnessToRecommend: 3,
      feedback: {
        positiveAspects: [],
        negativeAspects: [],
        suggestions: [],
        additionalComments: '',
        wouldImplementAgain: true
      },
      surveyDate: new Date()
    };
  }

  private determineImplementationStatus(
    actualReduction: number,
    expectedReduction: number
  ): ImplementationStatus {
    const achievementRatio = actualReduction / expectedReduction;
    
    if (achievementRatio >= 0.8) return 'implemented';
    if (achievementRatio >= 0.3) return 'partially-implemented';
    return 'abandoned';
  }

  private calculateTimeToImplement(insightId: string): number {
    // Simplified calculation - in reality would track actual implementation time
    return 2; // 2 hours average
  }

  private calculateMeasurementConfidence(baseline: Baseline, postActivities: Activity[]): number {
    const dataQualityScore = Math.min(postActivities.length / 14, 1);
    const consistencyScore = 0.8;
    
    return (dataQualityScore + consistencyScore) / 2;
  }

  private calculateStatisticalSignificance(baseline: Baseline, postActivities: Activity[]): number {
    const sampleSize = postActivities.length;
    const effectSize = Math.abs(baseline.averageCarbon - 
      (postActivities.reduce((sum, a) => sum + a.carbonFootprint, 0) / postActivities.length));
    
    if (effectSize > 0.5 && sampleSize > 10) return 0.01;
    if (effectSize > 0.2 && sampleSize > 7) return 0.05;
    return 0.15;
  }

  private async updateImpactWithFeedback(insightId: string, satisfaction: UserSatisfaction): Promise<void> {
    const impactKey = `impact:${insightId}`;
    const impact = await this.cache.get(impactKey);
    
    if (impact) {
      impact.userSatisfaction = satisfaction;
      await this.cache.set(impactKey, impact, { ttl: 86400 * 90 });
    }
  }

  private async getImpactMeasurementsForPeriod(userId: string, period: any): Promise<ImpactMeasurement[]> {
    const historyKey = `impact-history:${userId}`;
    const history = (await this.cache.get(historyKey)) || [];
    
    return history.filter((impact: ImpactMeasurement) => 
      impact.measuredAt >= period.startDate && impact.measuredAt <= period.endDate
    );
  }

  private async identifyTopInsights(measurements: ImpactMeasurement[]): Promise<any[]> {
    return measurements
      .sort((a, b) => b.actualReduction - a.actualReduction)
      .slice(0, 5)
      .map(impact => ({
        insightId: impact.insightId,
        title: `Insight ${impact.insightId}`,
        carbonReduction: impact.actualReduction,
        productivityImpact: impact.productivityImpact.overallChange,
        implementationEffort: impact.timeToImplement,
        roi: impact.actualReduction / impact.timeToImplement,
        userSatisfaction: impact.userSatisfaction.overallRating
      }));
  }

  private async analyzeTrends(userId: string, period: any): Promise<any[]> {
    return [
      {
        metric: 'Carbon Reduction',
        direction: 'improving' as const,
        rate: 15,
        confidence: 0.8,
        projectedNextMonth: 2.5
      },
      {
        metric: 'Implementation Success',
        direction: 'stable' as const,
        rate: 0,
        confidence: 0.9,
        projectedNextMonth: 75
      }
    ];
  }

  private async generateFutureRecommendations(
    userId: string, 
    measurements: ImpactMeasurement[]
  ): Promise<any[]> {
    return [
      {
        type: 'optimization',
        description: 'Focus on timing optimizations for highest ROI',
        expectedBenefit: 0.8,
        confidence: 0.85,
        timeframe: 'next month'
      },
      {
        type: 'expansion',
        description: 'Explore infrastructure optimizations for larger impact',
        expectedBenefit: 1.5,
        confidence: 0.7,
        timeframe: 'next quarter'
      }
    ];
  }

  private async generateImpactSummary(
    userId: string, 
    totalReduction: number,
    measurements: ImpactMeasurement[]
  ): Promise<any> {
    return {
      totalCarbonSaved: totalReduction,
      equivalentTrees: Math.round(totalReduction * 50),
      equivalentCars: Math.round(totalReduction / 4),
      monetaryValue: totalReduction * 50,
      rank: {
        percentile: 75,
        category: 'intermediate' as const,
        pointsToNextLevel: 100,
        currentStreak: 7
      },
      achievements: [
        {
          id: 'first-insight',
          name: 'First Steps',
          description: 'Implemented your first carbon optimization',
          iconUrl: '/achievements/first-steps.png',
          unlockedAt: new Date(),
          category: 'implementation' as const,
          rarity: 'common' as const
        }
      ]
    };
  }
}