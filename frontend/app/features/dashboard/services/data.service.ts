
export interface PaginatedResponse<T> {
  documents: T[];
  total: number;
  offset: number;
  limit: number;
}

export interface CarbonAnalytics {
  totalCarbon: number;
  weeklyCarbon: number;
  monthlyCarbon: number;
  dailyAverage: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  efficiencyScore: number;
  lastUpdated: string;
}

export interface ActivityFilters {
  type?: string[];
  repository?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

const mockActivities = [
  {
    $id: '1',
    $createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    $updatedAt: new Date().toISOString(),
    userId: 'user1',
    type: 'commit' as const,
    repository: 'ecotrace/dashboard',
    githubEventId: 'commit1',
    details: { message: 'Add carbon metrics dashboard' },
    carbonCalculated: true,
    carbonValue: 45.2,
    carbonUnit: 'g',
    carbonConfidence: 0.85,
    carbonSource: 'EPA eGRID',
  },
  {
    $id: '2',
    $createdAt: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
    $updatedAt: new Date().toISOString(),
    userId: 'user1',
    type: 'pr' as const,
    repository: 'ecotrace/backend',
    githubEventId: 'pr1',
    details: { title: 'Optimize carbon calculation algorithm' },
    carbonCalculated: true,
    carbonValue: 28.7,
    carbonUnit: 'g',
    carbonConfidence: 0.92,
    carbonSource: 'AWS Carbon API',
  },
  {
    $id: '3',
    $createdAt: new Date(Date.now() - 10800000).toISOString(), // 3 hours ago
    $updatedAt: new Date().toISOString(),
    userId: 'user1',
    type: 'ci_run' as const,
    repository: 'ecotrace/dashboard',
    githubEventId: 'ci1',
    details: { workflow: 'CI/CD Pipeline', status: 'success', duration: '3m 42s' },
    carbonCalculated: true,
    carbonValue: 152.8,
    carbonUnit: 'g',
    carbonConfidence: 0.78,
    carbonSource: 'Electricity Maps',
  },
];

class DataService {
  private mockMode = true; // Enable mock mode for development

  async getUserProfile(userId: string) {
    if (this.mockMode) {
      return {
        $id: userId,
        $createdAt: new Date(Date.now() - 86400000).toISOString(),
        $updatedAt: new Date().toISOString(),
        githubId: '123456',
        githubUsername: 'developer',
        email: 'developer@example.com',
        name: 'John Developer',
        avatar: 'https://github.com/github.png',
        repositories: ['ecotrace/dashboard', 'ecotrace/backend'],
        settings: {
          notifications: true,
          publicProfile: true,
          dataRetention: 365,
        },
        carbonFootprint: {
          total: 2500,
          thisWeek: 350,
          thisMonth: 1200,
          lastUpdated: new Date().toISOString(),
        },
      };
    }

    return null;
  }

  async updateUserProfile(userId: string, data: any) {
    if (this.mockMode) {
      return { ...(await this.getUserProfile(userId)), ...data };
    }

    throw new Error('Failed to update user profile');
  }

  async getUserActivities(
    userId: string,
    filters: ActivityFilters = {}
  ): Promise<PaginatedResponse<any>> {
    if (this.mockMode) {
      const limit = filters.limit || 50;
      const offset = filters.offset || 0;

      let filteredActivities = mockActivities;

      if (filters.type && filters.type.length > 0) {
        filteredActivities = filteredActivities.filter((a) => filters.type!.includes(a.type));
      }

      if (filters.repository) {
        filteredActivities = filteredActivities.filter((a) =>
          a.repository.includes(filters.repository!)
        );
      }

      const paginatedActivities = filteredActivities.slice(offset, offset + limit);

      return {
        documents: paginatedActivities,
        total: filteredActivities.length,
        offset,
        limit,
      };
    }

    throw new Error('Failed to get user activities');
  }

  async getCarbonAnalytics(userId: string): Promise<CarbonAnalytics> {
    if (this.mockMode) {
      return {
        totalCarbon: 2500,
        weeklyCarbon: 350,
        monthlyCarbon: 1200,
        dailyAverage: 45.5,
        trend: 'decreasing',
        efficiencyScore: 87,
        lastUpdated: new Date().toISOString(),
      };
    }

    throw new Error('Failed to get carbon analytics');
  }

  async getCarbonHistory(userId: string, period: 'week' | 'month' | 'quarter' = 'month') {
    if (this.mockMode) {
      const data = [];
      const days = period === 'week' ? 7 : period === 'month' ? 30 : 90;

      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);

        data.push({
          date: date.toISOString().split('T')[0],
          carbon: Math.random() * 100 + 20,
          activities: Math.floor(Math.random() * 10) + 1,
        });
      }

      return data;
    }

    throw new Error('Failed to get carbon history');
  }

  async getLeaderboard(period: 'daily' | 'weekly' | 'monthly' | 'all_time' = 'daily') {
    if (this.mockMode) {
      return {
        $id: `${period}-leaderboard`,
        $createdAt: new Date().toISOString(),
        $updatedAt: new Date().toISOString(),
        period,
        periodStart: new Date(Date.now() - 86400000).toISOString(),
        periodEnd: new Date().toISOString(),
        rankings: [
          {
            userId: 'user1',
            username: 'developer',
            avatar: 'https://github.com/github.png',
            carbonTotal: 150,
            efficiencyScore: 87,
            rank: 15,
            activities: 12,
          },
          {
            userId: 'user2',
            username: 'eco-coder',
            avatar: 'https://github.com/github.png',
            carbonTotal: 120,
            efficiencyScore: 94,
            rank: 8,
            activities: 15,
          },
          {
            userId: 'user3',
            username: 'green-dev',
            avatar: 'https://github.com/github.png',
            carbonTotal: 200,
            efficiencyScore: 76,
            rank: 42,
            activities: 8,
          },
        ],
      };
    }

    return null;
  }

  async getUserLeaderboardPosition(
    userId: string,
    period: 'daily' | 'weekly' | 'monthly' | 'all_time' = 'daily'
  ) {
    if (this.mockMode) {
      return {
        rank: 15,
        total: 2847,
        carbonTotal: 150,
        efficiencyScore: 87,
      };
    }

    return null;
  }

  async getCalculationDetails(activityId: string) {
    if (this.mockMode) {
      return [
        {
          $id: 'calc1',
          $createdAt: new Date().toISOString(),
          $updatedAt: new Date().toISOString(),
          activityId,
          userId: 'user1',
          carbonValue: 45.2,
          carbonUnit: 'g',
          methodology: 'EPA eGRID 2023',
          emissionFactors: {
            region: 'US-WECC',
            intensity: 0.45,
            confidence: 0.85,
          },
          confidence: 0.85,
          dataSource: 'EPA eGRID',
          calculationVersion: '1.0.0',
        },
      ];
    }

    throw new Error('Failed to get calculation details');
  }

  async getEmissionFactors(region?: string) {
    if (this.mockMode) {
      return [
        {
          $id: 'factor1',
          $createdAt: new Date().toISOString(),
          $updatedAt: new Date().toISOString(),
          region: region || 'US-WECC',
          source: 'EPA eGRID',
          factorType: 'electricity',
          value: 0.45,
          unit: 'kg CO2/kWh',
          confidence: 0.85,
          validFrom: new Date(Date.now() - 2592000000).toISOString(),
          validTo: new Date(Date.now() + 2592000000).toISOString(),
          metadata: {
            dataYear: 2023,
            methodology: 'EPA eGRID subregion data',
          },
        },
      ];
    }

    throw new Error('Failed to get emission factors');
  }

  async syncGitHubData(userId: string): Promise<{ success: boolean; message: string }> {
    if (this.mockMode) {
      await new Promise((resolve) => setTimeout(resolve, 2000));

      return {
        success: true,
        message: 'GitHub data synchronized successfully. Found 3 new activities.',
      };
    }

    throw new Error('Failed to sync GitHub data');
  }

  async getUserRepositories(userId: string): Promise<string[]> {
    if (this.mockMode) {
      return ['ecotrace/dashboard', 'ecotrace/backend', 'example/repo'];
    }

    return [];
  }

  async updateRepositoryTracking(userId: string, repositories: string[]): Promise<void> {
    if (this.mockMode) {
      console.log('Updated repositories:', repositories);
      return;
    }

    throw new Error('Failed to update repository tracking');
  }

  async getGlobalActivities(
    limit: number = 20,
    offset: number = 0
  ): Promise<PaginatedResponse<any>> {
    if (this.mockMode) {
      const globalActivities = mockActivities.slice(offset, offset + limit);

      return {
        documents: globalActivities,
        total: mockActivities.length,
        offset,
        limit,
      };
    }

    throw new Error('Failed to get global activities');
  }

  async getDashboardSummary(userId: string): Promise<{
    totalCarbon: number;
    todayCarbon: number;
    weekCarbon: number;
    monthCarbon: number;
    recentActivities: any[];
    leaderboardPosition: number | null;
    efficiencyScore: number;
    carbonTrend: 'up' | 'down' | 'stable';
  }> {
    if (this.mockMode) {
      const [analytics, activities, position] = await Promise.all([
        this.getCarbonAnalytics(userId),
        this.getUserActivities(userId, { limit: 5 }),
        this.getUserLeaderboardPosition(userId, 'daily'),
      ]);

      return {
        totalCarbon: analytics.totalCarbon,
        todayCarbon: 95.3, // Mock today's carbon
        weekCarbon: analytics.weeklyCarbon,
        monthCarbon: analytics.monthlyCarbon,
        recentActivities: activities.documents,
        leaderboardPosition: position?.rank || null,
        efficiencyScore: analytics.efficiencyScore,
        carbonTrend:
          analytics.trend === 'increasing'
            ? 'up'
            : analytics.trend === 'decreasing'
              ? 'down'
              : 'stable',
      };
    }

    throw new Error('Failed to get dashboard summary');
  }
}

export const dataService = new DataService();
