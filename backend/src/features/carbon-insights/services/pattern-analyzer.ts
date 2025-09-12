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
} from '../types';
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

  /**
   * Analyze user patterns over the specified timeframe
   */
  async analyzeUserPatterns(userId: string, days: number = 30): Promise<DevelopmentPattern> {
    try {
      logger.info('Analyzing user patterns', { userId, days });

      // Check cache first
      const cacheKey = `patterns:${userId}:${days}d`;
      const cachedPattern = await this.cache.get(cacheKey);
      if (cachedPattern) {
        logger.info('Returning cached pattern analysis', { userId });
        return cachedPattern;
      }

      // Get activity data
      const activities = await this.getRecentActivities(userId, days);
      
      if (activities.length === 0) {
        logger.warn('No activities found for user pattern analysis', { userId });
        return this.getDefaultPattern(userId);
      }

      // Analyze different aspects of user behavior
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

      // Cache for 2 hours
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

  /**
   * Calculate build frequency patterns
   */
  private async calculateBuildFrequency(activities: Activity[]): Promise<BuildFrequencyPattern> {
    const buildActivities = activities.filter(a => a.type === 'build');
    
    if (buildActivities.length === 0) {
      return this.getDefaultBuildFrequency();
    }

    // Group builds by day
    const buildsByDay = this.groupActivitiesByDay(buildActivities);
    const dailyCounts = Object.values(buildsByDay).map(builds => builds.length);
    
    // Calculate statistics
    const averageBuildsPerDay = dailyCounts.reduce((sum, count) => sum + count, 0) / dailyCounts.length;
    const buildDurations = buildActivities.map(b => b.duration);
    
    // Identify peak build days
    const maxBuilds = Math.max(...dailyCounts);
    const peakBuildDays = Object.entries(buildsByDay)
      .filter(([_, builds]) => builds.length >= maxBuilds * 0.8)
      .map(([day, _]) => this.getDayOfWeek(new Date(day)));

    // Analyze build types and success rates
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

  /**
   * Identify peak working hours
   */
  private async identifyPeakWorkingHours(activities: Activity[]): Promise<PeakHoursPattern> {
    if (activities.length === 0) {
      return this.getDefaultPeakHours();
    }

    // Group activities by hour
    const activityByHour = new Map<number, Activity[]>();
    
    for (const activity of activities) {
      const hour = activity.timestamp.getHours();
      if (!activityByHour.has(hour)) {
        activityByHour.set(hour, []);
      }
      activityByHour.get(hour)!.push(activity);
    }

    // Calculate intensity and carbon efficiency for each hour
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

    // Identify primary working hours (top 8 hours with highest intensity)
    const primaryWorkingHours = hourRanges
      .sort((a, b) => b.intensity - a.intensity)
      .slice(0, 8);

    // Analyze day-of-week patterns
    const weekdayPattern = this.analyzeWeekdayPatterns(activities);

    // Calculate consistency score
    const consistencyScore = this.calculateWorkingHoursConsistency(activities);

    return {
      primaryWorkingHours,
      timezone: 'UTC', // TODO: Get from user profile
      weekdayPattern,
      seasonalVariation: false, // TODO: Implement seasonal analysis
      consistencyScore
    };
  }

  /**
   * Analyze tool usage patterns
   */
  private async analyzeToolUsage(activities: Activity[]): Promise<ToolUsagePattern> {
    // Extract tool usage from activity metadata
    const toolUsageMap = new Map<string, { hours: number; carbonFootprint: number }>();
    const languageUsage = new Map<string, number>();
    const frameworkUsage = new Map<string, number>();

    for (const activity of activities) {
      // Process tools used
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

      // Process languages used
      if (activity.metadata.languagesUsed) {
        for (const language of activity.metadata.languagesUsed) {
          languageUsage.set(language, (languageUsage.get(language) || 0) + activity.duration);
        }
      }
    }

    // Convert to primary tools with efficiency scores
    const primaryTools = Array.from(toolUsageMap.entries()).map(([toolName, usage]) => ({
      toolName,
      usageHours: usage.hours,
      carbonFootprintPerHour: usage.carbonFootprint / usage.hours,
      efficiencyScore: this.calculateToolEfficiencyScore(toolName, usage),
      alternatives: this.getToolAlternatives(toolName)
    })).sort((a, b) => b.usageHours - a.usageHours);

    // Convert language and framework usage to distributions
    const totalActivityTime = activities.reduce((sum, a) => sum + a.duration, 0);
    const languageDistribution = Object.fromEntries(
      Array.from(languageUsage.entries()).map(([lang, time]) => [lang, time / totalActivityTime])
    );

    const frameworkDistribution = Object.fromEntries(
      Array.from(frameworkUsage.entries()).map(([fw, time]) => [fw, time / totalActivityTime])
    );

    // Analyze CI/CD patterns
    const cicdPatterns = this.analyzeCICDPatterns(activities);

    // Calculate local vs remote ratio
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

  /**
   * Analyze location patterns
   */
  private async analyzeLocationPatterns(activities: Activity[]): Promise<GeographicPattern[]> {
    // Group activities by location
    const locationGroups = new Map<string, Activity[]>();
    
    for (const activity of activities) {
      const locationKey = `${activity.location.latitude},${activity.location.longitude}`;
      if (!locationGroups.has(locationKey)) {
        locationGroups.set(locationKey, []);
      }
      locationGroups.get(locationKey)!.push(activity);
    }

    // Analyze each location
    const patterns: GeographicPattern[] = [];
    
    for (const [locationKey, locationActivities] of locationGroups) {
      const location = locationActivities[0].location;
      const timeSpent = locationActivities.reduce((sum, a) => sum + a.duration, 0) / 60; // Convert to hours
      const carbonIntensity = locationActivities.reduce((sum, a) => sum + a.carbonFootprint, 0) / locationActivities.length;
      
      patterns.push({
        location,
        timeSpent,
        carbonIntensityDuringWork: carbonIntensity,
        travelPatterns: [], // TODO: Implement travel pattern detection
        remoteWorkEfficiency: this.calculateRemoteWorkEfficiency(locationActivities)
      });
    }

    return patterns.sort((a, b) => b.timeSpent - a.timeSpent);
  }

  /**
   * Identify high carbon activities and patterns
   */
  private identifyHighCarbonActivities(activities: Activity[]): HighCarbonPattern[] {
    // Define threshold for high carbon activities (top 20%)
    const carbonFootprints = activities.map(a => a.carbonFootprint).sort((a, b) => b - a);
    const threshold = carbonFootprints[Math.floor(carbonFootprints.length * 0.2)];
    
    const highCarbonActivities = activities.filter(a => a.carbonFootprint >= threshold);
    
    // Group similar patterns
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

  /**
   * Analyze working habits patterns
   */
  private async analyzeWorkingHabits(activities: Activity[]): Promise<WorkingHabitPattern> {
    // Identify focus time patterns
    const focusTimePatterns = this.identifyFocusTimePatterns(activities);
    
    // Calculate interruption frequency
    const interruptionFrequency = this.calculateInterruptionFrequency(activities);
    
    // Calculate multitasking ratio
    const multitaskingRatio = this.calculateMultitaskingRatio(activities);
    
    // Identify deep work sessions
    const deepWorkSessions = this.identifyDeepWorkSessions(activities);
    
    // Analyze energy levels throughout the day
    const energyLevels = this.analyzeEnergyLevels(activities);

    return {
      focusTimePatterns,
      interruptionFrequency,
      multitaskingRatio,
      deepWorkSessions,
      energyLevels
    };
  }

  /**
   * Analyze collaboration patterns
   */
  private async analyzeCollaborationPatterns(activities: Activity[]): Promise<CollaborationPattern> {
    const meetingActivities = activities.filter(a => a.type === 'meeting');
    const meetingFrequency = meetingActivities.length / 30; // per day over 30 days
    const averageMeetingDuration = meetingActivities.reduce((sum, a) => sum + a.duration, 0) / meetingActivities.length || 0;

    // Calculate collaboration metrics
    const collaborativeActivities = activities.filter(a => a.metadata.collaborators && a.metadata.collaborators.length > 0);
    const pairProgrammingHours = collaborativeActivities
      .filter(a => a.type === 'code')
      .reduce((sum, a) => sum + a.duration, 0) / 60; // Convert to hours per week

    return {
      meetingFrequency,
      averageMeetingDuration,
      remoteVsInPersonRatio: 0.8, // TODO: Detect from activity metadata
      pairProgrammingHours: pairProgrammingHours / 4, // Per week
      asyncCommunicationRatio: 0.6, // TODO: Calculate from activity patterns
      teamSizePreference: this.calculateAverageTeamSize(activities)
    };
  }

  /**
   * Helper methods
   */
  private async getRecentActivities(userId: string, days: number): Promise<Activity[]> {
    // TODO: Integrate with actual activity data store
    // For now, return mock data
    const mockActivities: Activity[] = [];
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    for (let i = 0; i < days * 10; i++) { // 10 activities per day
      const timestamp = new Date(startDate.getTime() + Math.random() * days * 24 * 60 * 60 * 1000);
      
      mockActivities.push({
        id: `activity-${i}`,
        userId,
        type: ['build', 'test', 'code', 'meeting'][Math.floor(Math.random() * 4)] as any,
        timestamp,
        duration: 30 + Math.random() * 120, // 30-150 minutes
        carbonFootprint: Math.random() * 2, // 0-2 kg CO2e
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
        mean: 300, // 5 minutes
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

  // Additional helper methods would go here...
  private assessDataQuality(activities: Activity[], expectedDays: number): any {
    const completeness = Math.min(activities.length / (expectedDays * 10), 1); // Expect 10 activities per day
    return {
      completeness,
      consistency: 0.8, // TODO: Implement consistency calculation
      recency: 1.0, // Data is fresh
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

  // Placeholder implementations for complex analysis methods
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
    return []; // Simplified for now
  }

  private calculateWorkingHoursConsistency(activities: Activity[]): number {
    return 0.75; // Simplified consistency score
  }

  private calculateToolEfficiencyScore(toolName: string, usage: any): number {
    // Simple efficiency calculation based on carbon per hour
    const avgCarbonPerHour = usage.carbonFootprint / usage.hours;
    return Math.max(0, 1 - avgCarbonPerHour / 2); // Normalize to 0-1 scale
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
    // Simple calculation based on activity metadata
    return 0.7; // 70% local development
  }

  private calculateRemoteWorkEfficiency(activities: Activity[]): number {
    return 0.8; // 80% efficiency score
  }

  private groupSimilarPatterns(activities: Activity[]): any[] {
    // Group activities by type and characteristics
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
      frequency: groupActivities.length / 7, // per week
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

  // Additional simplified implementations
  private identifyFocusTimePatterns(activities: Activity[]): any[] {
    return [];
  }

  private calculateInterruptionFrequency(activities: Activity[]): number {
    return 2.3; // interruptions per hour
  }

  private calculateMultitaskingRatio(activities: Activity[]): number {
    return 0.3; // 30% of time spent multitasking
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