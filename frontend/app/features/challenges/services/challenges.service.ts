import type { Challenge, Achievement, UserStats } from '@features/challenges/stores/challenges.store';

class ChallengesService {
  private generateMockChallenges(): Challenge[] {
    return [
      {
        id: 'green-streak',
        title: 'Green Streak Master',
        description: 'Maintain low carbon impact for 30 consecutive days',
        difficulty: 'Medium',
        category: 'Consistency',
        reward: 500,
        progress: 18,
        target: 30,
        status: 'active',
        iconName: 'Leaf',
        color: 'green',
        timeLeft: '12 days remaining',
        startedAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'efficiency-boost',
        title: 'Efficiency Booster',
        description: 'Reduce your average commit carbon footprint by 25%',
        difficulty: 'Hard',
        category: 'Optimization',
        reward: 750,
        progress: 15,
        target: 25,
        status: 'active',
        iconName: 'Zap',
        color: 'yellow',
        timeLeft: '3 weeks remaining',
        startedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'early-bird',
        title: 'Early Bird',
        description: 'Complete 50 commits before 9 AM',
        difficulty: 'Easy',
        category: 'Timing',
        reward: 200,
        progress: 32,
        target: 50,
        status: 'active',
        iconName: 'Clock',
        color: 'blue',
        timeLeft: '1 week remaining',
        startedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'test-champion',
        title: 'Test Champion',
        description: 'Achieve 95% test coverage on 10 repositories',
        difficulty: 'Hard',
        category: 'Quality',
        reward: 1000,
        progress: 0,
        target: 10,
        status: 'locked',
        iconName: 'Trophy',
        color: 'purple',
        requirement: 'Complete Green Streak Master first',
      },
      {
        id: 'ci-optimizer',
        title: 'CI Optimizer',
        description: 'Reduce CI build time by 50% across all projects',
        difficulty: 'Hard',
        category: 'Performance',
        reward: 800,
        progress: 8,
        target: 50,
        status: 'active',
        iconName: 'Settings',
        color: 'indigo',
        timeLeft: '2 weeks remaining',
        startedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'weekend-warrior',
        title: 'Weekend Warrior',
        description: 'Complete development tasks on weekends with minimal carbon impact',
        difficulty: 'Medium',
        category: 'Timing',
        reward: 400,
        progress: 6,
        target: 8,
        status: 'active',
        iconName: 'Calendar',
        color: 'orange',
        timeLeft: '1 month remaining',
        startedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];
  }

  private generateMockAchievements(): Achievement[] {
    return [
      {
        id: 'first-steps',
        title: 'First Steps',
        description: 'Connected your first GitHub repository',
        reward: 100,
        earnedAt: '2024-01-15T10:30:00Z',
        iconName: 'GitCommit',
        category: 'Getting Started',
      },
      {
        id: 'week-warrior',
        title: 'Week Warrior',
        description: 'Maintained efficiency for 7 consecutive days',
        reward: 250,
        earnedAt: '2024-01-22T14:45:00Z',
        iconName: 'Calendar',
        category: 'Consistency',
      },
      {
        id: 'optimizer',
        title: 'Code Optimizer',
        description: 'Reduced carbon footprint by 50% in one month',
        reward: 500,
        earnedAt: '2024-02-01T09:15:00Z',
        iconName: 'TrendingUp',
        category: 'Optimization',
      },
      {
        id: 'team-player',
        title: 'Team Player',
        description: 'Collaborated on 25 pull requests with efficient practices',
        reward: 300,
        earnedAt: '2024-02-08T16:20:00Z',
        iconName: 'Users',
        category: 'Collaboration',
      },
      {
        id: 'marathon-runner',
        title: 'Marathon Runner',
        description: 'Maintained consistent development activity for 90 days',
        reward: 750,
        earnedAt: '2024-02-15T11:00:00Z',
        iconName: 'Award',
        category: 'Consistency',
      },
      {
        id: 'quality-guardian',
        title: 'Quality Guardian',
        description: 'Achieved 90%+ test coverage across 5 projects',
        reward: 600,
        earnedAt: '2024-02-20T13:30:00Z',
        iconName: 'Shield',
        category: 'Quality',
      },
    ];
  }

  private generateMockUserStats(): UserStats {
    return {
      totalPoints: 2350,
      activeChallenges: 5,
      completedChallenges: 8,
      successRate: 73,
      currentStreak: 5,
      longestStreak: 18,
      rank: 47,
      totalParticipants: 2847,
    };
  }

  async getChallenges(userId: string): Promise<Challenge[]> {
    await new Promise(resolve => setTimeout(resolve, 500));
    return this.generateMockChallenges();
  }

  async getAchievements(userId: string): Promise<Achievement[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return this.generateMockAchievements();
  }

  async getUserStats(userId: string): Promise<UserStats> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return this.generateMockUserStats();
  }

  async startChallenge(challengeId: string, userId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  async updateChallengeProgress(challengeId: string, progress: number, userId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  async completeChallenge(challengeId: string, userId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  async claimReward(achievementId: string, userId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 800));
  }

  async getAvailableRewards(userId: string): Promise<Array<{
    id: string;
    title: string;
    description: string;
    cost: number;
    category: string;
    available: boolean;
  }>> {
    await new Promise(resolve => setTimeout(resolve, 400));
    
    return [
      {
        id: 'eco-badge',
        title: 'Eco Warrior Badge',
        description: 'Digital badge for your GitHub profile',
        cost: 500,
        category: 'Recognition',
        available: true,
      },
      {
        id: 'carbon-report',
        title: 'Detailed Carbon Report',
        description: 'Comprehensive analysis of your carbon impact',
        cost: 1000,
        category: 'Analytics',
        available: true,
      },
      {
        id: 'priority-support',
        title: 'Priority Support Access',
        description: '30-day priority customer support',
        cost: 1500,
        category: 'Support',
        available: false,
      },
    ];
  }
}

export const challengesService = new ChallengesService();