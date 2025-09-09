import { CHANNELS } from './appwrite.client';

/**
 * Real-time service for EcoTrace dashboard updates
 * Simplified version for development
 */

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

  /**
   * Subscribe to user-specific carbon updates
   */
  subscribeToUserCarbon(
    userId: string,
    onUpdate: SubscriptionCallback<CarbonUpdatePayload>,
    onError?: ErrorCallback
  ): () => void {
    const channelName = CHANNELS.USER_CARBON(userId);

    if (this.mockMode) {
      // Mock subscription for development
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

    // Real implementation would go here
    const unsubscribe = () => {
      this.subscriptions.delete(channelName);
    };

    return unsubscribe;
  }

  /**
   * Subscribe to user-specific activity updates
   */
  subscribeToUserActivities(
    userId: string,
    onUpdate: SubscriptionCallback<ActivityUpdatePayload>,
    onError?: ErrorCallback
  ): () => void {
    const channelName = CHANNELS.USER_ACTIVITIES(userId);

    if (this.mockMode) {
      // Mock subscription for development
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

  /**
   * Subscribe to leaderboard updates
   */
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
      // Mock subscription for development
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

  /**
   * Subscribe to global activity feed
   */
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

  /**
   * Subscribe to multiple channels at once
   */
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

  /**
   * Unsubscribe from specific channel
   */
  unsubscribe(channel: string): void {
    const unsubscribe = this.subscriptions.get(channel);
    if (unsubscribe) {
      unsubscribe();
      this.subscriptions.delete(channel);
    }
  }

  /**
   * Unsubscribe from all channels
   */
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

  /**
   * Get connection status
   */
  getConnectionStatus(): typeof this.connectionStatus {
    return this.connectionStatus;
  }

  /**
   * Subscribe to connection status changes
   */
  onConnectionStatusChange(callback: (status: typeof this.connectionStatus) => void): () => void {
    this.statusCallbacks.add(callback);

    return () => {
      this.statusCallbacks.delete(callback);
    };
  }

  /**
   * Check if currently connected
   */
  isConnected(): boolean {
    return this.connectionStatus === 'connected';
  }

  /**
   * Get number of active subscriptions
   */
  getActiveSubscriptionCount(): number {
    return this.subscriptions.size;
  }

  /**
   * Get list of active subscription channels
   */
  getActiveChannels(): string[] {
    return Array.from(this.subscriptions.keys());
  }

  /**
   * Force reconnection (useful for handling network issues)
   */
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

// Export singleton instance
export const realtimeService = new RealtimeService();
