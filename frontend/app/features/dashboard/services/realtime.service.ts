import { CHANNELS } from '~/shared/services/appwrite.client';


export type SubscriptionCallback<T = unknown> = (payload: T) => void;
export type ErrorCallback = (error: Error) => void;

export interface CarbonUpdatePayload {
  userId: string;
  carbonValue: number;
  carbonUnit: string;
  timestamp: string;
  activityType: string;
  repository: string;
}

export interface ActivityUpdatePayload {
  id: string;
  type: string;
  repository: string;
  carbonValue?: number;
  carbonUnit?: string;
  timestamp: string;
  details: Record<string, unknown>;
}

export interface LeaderboardUpdatePayload {
  period: string;
  rankings: Array<{
    userId: string;
    username: string;
    rank: number;
    carbonTotal: number;
    efficiencyScore: number;
  }>;
  lastUpdated: string;
}

class RealtimeService {
  private subscriptions = new Map<string, () => void>();
  private connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error' = 'disconnected';
  private statusCallbacks = new Set<(status: typeof this.connectionStatus) => void>();
  private mockMode = true; // Enable mock mode for development

  subscribeToUserCarbon(
    userId: string,
    onUpdate: SubscriptionCallback<CarbonUpdatePayload>,
    onError?: ErrorCallback
  ): () => void {
    const channelName = CHANNELS.USER_CARBON(userId);

    if (this.mockMode) {
      const mockInterval = setInterval(() => {
        const mockUpdate: CarbonUpdatePayload = {
          userId,
          carbonValue: Math.random() * 100,
          carbonUnit: 'g',
          timestamp: new Date().toISOString(),
          activityType: 'commit',
          repository: 'example/repo',
        };
        onUpdate(mockUpdate);
      }, 10000); // Mock update every 10 seconds

      const unsubscribe = () => clearInterval(mockInterval);
      this.subscriptions.set(channelName, unsubscribe);
      this.connectionStatus = 'connected';
      return unsubscribe;
    }

    const unsubscribe = () => {
      this.subscriptions.delete(channelName);
    };

    return unsubscribe;
  }

  subscribeToUserActivities(
    userId: string,
    onUpdate: SubscriptionCallback<ActivityUpdatePayload>,
    onError?: ErrorCallback
  ): () => void {
    const channelName = CHANNELS.USER_ACTIVITIES(userId);

    if (this.mockMode) {
      const mockInterval = setInterval(() => {
        const activityTypes = ['commit', 'pr', 'ci_run', 'deployment'];
        const mockUpdate: ActivityUpdatePayload = {
          id: Math.random().toString(36).substr(2, 9),
          type: activityTypes[Math.floor(Math.random() * activityTypes.length)],
          repository: 'example/repo',
          carbonValue: Math.random() * 50,
          carbonUnit: 'g',
          timestamp: new Date().toISOString(),
          details: { message: 'Mock activity for development' },
        };
        onUpdate(mockUpdate);
      }, 15000); // Mock update every 15 seconds

      const unsubscribe = () => clearInterval(mockInterval);
      this.subscriptions.set(channelName, unsubscribe);
      return unsubscribe;
    }

    const unsubscribe = () => {
      this.subscriptions.delete(channelName);
    };

    return unsubscribe;
  }

  subscribeToLeaderboard(
    period: 'daily' | 'weekly' | 'monthly',
    onUpdate: SubscriptionCallback<LeaderboardUpdatePayload>,
    onError?: ErrorCallback
  ): () => void {
    const channelName =
      period === 'daily'
        ? CHANNELS.LEADERBOARD_DAILY
        : period === 'weekly'
          ? CHANNELS.LEADERBOARD_WEEKLY
          : CHANNELS.LEADERBOARD_MONTHLY;

    if (this.mockMode) {
      const mockInterval = setInterval(() => {
        const mockUpdate: LeaderboardUpdatePayload = {
          period,
          rankings: [
            { userId: '1', username: 'developer1', rank: 1, carbonTotal: 150, efficiencyScore: 95 },
            { userId: '2', username: 'developer2', rank: 2, carbonTotal: 180, efficiencyScore: 88 },
            { userId: '3', username: 'developer3', rank: 3, carbonTotal: 210, efficiencyScore: 82 },
          ],
          lastUpdated: new Date().toISOString(),
        };
        onUpdate(mockUpdate);
      }, 30000); // Mock update every 30 seconds

      const unsubscribe = () => clearInterval(mockInterval);
      this.subscriptions.set(channelName, unsubscribe);
      return unsubscribe;
    }

    const unsubscribe = () => {
      this.subscriptions.delete(channelName);
    };

    return unsubscribe;
  }

  subscribeToGlobalActivities(
    onUpdate: SubscriptionCallback<ActivityUpdatePayload>,
    onError?: ErrorCallback
  ): () => void {
    const channelName = CHANNELS.ACTIVITIES_GLOBAL;

    const unsubscribe = () => {
      this.subscriptions.delete(channelName);
    };

    return unsubscribe;
  }

  subscribeToMultiple(
    subscriptions: Array<{
      channel: string;
      callback: SubscriptionCallback;
      onError?: ErrorCallback;
    }>
  ): () => void {
    const unsubscribes = subscriptions.map(() => () => {});
    return () => {
      unsubscribes.forEach((unsubscribe) => unsubscribe());
    };
  }

  unsubscribe(channel: string): void {
    const unsubscribe = this.subscriptions.get(channel);
    if (unsubscribe) {
      unsubscribe();
      this.subscriptions.delete(channel);
    }
  }

  unsubscribeAll(): void {
    this.subscriptions.forEach((unsubscribe) => {
      try {
        unsubscribe();
      } catch (error) {
        console.error('Error unsubscribing:', error);
      }
    });
    this.subscriptions.clear();
  }

  getConnectionStatus(): typeof this.connectionStatus {
    return this.connectionStatus;
  }

  onConnectionStatusChange(callback: (status: typeof this.connectionStatus) => void): () => void {
    this.statusCallbacks.add(callback);

    return () => {
      this.statusCallbacks.delete(callback);
    };
  }

  isConnected(): boolean {
    return this.connectionStatus === 'connected';
  }

  getActiveSubscriptionCount(): number {
    return this.subscriptions.size;
  }

  getActiveChannels(): string[] {
    return Array.from(this.subscriptions.keys());
  }

  async reconnect(): Promise<void> {
    this.connectionStatus = 'connecting';

    try {
      this.unsubscribeAll();
      await new Promise((resolve) => setTimeout(resolve, 1000));
      this.connectionStatus = 'connected';
    } catch (error) {
      console.error('Reconnection failed:', error);
      this.connectionStatus = 'error';
      throw error;
    }
  }
}

export const realtimeService = new RealtimeService();
