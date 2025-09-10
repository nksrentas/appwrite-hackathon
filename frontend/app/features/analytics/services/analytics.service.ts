import type { AnalyticsMetrics, TimeSeriesData, AnalyticsActivity } from '@features/analytics/stores/analytics.store';

class AnalyticsService {
  private generateMockTimeSeriesData(timeFrame: string): TimeSeriesData[] {
    const days = timeFrame === '7d' ? 7 : timeFrame === '30d' ? 30 : timeFrame === '90d' ? 90 : 365;
    const data: TimeSeriesData[] = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      const commits = Math.floor(Math.random() * 10) + 1;
      const pullRequests = Math.floor(Math.random() * 3);
      const ciRuns = Math.floor(Math.random() * 20) + 5;
      const deployments = Math.floor(Math.random() * 2);
      
      data.push({
        date: date.toISOString().split('T')[0],
        commits,
        pullRequests,
        ciRuns,
        deployments,
        totalCarbon: commits * 0.08 + pullRequests * 0.32 + ciRuns * 0.15 + deployments * 0.65,
      });
    }
    
    return data;
  }

  private generateMockActivities(): AnalyticsActivity[] {
    const activities: AnalyticsActivity[] = [];
    const types: Array<'commit' | 'pull_request' | 'ci_run' | 'deployment'> = ['commit', 'pull_request', 'ci_run', 'deployment'];
    const repos = ['project/main', 'frontend/app', 'backend/api', 'shared/utils'];
    
    for (let i = 0; i < 20; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      const timestamp = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000);
      
      let carbonValue: number;
      let details: string;
      
      switch (type) {
        case 'commit':
          carbonValue = Number((Math.random() * 0.2 + 0.05).toFixed(3));
          details = 'Code changes pushed to repository';
          break;
        case 'pull_request':
          carbonValue = Number((Math.random() * 0.5 + 0.2).toFixed(3));
          details = 'Pull request merged with CI validation';
          break;
        case 'ci_run':
          carbonValue = Number((Math.random() * 0.3 + 0.1).toFixed(3));
          details = 'Automated build and test execution';
          break;
        case 'deployment':
          carbonValue = Number((Math.random() * 0.8 + 0.4).toFixed(3));
          details = 'Production deployment with infrastructure scaling';
          break;
      }
      
      activities.push({
        id: `activity-${i}`,
        type,
        repository: repos[Math.floor(Math.random() * repos.length)],
        timestamp: timestamp.toISOString(),
        carbonValue,
        carbonUnit: 'kg',
        details,
        author: 'Current User',
      });
    }
    
    return activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  async getAnalyticsMetrics(userId: string, timeFrame: string): Promise<AnalyticsMetrics> {
    await new Promise(resolve => setTimeout(resolve, 500));

    return {
      commits: {
        total: 45,
        avgCarbonPerCommit: 0.08,
        trend: 'down',
        change: 12.5,
      },
      pullRequests: {
        total: 8,
        avgCarbonPerPR: 0.32,
        trend: 'up',
        change: 8.2,
      },
      ciRuns: {
        total: 156,
        avgCarbonPerRun: 0.15,
        trend: 'down',
        change: 22.1,
      },
      deployments: {
        total: 12,
        avgCarbonPerDeploy: 0.65,
        trend: 'stable',
        change: 2.1,
      },
      efficiency: {
        codeQuality: 85,
        testCoverage: 78,
        buildTime: 320,
        bundleSize: 245,
      },
    };
  }

  async getTimeSeriesData(userId: string, timeFrame: string): Promise<TimeSeriesData[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return this.generateMockTimeSeriesData(timeFrame);
  }

  async getRecentActivities(userId: string, timeFrame: string): Promise<AnalyticsActivity[]> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return this.generateMockActivities();
  }

  async exportAnalyticsData(userId: string, timeFrame: string, format: 'csv' | 'json' = 'csv'): Promise<Blob> {
    const [metrics, timeSeries, activities] = await Promise.all([
      this.getAnalyticsMetrics(userId, timeFrame),
      this.getTimeSeriesData(userId, timeFrame),
      this.getRecentActivities(userId, timeFrame),
    ]);

    if (format === 'json') {
      const data = { metrics, timeSeries, activities };
      return new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    }

    const csvHeaders = 'Date,Commits,Pull Requests,CI Runs,Deployments,Total Carbon (kg)\n';
    const csvRows = timeSeries
      .map(row => `${row.date},${row.commits},${row.pullRequests},${row.ciRuns},${row.deployments},${row.totalCarbon.toFixed(3)}`)
      .join('\n');

    return new Blob([csvHeaders + csvRows], { type: 'text/csv' });
  }
}

export const analyticsService = new AnalyticsService();