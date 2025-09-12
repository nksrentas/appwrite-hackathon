import { logger } from '@shared/utils/logger';
import { 
  DevelopmentPattern,
  Activity,
  HighCarbonPattern,
  BuildFrequencyPattern,
  PeakHoursPattern,
  ToolUsagePattern,
  GeographicPattern,
  WorkingHabitPattern,
  CollaborationPattern
} from '@features/carbon-insights/types';
import { CacheService } from '@shared/utils/cache';

export class PatternAnalyzerService {
  private static instance: PatternAnalyzerService;
  private cache: CacheService;

  private constructor() {
    this.cache = new CacheService();
  }

  public static getInstance(): PatternAnalyzerService {
    if (!PatternAnalyzerService.instance) {
      PatternAnalyzerService.instance = new PatternAnalyzerService();
    }
    return PatternAnalyzerService.instance;
  }

  async analyzeUserPatterns(userId: string, days: number = 30): Promise<DevelopmentPattern> {
    try {
      logger.info('Analyzing user patterns', { userId, days });

      const cacheKey = `patterns:${userId}:${days}d`;
      const cachedPattern = await this.cache.get(cacheKey);
      if (cachedPattern) {
        logger.info('Returning cached pattern analysis', { userId });
        return cachedPattern;
      }

      const activities = await this.getRecentActivities(userId, days);
      
      if (activities.length === 0) {
        logger.warn('No activities found for user pattern analysis', { userId });
        return this.getDefaultPattern(userId);
      }

      const [
        buildFrequency,
        peakHours,
        toolUsage,
        geographicPatterns,
        carbonIntensivePatterns,
        workingHabitPatterns,
        collaborationPatterns
      ] = await Promise.all([
        this.calculateBuildFrequency(activities),
        this.identifyPeakWorkingHours(activities),
        this.analyzeToolUsage(activities),
        this.analyzeLocationPatterns(activities),
        this.identifyHighCarbonActivities(activities),
        this.analyzeWorkingHabits(activities),
        this.analyzeCollaborationPatterns(activities)
      ]);

      const pattern: DevelopmentPattern = {
        userId,
        timeframe: {
          startDate: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
          endDate: new Date(),
          daysCovered: days,
          dataQuality: this.assessDataQuality(activities, days)
        },
        buildFrequency,
        peakHours,
        toolUsage,
        geographicPatterns,
        carbonIntensivePatterns,
        workingHabitPatterns,
        collaborationPatterns,
        lastAnalyzed: new Date()
      };

      await this.cache.set(cacheKey, pattern, { ttl: 7200 });

      logger.info('Pattern analysis completed', { 
        userId, 
 
      });

      return pattern;
    } catch (error) {
      logger.error('Failed to analyze user patterns', { userId, error: error.message });
      throw new Error(`Pattern analysis failed for user ${userId}: ${error.message}`);
    }
  }

  private async calculateBuildFrequency(activities: Activity[]): Promise<BuildFrequencyPattern> {
    const buildActivities = activities.filter(a => a.type === 'build');
    
    if (buildActivities.length === 0) {
      return this.getDefaultBuildFrequency();
    }

    const buildsByDay = this.groupActivitiesByDay(buildActivities);
    const dailyCounts = Object.values(buildsByDay).map(builds => builds.length);
    
    const averageBuildsPerDay = dailyCounts.reduce((sum, count) => sum + count, 0) / dailyCounts.length;
    const buildDurations = buildActivities.map(b => b.duration);
    
    const maxBuilds = Math.max(...dailyCounts);
    const peakBuildDays = Object.entries(buildsByDay)
      .filter(([_, builds]) => builds.length >= maxBuilds * 0.8)
      .map(([day, _]) => this.getDayOfWeek(new Date(day)));

    const buildTypeDistribution = this.analyzeBuildTypes(buildActivities);
    const failureRate = this.calculateFailureRate(buildActivities);
    const retryPatterns = this.analyzeRetryPatterns(buildActivities);

    return {
      averageBuildsPerDay,
      peakBuildDays: Array.from(new Set(peakBuildDays)),
      buildDurationDistribution: {
        mean: buildDurations.reduce((sum, d) => sum + d, 0) / buildDurations.length,
        median: this.calculateMedian(buildDurations),
        p95: this.calculatePercentile(buildDurations, 95),
        p99: this.calculatePercentile(buildDurations, 99),
        standardDeviation: this.calculateStandardDeviation(buildDurations)
      },
      buildTypeDistribution,
      failureRate,
      retryPatterns
    };
  }

  private async identifyPeakWorkingHours(activities: Activity[]): Promise<PeakHoursPattern> {
    if (activities.length === 0) {
      return this.getDefaultPeakHours();
    }

    const activityByHour = new Map<number, Activity[]>();
    
    for (const activity of activities) {
      const hour = activity.timestamp.getHours();
      if (!activityByHour.has(hour)) {
        activityByHour.set(hour, []);
      }
      activityByHour.get(hour)!.push(activity);
    }

    const hourRanges = Array.from(activityByHour.entries()).map(([hour, hourActivities]) => {
      const intensity = hourActivities.length / activities.length;
      const avgCarbonFootprint = hourActivities.reduce((sum, a) => sum + a.carbonFootprint, 0) / hourActivities.length;
      
      return {
        start: hour,
        end: (hour + 1) % 24,
        intensity,
        carbonEfficiency: 1 / (avgCarbonFootprint + 0.001) // Invert so lower carbon = higher efficiency
      };
    });

    const primaryWorkingHours = hourRanges
      .sort((a, b) => b.intensity - a.intensity)
      .slice(0, 8);

    const weekdayPattern = this.analyzeWeekdayPatterns(activities);

    const consistencyScore = this.calculateWorkingHoursConsistency(activities);

    return {
      primaryWorkingHours,
      timezone: 'UTC',
      weekdayPattern,
      seasonalVariation: false,
      consistencyScore
    };
  }

  private async analyzeToolUsage(activities: Activity[]): Promise<ToolUsagePattern> {
    const toolUsageMap = new Map<string, { hours: number; carbonFootprint: number }>();
    const languageUsage = new Map<string, number>();
    const frameworkUsage = new Map<string, number>();

    for (const activity of activities) {
      if (activity.metadata.toolsUsed) {
        for (const tool of activity.metadata.toolsUsed) {
          if (!toolUsageMap.has(tool)) {
            toolUsageMap.set(tool, { hours: 0, carbonFootprint: 0 });
          }
          const usage = toolUsageMap.get(tool)!;
          usage.hours += activity.duration / 60; // Convert minutes to hours
          usage.carbonFootprint += activity.carbonFootprint;
        }
      }

      if (activity.metadata.languagesUsed) {
        for (const language of activity.metadata.languagesUsed) {
          languageUsage.set(language, (languageUsage.get(language) || 0) + activity.duration);
        }
      }
    }

    const primaryTools = Array.from(toolUsageMap.entries()).map(([toolName, usage]) => ({
      toolName,
      usageHours: usage.hours,
      carbonFootprintPerHour: usage.carbonFootprint / usage.hours,
      efficiencyScore: this.calculateToolEfficiencyScore(toolName, usage),
      alternatives: this.getToolAlternatives(toolName)
    })).sort((a, b) => b.usageHours - a.usageHours);

    const totalActivityTime = activities.reduce((sum, a) => sum + a.duration, 0);
    const languageDistribution = Object.fromEntries(
      Array.from(languageUsage.entries()).map(([lang, time]) => [lang, time / totalActivityTime])
    );

    const frameworkDistribution = Object.fromEntries(
      Array.from(frameworkUsage.entries()).map(([fw, time]) => [fw, time / totalActivityTime])
    );

    const cicdPatterns = this.analyzeCICDPatterns(activities);

    const localVsRemoteRatio = this.calculateLocalVsRemoteRatio(activities);

    return {
      primaryTools,
      languageDistribution,
      frameworkUsage: frameworkDistribution,
      frameworkDistribution,
      cicdPatterns,
      localVsRemoteRatio
    };
  }

  private async analyzeLocationPatterns(activities: Activity[]): Promise<GeographicPattern[]> {
    const locationGroups = new Map<string, Activity[]>();
    
    for (const activity of activities) {
      const locationKey = `${activity.location.latitude},${activity.location.longitude}`;
      if (!locationGroups.has(locationKey)) {
        locationGroups.set(locationKey, []);
      }
      locationGroups.get(locationKey)!.push(activity);
    }

    const patterns: GeographicPattern[] = [];
    
    for (const [locationKey, locationActivities] of locationGroups) {
      const location = locationActivities[0].location;
      const timeSpent = locationActivities.reduce((sum, a) => sum + a.duration, 0) / 60; // Convert to hours
      const carbonIntensity = locationActivities.reduce((sum, a) => sum + a.carbonFootprint, 0) / locationActivities.length;
      
      patterns.push({
        location,
        timeSpent,
        carbonIntensityDuringWork: carbonIntensity,
        travelPatterns: [],
        remoteWorkEfficiency: this.calculateRemoteWorkEfficiency(locationActivities)
      });
    }

    return patterns.sort((a, b) => b.timeSpent - a.timeSpent);
  }

  private identifyHighCarbonActivities(activities: Activity[]): HighCarbonPattern[] {
    const carbonFootprints = activities.map(a => a.carbonFootprint).sort((a, b) => b - a);
    const threshold = carbonFootprints[Math.floor(carbonFootprints.length * 0.2)];
    
    const highCarbonActivities = activities.filter(a => a.carbonFootprint >= threshold);
    
    const patternGroups = this.groupSimilarPatterns(highCarbonActivities);
    
    return patternGroups.map(group => ({
      pattern: {
        type: group.type,
        description: group.description,
        triggers: group.triggers,
        duration: group.averageDuration,
        complexity: group.complexity
      },
      carbonFootprint: group.averageCarbon,
      frequency: group.frequency,
      context: {
        timeOfDay: group.timeOfDay,
        dayOfWeek: group.dayOfWeek,
        gridCarbonIntensity: group.gridCarbonIntensity,
        userProductivity: group.userProductivity,
        teamCollaboration: group.teamCollaboration
      },
      optimizationOpportunities: this.identifyOptimizationOpportunities(group)
    }));
  }

  private async analyzeWorkingHabits(activities: Activity[]): Promise<WorkingHabitPattern> {
    const focusTimePatterns = this.identifyFocusTimePatterns(activities);
    
    const interruptionFrequency = this.calculateInterruptionFrequency(activities);
    
    const multitaskingRatio = this.calculateMultitaskingRatio(activities);
    
    const deepWorkSessions = this.identifyDeepWorkSessions(activities);
    
    const energyLevels = this.analyzeEnergyLevels(activities);

    return {
      focusTimePatterns,
      interruptionFrequency,
      multitaskingRatio,
      deepWorkSessions,
      energyLevels
    };
  }

  private async analyzeCollaborationPatterns(activities: Activity[]): Promise<CollaborationPattern> {
    const meetingActivities = activities.filter(a => a.type === 'meeting');
    const meetingFrequency = meetingActivities.length / 30; // per day over 30 days
    const averageMeetingDuration = meetingActivities.reduce((sum, a) => sum + a.duration, 0) / meetingActivities.length || 0;

    const collaborativeActivities = activities.filter(a => a.metadata.collaborators && a.metadata.collaborators.length > 0);
    const pairProgrammingHours = collaborativeActivities
      .filter(a => a.type === 'code')
      .reduce((sum, a) => sum + a.duration, 0) / 60;

    return {
      meetingFrequency,
      averageMeetingDuration,
      remoteVsInPersonRatio: 0.8,
      pairProgrammingHours: pairProgrammingHours / 4,
      asyncCommunicationRatio: 0.6,
      teamSizePreference: this.calculateAverageTeamSize(activities)
    };
  }

  private async getRecentActivities(userId: string, days: number): Promise<Activity[]> {
    const mockActivities: Activity[] = [];
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    for (let i = 0; i < days * 10; i++) {
      const timestamp = new Date(startDate.getTime() + Math.random() * days * 24 * 60 * 60 * 1000);
      
      mockActivities.push({
        id: `activity-${i}`,
        userId,
        type: ['build', 'test', 'code', 'meeting'][Math.floor(Math.random() * 4)] as any,
        timestamp,
        duration: 30 + Math.random() * 120,
        carbonFootprint: Math.random() * 2,
        location: {
          latitude: 37.7749 + (Math.random() - 0.5) * 0.1,
          longitude: -122.4194 + (Math.random() - 0.5) * 0.1,
          country: 'US',
          timezone: 'America/Los_Angeles'
        },
        metadata: {
          toolsUsed: ['VSCode', 'Docker', 'Node.js'].slice(0, Math.floor(Math.random() * 3) + 1),
          languagesUsed: ['TypeScript', 'JavaScript'].slice(0, Math.floor(Math.random() * 2) + 1),
          projectContext: 'EcoTrace',
          buildDetails: {
            buildType: 'CI',
            success: Math.random() > 0.1,
            testsRun: Math.floor(Math.random() * 100),
            testsPassed: Math.floor(Math.random() * 95),
            cacheHit: Math.random() > 0.3,
            parallelJobs: Math.floor(Math.random() * 4) + 1,
            resourceUsage: {
              cpu: Math.random() * 100,
              memory: Math.random() * 8000,
              storage: Math.random() * 1000,
              network: Math.random() * 500
            }
          }
        }
      });
    }
    
    return mockActivities;
  }

  private getDefaultPattern(userId: string): DevelopmentPattern {
    return {
      userId,
      timeframe: {
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: new Date(),
        daysCovered: 30,
        dataQuality: {
          completeness: 0,
          consistency: 0,
          recency: 0,
          overallScore: 0
        }
      },
      buildFrequency: this.getDefaultBuildFrequency(),
      peakHours: this.getDefaultPeakHours(),
      toolUsage: {
        primaryTools: [],
        languageDistribution: {},
        frameworkUsage: {},
        frameworkDistribution: {},
        cicdPatterns: [],
        localVsRemoteRatio: 0.5
      },
      geographicPatterns: [],
      carbonIntensivePatterns: [],
      workingHabitPatterns: {
        focusTimePatterns: [],
        interruptionFrequency: 0,
        multitaskingRatio: 0,
        deepWorkSessions: [],
        energyLevels: []
      },
      collaborationPatterns: {
        meetingFrequency: 0,
        averageMeetingDuration: 0,
        remoteVsInPersonRatio: 0.5,
        pairProgrammingHours: 0,
        asyncCommunicationRatio: 0.5,
        teamSizePreference: 5
      },
      lastAnalyzed: new Date()
    };
  }

  private getDefaultBuildFrequency(): BuildFrequencyPattern {
    return {
      averageBuildsPerDay: 5,
      peakBuildDays: ['Tuesday', 'Wednesday', 'Thursday'],
      buildDurationDistribution: {
        mean: 300,
        median: 180,
        p95: 600,
        p99: 1200,
        standardDeviation: 200
      },
      buildTypeDistribution: { 'CI': 0.7, 'Local': 0.3 },
      failureRate: 0.1,
      retryPatterns: [{ averageRetries: 1.2, timeToRetry: 5, successRateAfterRetry: 0.8 }]
    };
  }

  private getDefaultPeakHours(): PeakHoursPattern {
    return {
      primaryWorkingHours: [
        { start: 9, end: 12, intensity: 0.8, carbonEfficiency: 0.7 },
        { start: 13, end: 17, intensity: 0.9, carbonEfficiency: 0.8 }
      ],
      timezone: 'UTC',
      weekdayPattern: [
        { day: 'Monday', activityLevel: 0.8, averageHours: 7, carbonIntensity: 0.5 },
        { day: 'Tuesday', activityLevel: 0.9, averageHours: 8, carbonIntensity: 0.4 },
        { day: 'Wednesday', activityLevel: 0.9, averageHours: 8, carbonIntensity: 0.4 },
        { day: 'Thursday', activityLevel: 0.8, averageHours: 7, carbonIntensity: 0.5 },
        { day: 'Friday', activityLevel: 0.7, averageHours: 6, carbonIntensity: 0.6 }
      ],
      seasonalVariation: false,
      consistencyScore: 0.7
    };
  }

  private assessDataQuality(activities: Activity[], expectedDays: number): any {
    const completeness = Math.min(activities.length / (expectedDays * 10), 1);
    return {
      completeness,
      consistency: 0.8,
      recency: 1.0,
      overallScore: completeness * 0.8 + 0.8 * 0.1 + 1.0 * 0.1
    };
  }

  private groupActivitiesByDay(activities: Activity[]): Record<string, Activity[]> {
    const groups: Record<string, Activity[]> = {};
    for (const activity of activities) {
      const day = activity.timestamp.toISOString().split('T')[0];
      if (!groups[day]) groups[day] = [];
      groups[day].push(activity);
    }
    return groups;
  }

  private getDayOfWeek(date: Date): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()];
  }

  private calculateMedian(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  }

  private calculatePercentile(values: number[], percentile: number): number {
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  private calculateStandardDeviation(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  private analyzeBuildTypes(activities: Activity[]): Record<string, number> {
    return { 'CI': 0.7, 'Local': 0.2, 'Deploy': 0.1 };
  }

  private calculateFailureRate(activities: Activity[]): number {
    const builds = activities.filter(a => a.metadata.buildDetails);
    if (builds.length === 0) return 0;
    const failures = builds.filter(a => !a.metadata.buildDetails?.success);
    return failures.length / builds.length;
  }

  private analyzeRetryPatterns(activities: Activity[]): any[] {
    return [{ averageRetries: 1.3, timeToRetry: 8, successRateAfterRetry: 0.75 }];
  }

  private analyzeWeekdayPatterns(activities: Activity[]): any[] {
    return [];
  }

  private calculateWorkingHoursConsistency(activities: Activity[]): number {
    return 0.75;
  }

  private calculateToolEfficiencyScore(toolName: string, usage: any): number {
    const avgCarbonPerHour = usage.carbonFootprint / usage.hours;
    return Math.max(0, 1 - avgCarbonPerHour / 2);
  }

  private getToolAlternatives(toolName: string): any[] {
    const alternatives: Record<string, any[]> = {
      'VSCode': [
        { name: 'Vim', carbonReduction: 30, effortToSwitch: 'high' as const, featureComparison: 'Lightweight but learning curve' }
      ],
      'Docker': [
        { name: 'Podman', carbonReduction: 15, effortToSwitch: 'medium' as const, featureComparison: 'Similar functionality, lower overhead' }
      ]
    };
    return alternatives[toolName] || [];
  }

  private analyzeCICDPatterns(activities: Activity[]): any[] {
    const cicdActivities = activities.filter(a => 
      a.type === 'build' || a.type === 'test' || a.type === 'deploy'
    );

    if (cicdActivities.length === 0) return [];

    return [{
      platform: 'GitHub Actions',
      averageBuildsPerCommit: 2.5,
      parallelization: 1.8,
      cacheHitRatio: 0.65,
      testCoverage: 80,
      deploymentFrequency: 'daily'
    }];
  }

  private calculateLocalVsRemoteRatio(activities: Activity[]): number {
    return 0.7;
  }

  private calculateRemoteWorkEfficiency(activities: Activity[]): number {
    return 0.8;
  }

  private groupSimilarPatterns(activities: Activity[]): any[] {
    const groups = new Map();
    
    for (const activity of activities) {
      const key = `${activity.type}-${Math.floor(activity.duration / 60)}h-${Math.floor(activity.carbonFootprint)}kg`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key).push(activity);
    }

    return Array.from(groups.entries()).map(([key, groupActivities]) => ({
      type: groupActivities[0].type,
      description: `High carbon ${groupActivities[0].type} activities`,
      triggers: ['Manual execution', 'Automated pipeline'],
      averageDuration: groupActivities.reduce((sum: number, a: Activity) => sum + a.duration, 0) / groupActivities.length,
      complexity: Math.min(10, Math.max(1, Math.floor(groupActivities.length / 2))),
      averageCarbon: groupActivities.reduce((sum: number, a: Activity) => sum + a.carbonFootprint, 0) / groupActivities.length,
      frequency: groupActivities.length / 7,
      timeOfDay: groupActivities.map((a: Activity) => a.timestamp.getHours()),
      dayOfWeek: groupActivities.map((a: Activity) => this.getDayOfWeek(a.timestamp)),
      gridCarbonIntensity: 0.4,
      userProductivity: 0.7,
      teamCollaboration: false
    }));
  }

  private identifyOptimizationOpportunities(group: any): any[] {
    return [
      {
        description: `Optimize ${group.type} timing for lower carbon intensity`,
        expectedReduction: 25,
        implementationEffort: 'low' as const,
        riskLevel: 'low' as const,
        dependencies: ['Scheduling flexibility']
      },
      {
        description: 'Implement caching to reduce repeated operations',
        expectedReduction: 40,
        implementationEffort: 'medium' as const,
        riskLevel: 'low' as const,
        dependencies: ['Cache infrastructure']
      }
    ];
  }

  private identifyFocusTimePatterns(activities: Activity[]): any[] {
    return [];
  }

  private calculateInterruptionFrequency(activities: Activity[]): number {
    return 2.3;
  }

  private calculateMultitaskingRatio(activities: Activity[]): number {
    return 0.3;
  }

  private identifyDeepWorkSessions(activities: Activity[]): any[] {
    return [];
  }

  private analyzeEnergyLevels(activities: Activity[]): any[] {
    return [];
  }

  private calculateAverageTeamSize(activities: Activity[]): number {
    const collaborativeActivities = activities.filter(a => a.metadata.collaborators);
    if (collaborativeActivities.length === 0) return 1;
    
    const totalCollaborators = collaborativeActivities.reduce(
      (sum, a) => sum + (a.metadata.collaborators?.length || 0), 0
    );
    
    return Math.ceil(totalCollaborators / collaborativeActivities.length);
  }
}