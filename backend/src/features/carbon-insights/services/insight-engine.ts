import { logger } from '@shared/utils/logger';
import { 
  CarbonInsight, 
  DevelopmentPattern, 
  UserProfile, 
  GeographicContext,
  InsightType,
  ImplementationComplexity,
  InsightPriority,
  ImplementationStatus,
  ImplementationStep,
  StepType
} from '../types';
import { PatternAnalyzerService } from './pattern-analyzer';
import { GeographicOptimizerService } from './geographic-optimizer';
import { RecommendationModelService } from './recommendation-model';
import { CacheService } from '@shared/utils/cache';

export class InsightEngineService {
  private static instance: InsightEngineService;
  private patternAnalyzer: PatternAnalyzerService;
  private geographicOptimizer: GeographicOptimizerService;
  private mlModel: RecommendationModelService;
  private cache: CacheService;

  private constructor() {
    this.patternAnalyzer = PatternAnalyzerService.getInstance();
    this.geographicOptimizer = GeographicOptimizerService.getInstance();
    this.mlModel = RecommendationModelService.getInstance();
    this.cache = new CacheService();
  }

  public static getInstance(): InsightEngineService {
    if (!InsightEngineService.instance) {
      InsightEngineService.instance = new InsightEngineService();
    }
    return InsightEngineService.instance;
  }

  /**
   * Generate personalized carbon insights for a user
   */
  async generateInsights(userId: string): Promise<CarbonInsight[]> {
    try {
      logger.info('Generating insights for user', { userId });

      // Check cache first
      const cacheKey = `insights:${userId}`;
      const cachedInsights = await this.cache.get(cacheKey);
      if (cachedInsights) {
        logger.info('Returning cached insights', { userId, count: cachedInsights.length });
        return cachedInsights;
      }

      // Get user profile and patterns
      const [userProfile, patterns, geographicContext] = await Promise.all([
        this.getUserProfile(userId),
        this.patternAnalyzer.analyzeUserPatterns(userId),
        this.geographicOptimizer.getGeographicContext(userId)
      ]);

      // Generate insights using multiple approaches
      const [
        timingInsights,
        geographicInsights,
        toolingInsights,
        workflowInsights,
        mlInsights
      ] = await Promise.all([
        this.generateTimingInsights(userProfile, patterns, geographicContext),
        this.generateGeographicInsights(userProfile, patterns, geographicContext),
        this.generateToolingInsights(userProfile, patterns),
        this.generateWorkflowInsights(userProfile, patterns),
        this.mlModel.predict(userProfile, patterns, geographicContext)
      ]);

      // Combine and rank insights
      const allInsights = [
        ...timingInsights,
        ...geographicInsights,
        ...toolingInsights,
        ...workflowInsights,
        ...mlInsights
      ];

      const rankedInsights = this.rankAndFilterInsights(allInsights, userProfile);
      
      // Cache results for 1 hour
      await this.cache.set(cacheKey, rankedInsights, { ttl: 3600 });

      logger.info('Generated insights for user', { 
        userId, 
 
      });

      return rankedInsights;
    } catch (error) {
      logger.error('Failed to generate insights', { userId, error: error.message });
      throw new Error(`Failed to generate insights for user ${userId}: ${error.message}`);
    }
  }

  /**
   * Generate timing-based insights for optimal development scheduling
   */
  private async generateTimingInsights(
    profile: UserProfile,
    patterns: DevelopmentPattern,
    context: GeographicContext
  ): Promise<CarbonInsight[]> {
    const insights: CarbonInsight[] = [];

    // Analyze grid carbon intensity patterns
    const lowCarbonWindows = context.forecast24h
      .filter(f => f.intensity < context.currentCarbonIntensity * 0.7)
      .slice(0, 3); // Top 3 opportunities

    for (const window of lowCarbonWindows) {
      const carbonReduction = this.calculateTimingReduction(patterns, context, window);
      
      if (carbonReduction > 0.1) { // Minimum 100g CO2e reduction
        insights.push(this.createTimingInsight(window, carbonReduction, patterns));
      }
    }

    return insights;
  }

  /**
   * Generate geographic optimization insights
   */
  private async generateGeographicInsights(
    profile: UserProfile,
    patterns: DevelopmentPattern,
    context: GeographicContext
  ): Promise<CarbonInsight[]> {
    return this.geographicOptimizer.generateLocationInsights(profile.userId);
  }

  /**
   * Generate tooling optimization insights
   */
  private async generateToolingInsights(
    profile: UserProfile,
    patterns: DevelopmentPattern
  ): Promise<CarbonInsight[]> {
    const insights: CarbonInsight[] = [];

    // Analyze tool usage efficiency
    for (const tool of patterns.toolUsage.primaryTools) {
      if (tool.efficiencyScore < 0.7) {
        const alternatives = tool.alternatives.filter(alt => 
          alt.carbonReduction > 10 && alt.effortToSwitch !== 'high'
        );

        for (const alternative of alternatives) {
          insights.push(this.createToolingInsight(tool, alternative, patterns));
        }
      }
    }

    // Analyze CI/CD optimization opportunities
    for (const cicd of patterns.toolUsage.cicdPatterns) {
      if (cicd.cacheHitRatio < 0.8) {
        insights.push(this.createCICDCacheInsight(cicd, patterns));
      }

      if (cicd.parallelization < 2 && cicd.averageBuildsPerCommit > 3) {
        insights.push(this.createCICDParallelizationInsight(cicd, patterns));
      }
    }

    return insights;
  }

  /**
   * Generate workflow optimization insights
   */
  private async generateWorkflowInsights(
    profile: UserProfile,
    patterns: DevelopmentPattern
  ): Promise<CarbonInsight[]> {
    const insights: CarbonInsight[] = [];

    // Analyze build frequency patterns
    if (patterns.buildFrequency.averageBuildsPerDay > 20) {
      insights.push(this.createBuildFrequencyInsight(patterns));
    }

    // Analyze working habits for carbon efficiency
    const inefficientPatterns = patterns.carbonIntensivePatterns.filter(
      p => p.optimizationOpportunities.some(o => o.riskLevel === 'low')
    );

    for (const pattern of inefficientPatterns) {
      const lowRiskOpportunities = pattern.optimizationOpportunities.filter(
        o => o.riskLevel === 'low' && o.expectedReduction > 15
      );

      for (const opportunity of lowRiskOpportunities) {
        insights.push(this.createWorkflowInsight(pattern, opportunity));
      }
    }

    return insights;
  }

  /**
   * Create timing-based insight
   */
  private createTimingInsight(
    window: any,
    carbonReduction: number,
    patterns: DevelopmentPattern
  ): CarbonInsight {
    return {
      id: `timing-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId: patterns.userId,
      type: 'timing' as InsightType,
      title: `Schedule builds during low-carbon window`,
      description: `Grid carbon intensity drops by ${Math.round((1 - window.intensity/300) * 100)}% at ${new Date(window.timestamp).toLocaleTimeString()}`,
      expectedReduction: carbonReduction,
      implementationComplexity: 'low' as ImplementationComplexity,
      estimatedTimeToImplement: 0.5,
      prerequisites: ['CI/CD access', 'Scheduling permissions'],
      instructions: this.generateTimingInstructions(window),
      successCriteria: [
        'Builds scheduled during specified time window',
        'Carbon footprint reduced by expected amount',
        'No impact on delivery timelines'
      ],
      confidence: 0.85,
      priority: 'medium' as InsightPriority,
      status: 'generated',
      createdAt: new Date(),
      updatedAt: new Date(),
      validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000), // Valid for 24 hours
      tags: ['timing', 'builds', 'scheduling'],
      metadata: {
        algorithm: 'grid-carbon-optimization-v1',
        dataSourcesUsed: ['electricity-maps', 'user-patterns'],
        trainingDataDate: new Date(),
        temporalRelevance: {
          timeOfDay: [new Date(window.timestamp).getHours().toString()],
          daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
          seasonalPattern: false,
          gridIntensityPattern: true
        }
      }
    };
  }

  /**
   * Create tooling optimization insight
   */
  private createToolingInsight(
    currentTool: any,
    alternative: any,
    patterns: DevelopmentPattern
  ): CarbonInsight {
    return {
      id: `tooling-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId: patterns.userId,
      type: 'tooling' as InsightType,
      title: `Switch from ${currentTool.toolName} to ${alternative.name}`,
      description: `Reduce carbon footprint by ${alternative.carbonReduction}% with ${alternative.name}`,
      expectedReduction: (currentTool.carbonFootprintPerHour * currentTool.usageHours * alternative.carbonReduction) / 100,
      implementationComplexity: alternative.effortToSwitch,
      estimatedTimeToImplement: alternative.effortToSwitch === 'low' ? 1 : alternative.effortToSwitch === 'medium' ? 4 : 8,
      prerequisites: ['Tool access', 'Configuration backup'],
      instructions: this.generateToolingInstructions(currentTool, alternative),
      successCriteria: [
        `${alternative.name} successfully installed and configured`,
        'Existing workflows maintained',
        'Carbon reduction measured and verified'
      ],
      confidence: 0.75,
      priority: alternative.carbonReduction > 25 ? 'high' as InsightPriority : 'medium' as InsightPriority,
      status: 'generated',
      createdAt: new Date(),
      updatedAt: new Date(),
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Valid for 7 days
      tags: ['tooling', 'efficiency', currentTool.toolName.toLowerCase()],
      metadata: {
        algorithm: 'tool-efficiency-analysis-v1',
        dataSourcesUsed: ['tool-carbon-database', 'user-usage-patterns'],
        trainingDataDate: new Date(),
        customFactors: {
          currentTool: currentTool.toolName,
          alternative: alternative.name,
          usageHours: currentTool.usageHours
        }
      }
    };
  }

  /**
   * Generate implementation instructions for timing optimization
   */
  private generateTimingInstructions(window: any): ImplementationStep[] {
    return [
      {
        id: 'timing-1',
        title: 'Review current build schedule',
        description: 'Identify builds that can be delayed to low-carbon windows',
        type: 'configuration' as StepType,
        estimatedTime: 10,
        isOptional: false
      },
      {
        id: 'timing-2',
        title: 'Configure CI/CD scheduling',
        description: 'Set up scheduled builds during optimal time windows',
        type: 'configuration' as StepType,
        estimatedTime: 20,
        isOptional: false,
        code: {
          language: 'yaml',
          code: `# GitHub Actions example\nschedule:\n  - cron: '${this.getCronExpression(window.timestamp)}'`,
          filename: '.github/workflows/build.yml',
          description: 'Schedule builds during low-carbon intensity periods'
        }
      }
    ];
  }

  /**
   * Generate implementation instructions for tooling optimization
   */
  private generateToolingInstructions(currentTool: any, alternative: any): ImplementationStep[] {
    return [
      {
        id: 'tool-1',
        title: 'Backup current configuration',
        description: `Export ${currentTool.toolName} settings and configurations`,
        type: 'configuration' as StepType,
        estimatedTime: 10,
        isOptional: false
      },
      {
        id: 'tool-2',
        title: `Install ${alternative.name}`,
        description: `Download and install ${alternative.name}`,
        type: 'tool-installation' as StepType,
        estimatedTime: 15,
        isOptional: false
      },
      {
        id: 'tool-3',
        title: 'Migrate configuration',
        description: `Transfer settings from ${currentTool.toolName} to ${alternative.name}`,
        type: 'configuration' as StepType,
        estimatedTime: 30,
        isOptional: false
      }
    ];
  }

  /**
   * Calculate carbon reduction potential from timing optimization
   */
  private calculateTimingReduction(
    patterns: DevelopmentPattern,
    context: GeographicContext,
    window: any
  ): number {
    const dailyBuildCarbon = patterns.buildFrequency.averageBuildsPerDay * 0.5; // Assume 0.5kg per build
    const reductionFactor = 1 - (window.intensity / context.currentCarbonIntensity);
    return dailyBuildCarbon * reductionFactor;
  }

  /**
   * Rank and filter insights based on user profile and preferences
   */
  private rankAndFilterInsights(
    insights: CarbonInsight[],
    profile: UserProfile
  ): CarbonInsight[] {
    // Filter by complexity preference
    let filtered = insights.filter(insight => {
      if (profile.preferences.complexityPreference === 'simple') {
        return insight.implementationComplexity === 'low';
      } else if (profile.preferences.complexityPreference === 'moderate') {
        return insight.implementationComplexity !== 'high';
      }
      return true;
    });

    // Calculate ranking score
    filtered = filtered.map(insight => ({
      ...insight,
      rankingScore: this.calculateRankingScore(insight, profile)
    }));

    // Sort by ranking score and return top 10
    return filtered
      .sort((a, b) => (b as any).rankingScore - (a as any).rankingScore)
      .slice(0, 10);
  }

  /**
   * Calculate ranking score for insight prioritization
   */
  private calculateRankingScore(insight: CarbonInsight, profile: UserProfile): number {
    let score = 0;

    // Carbon reduction potential (0-40 points)
    score += Math.min(insight.expectedReduction * 10, 40);

    // Implementation ease (0-30 points)
    const complexityScore = {
      'low': 30,
      'medium': 20,
      'high': 10
    }[insight.implementationComplexity];
    score += complexityScore;

    // Confidence (0-20 points)
    score += insight.confidence * 20;

    // User sustainability goals alignment (0-10 points)
    const goalAlignment = this.calculateGoalAlignment(insight, profile);
    score += goalAlignment * 10;

    return score;
  }

  /**
   * Calculate how well an insight aligns with user's sustainability goals
   */
  private calculateGoalAlignment(insight: CarbonInsight, profile: UserProfile): number {
    if (!profile.sustainabilityGoals) return 0.5;

    const dailyTarget = profile.sustainabilityGoals.monthlyReductionTarget / 30;
    const alignmentScore = Math.min(insight.expectedReduction / dailyTarget, 1);
    
    return alignmentScore;
  }

  /**
   * Get user profile (placeholder - should integrate with user service)
   */
  private async getUserProfile(userId: string): Promise<UserProfile> {
    // TODO: Integrate with actual user service
    return {
      userId,
      location: {
        latitude: 37.7749,
        longitude: -122.4194,
        city: 'San Francisco',
        country: 'US',
        timezone: 'America/Los_Angeles'
      },
      timezone: 'America/Los_Angeles',
      experienceLevel: 'mid',
      primaryLanguages: ['TypeScript', 'Python'],
      primaryFrameworks: ['React', 'Node.js'],
      teamSize: 5,
      workStyle: 'collaborative',
      environmentPreference: 'hybrid',
      sustainabilityGoals: {
        annualReductionTarget: 100,
        monthlyReductionTarget: 8.33,
        priorities: [
          { category: 'builds', importance: 5, currentPerformance: 3, improvementGoal: 50 }
        ],
        tradeOffTolerance: {
          productivityForCarbon: 0.2,
          convenienceForCarbon: 0.3,
          costForCarbon: 0.1
        }
      },
      preferences: {
        notificationFrequency: 'daily',
        complexityPreference: 'moderate',
        implementationStyle: 'gradual',
        feedbackVerbosity: 'standard',
        privacyLevel: 'aggregated'
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Create CI/CD cache optimization insight
   */
  private createCICDCacheInsight(cicd: any, patterns: DevelopmentPattern): CarbonInsight {
    return {
      id: `cicd-cache-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId: patterns.userId,
      type: 'tooling',
      title: `Optimize ${cicd.platform} build caching`,
      description: `Improve cache hit ratio from ${Math.round(cicd.cacheHitRatio * 100)}% to 80%+`,
      expectedReduction: this.calculateCacheOptimizationReduction(cicd, patterns),
      implementationComplexity: 'medium',
      estimatedTimeToImplement: 2,
      prerequisites: ['CI/CD admin access', 'Build configuration knowledge'],
      instructions: [
        {
          id: 'cache-1',
          title: 'Analyze current cache usage',
          description: 'Review build logs to identify cache misses',
          type: 'configuration' as StepType,
          estimatedTime: 30,
          isOptional: false
        },
        {
          id: 'cache-2',
          title: 'Implement cache optimization',
          description: 'Add effective caching strategies',
          type: 'code-change',
          estimatedTime: 90,
          isOptional: false
        }
      ],
      successCriteria: [
        'Cache hit ratio improved to 80%+',
        'Build time reduced by 30%+',
        'Carbon footprint reduced by expected amount'
      ],
      confidence: 0.8,
      priority: 'high',
      status: 'generated',
      createdAt: new Date(),
      updatedAt: new Date(),
      validUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      tags: ['cicd', 'caching', cicd.platform.toLowerCase()],
      metadata: {
        algorithm: 'cicd-optimization-v1',
        dataSourcesUsed: ['build-patterns', 'cache-analytics'],
        trainingDataDate: new Date()
      }
    };
  }

  /**
   * Create CI/CD parallelization insight
   */
  private createCICDParallelizationInsight(cicd: any, patterns: DevelopmentPattern): CarbonInsight {
    return {
      id: `cicd-parallel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId: patterns.userId,
      type: 'tooling',
      title: `Enable build parallelization on ${cicd.platform}`,
      description: `Reduce build time by running ${Math.max(2, Math.min(4, cicd.averageBuildsPerCommit))} parallel jobs`,
      expectedReduction: this.calculateParallelizationReduction(cicd, patterns),
      implementationComplexity: 'medium',
      estimatedTimeToImplement: 1.5,
      prerequisites: ['CI/CD admin access', 'Build parallelization support'],
      instructions: [
        {
          id: 'parallel-1',
          title: 'Enable parallel execution',
          description: 'Configure CI/CD for parallel job execution',
          type: 'configuration' as StepType,
          estimatedTime: 45,
          isOptional: false
        },
        {
          id: 'parallel-2',
          title: 'Test parallel builds',
          description: 'Verify builds work correctly in parallel',
          type: 'validation',
          estimatedTime: 45,
          isOptional: false
        }
      ],
      successCriteria: [
        'Parallel builds configured and working',
        'Build time reduced proportionally',
        'No test failures introduced'
      ],
      confidence: 0.75,
      priority: 'medium',
      status: 'generated',
      createdAt: new Date(),
      updatedAt: new Date(),
      validUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      tags: ['cicd', 'parallelization', cicd.platform.toLowerCase()],
      metadata: {
        algorithm: 'cicd-optimization-v1',
        dataSourcesUsed: ['build-patterns', 'performance-metrics'],
        trainingDataDate: new Date()
      }
    };
  }

  /**
   * Create build frequency optimization insight
   */
  private createBuildFrequencyInsight(patterns: DevelopmentPattern): CarbonInsight {
    return {
      id: `build-freq-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId: patterns.userId,
      type: 'workflow',
      title: 'Optimize build frequency',
      description: `Reduce from ${patterns.buildFrequency.averageBuildsPerDay} to 10-15 builds per day`,
      expectedReduction: (patterns.buildFrequency.averageBuildsPerDay - 12) * 0.5,
      implementationComplexity: 'low',
      estimatedTimeToImplement: 1,
      prerequisites: ['Development workflow review', 'Team coordination'],
      instructions: [
        {
          id: 'freq-1',
          title: 'Implement pre-commit hooks',
          description: 'Add local testing before commits',
          type: 'code-change',
          estimatedTime: 30,
          isOptional: false
        },
        {
          id: 'freq-2',
          title: 'Batch small changes',
          description: 'Group minor changes into single commits',
          type: 'workflow-change',
          estimatedTime: 30,
          isOptional: false
        }
      ],
      successCriteria: [
        'Build frequency reduced to target range',
        'Build success rate maintained or improved',
        'Development velocity not impacted'
      ],
      confidence: 0.7,
      priority: 'medium',
      status: 'generated',
      createdAt: new Date(),
      updatedAt: new Date(),
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      tags: ['workflow', 'builds', 'frequency'],
      metadata: {
        algorithm: 'workflow-optimization-v1',
        dataSourcesUsed: ['build-patterns', 'team-practices'],
        trainingDataDate: new Date()
      }
    };
  }

  /**
   * Create workflow optimization insight from high-carbon pattern
   */
  private createWorkflowInsight(pattern: any, opportunity: any): CarbonInsight {
    return {
      id: `workflow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId: pattern.userId || 'unknown',
      type: 'workflow',
      title: `Optimize ${pattern.pattern.type}`,
      description: opportunity.description,
      expectedReduction: (pattern.carbonFootprint * opportunity.expectedReduction) / 100,
      implementationComplexity: opportunity.implementationEffort,
      estimatedTimeToImplement: opportunity.implementationEffort === 'low' ? 0.5 : 
                                opportunity.implementationEffort === 'medium' ? 2 : 4,
      prerequisites: opportunity.dependencies,
      instructions: [
        {
          id: 'workflow-step-1',
          title: 'Analyze current workflow',
          description: `Review ${pattern.pattern.type} pattern`,
          type: 'configuration' as StepType,
          estimatedTime: 20,
          isOptional: false
        },
        {
          id: 'workflow-step-2',
          title: 'Implement optimization',
          description: opportunity.description,
          type: 'workflow-change',
          estimatedTime: 40,
          isOptional: false
        }
      ],
      successCriteria: [
        'Pattern optimization implemented',
        'Carbon reduction achieved',
        'Workflow efficiency maintained'
      ],
      confidence: 1 - (opportunity.riskLevel === 'low' ? 0.1 : 0.3),
      priority: opportunity.expectedReduction > 25 ? 'high' : 'medium',
      status: 'generated',
      createdAt: new Date(),
      updatedAt: new Date(),
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      tags: ['workflow', 'pattern', pattern.pattern.type],
      metadata: {
        algorithm: 'pattern-optimization-v1',
        dataSourcesUsed: ['user-patterns', 'optimization-database'],
        trainingDataDate: new Date()
      }
    };
  }

  /**
   * Helper methods for calculations
   */
  private calculateCacheOptimizationReduction(cicd: any, patterns: DevelopmentPattern): number {
    const currentWaste = patterns.buildFrequency.averageBuildsPerDay * (1 - cicd.cacheHitRatio) * 0.3;
    const targetCacheRate = 0.8;
    const improvement = targetCacheRate - cicd.cacheHitRatio;
    return currentWaste * (improvement / (1 - cicd.cacheHitRatio));
  }

  private calculateParallelizationReduction(cicd: any, patterns: DevelopmentPattern): number {
    const buildTime = patterns.buildFrequency.buildDurationDistribution.mean;
    const parallelFactor = Math.max(2, Math.min(4, cicd.averageBuildsPerCommit));
    const timeReduction = buildTime * (1 - 1/parallelFactor);
    return (timeReduction / 60) * 0.1; // Assume 0.1kg CO2e per minute saved
  }

  private getCronExpression(timestamp: string): string {
    const date = new Date(timestamp);
    const minute = date.getMinutes();
    const hour = date.getHours();
    return `${minute} ${hour} * * *`;
  }
}