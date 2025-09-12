import { realtime, DATABASE_ID, COLLECTIONS } from './appwrite.client';

type RealtimeCallback = (payload: any) => void;

class RealtimeService {
  private subscriptions: Map<string, () => void> = new Map();

  subscribeToLeaderboard(callback: RealtimeCallback): string {
    if (!realtime) {
      console.warn('Realtime not available in SSR');
      return '';
    }

    const channel = `databases.${DATABASE_ID}.collections.${COLLECTIONS.LEADERBOARD}.documents`;
    
    const unsubscribe = realtime.subscribe(channel, (response) => {
      callback(response);
    });

    const subscriptionId = `leaderboard_${Date.now()}`;
    this.subscriptions.set(subscriptionId, unsubscribe);
    
    return subscriptionId;
  }

  subscribeToChallenges(challengeId: string, callback: RealtimeCallback): string {
    if (!realtime) {
      console.warn('Realtime not available in SSR');
      return '';
    }

    const channel = `databases.${DATABASE_ID}.collections.${COLLECTIONS.CHALLENGES}.documents.${challengeId}`;
    
    const unsubscribe = realtime.subscribe(channel, (response) => {
      callback(response);
    });

    const subscriptionId = `challenge_${challengeId}_${Date.now()}`;
    this.subscriptions.set(subscriptionId, unsubscribe);
    
    return subscriptionId;
  }

  subscribeToAchievements(userId: string, callback: RealtimeCallback): string {
    if (!realtime) {
      console.warn('Realtime not available in SSR');
      return '';
    }

    const channel = `databases.${DATABASE_ID}.collections.${COLLECTIONS.USER_ACHIEVEMENTS}.documents`;
    
    const unsubscribe = realtime.subscribe(channel, (response) => {
      // Filter for user's achievements
      if (response.payload?.userId === userId) {
        callback(response);
      }
    });

    const subscriptionId = `achievements_${userId}_${Date.now()}`;
    this.subscriptions.set(subscriptionId, unsubscribe);
    
    return subscriptionId;
  }

  subscribeToTeam(teamId: string, callback: RealtimeCallback): string {
    if (!realtime) {
      console.warn('Realtime not available in SSR');
      return '';
    }

    const channel = `databases.${DATABASE_ID}.collections.${COLLECTIONS.TEAMS}.documents.${teamId}`;
    
    const unsubscribe = realtime.subscribe(channel, (response) => {
      callback(response);
    });

    const subscriptionId = `team_${teamId}_${Date.now()}`;
    this.subscriptions.set(subscriptionId, unsubscribe);
    
    return subscriptionId;
  }

  unsubscribe(subscriptionId: string): void {
    const unsubscribe = this.subscriptions.get(subscriptionId);
    if (unsubscribe) {
      unsubscribe();
      this.subscriptions.delete(subscriptionId);
    }
  }

  unsubscribeAll(): void {
    this.subscriptions.forEach((unsubscribe) => unsubscribe());
    this.subscriptions.clear();
  }
}

export const realtimeService = new RealtimeService();