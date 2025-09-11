import { Account, Client, ID } from 'appwrite';

export interface AuthUser {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  name: string;
  email: string;
  prefs: Record<string, unknown>;
}

export interface GitHubAuthResult {
  user: AuthUser;
  isNewUser: boolean;
}

class AuthService {
  private client: Client;
  private account: Account;
  private mockMode = true;

  constructor() {
    const endpoint = typeof window !== 'undefined' 
      ? (window.ENV?.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1')
      : 'https://fra.cloud.appwrite.io/v1';
    
    const projectId = typeof window !== 'undefined'
      ? (window.ENV?.APPWRITE_PROJECT_ID || '68bf3f5e00183c7886b0')
      : '68bf3f5e00183c7886b0';

    this.client = new Client()
      .setEndpoint(endpoint)
      .setProject(projectId);
    
    this.account = new Account(this.client);
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    if (this.mockMode && typeof window !== 'undefined') {
      try {
        const storedAuth = localStorage.getItem('ecotrace-auth');
        if (storedAuth) {
          const authData = JSON.parse(storedAuth);
          if (authData.state?.isAuthenticated && authData.state?.user) {
            return authData.state.user;
          }
        }
      } catch (error) {
        console.warn('Failed to read user from localStorage:', error);
      }
      return null;
    }

    try {
      const user = await this.account.get();
      return user as AuthUser;
    } catch (error) {
      return null;
    }
  }

  async signInWithGitHub(successUrl?: string, failureUrl?: string): Promise<void> {
    try {
      if (typeof window === 'undefined') {
        throw new Error('OAuth can only be initiated on the client side');
      }

      const redirectUrl = successUrl || `${window.location.origin}/auth/callback`;
      const failUrl = failureUrl || `${window.location.origin}/auth/error`;

      this.account.createOAuth2Session('github', redirectUrl, failUrl);
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'GitHub authentication failed');
    }
  }

  async signOut(): Promise<void> {
    try {
      await this.account.deleteSession('current');
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Sign out failed');
    }
  }

  async signOutAllDevices(): Promise<void> {
    try {
      await this.account.deleteSessions();
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to sign out from all devices');
    }
  }

  async getCurrentSession() {
    try {
      return await this.account.getSession('current');
    } catch (error) {
      return null;
    }
  }

  async updatePreferences(preferences: Record<string, unknown>) {
    try {
      const user = await this.account.updatePrefs(preferences);
      return user as AuthUser;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to update user preferences');
    }
  }

  async getPreferences() {
    try {
      const user = await this.getCurrentUser();
      return user?.prefs || {};
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to get user preferences');
    }
  }

  async hasCompletedOnboarding(): Promise<boolean> {
    try {
      const prefs = await this.getPreferences();
      return prefs.onboardingCompleted === true;
    } catch (error) {
      return false;
    }
  }

  async completeOnboarding(): Promise<void> {
    try {
      await this.updatePreferences({
        onboardingCompleted: true,
        onboardingCompletedAt: new Date().toISOString(),
      });
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to complete onboarding');
    }
  }

  async updateNotificationSettings(settings: {
    emailNotifications?: boolean;
    pushNotifications?: boolean;
    weeklyReports?: boolean;
    carbonAlerts?: boolean;
  }): Promise<void> {
    try {
      const currentPrefs = await this.getPreferences();
      const currentNotifications = (currentPrefs.notifications as any) || {};
      
      await this.updatePreferences({
        notifications: {
          ...currentNotifications,
          ...settings,
        },
      });
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to update notification settings');
    }
  }

  async checkAuthStatus(): Promise<{
    isAuthenticated: boolean;
    user: AuthUser | null;
    needsOnboarding: boolean;
  }> {
    if (this.mockMode && typeof window !== 'undefined') {
      try {
        const storedAuth = localStorage.getItem('ecotrace-auth');
        if (storedAuth) {
          const authData = JSON.parse(storedAuth);
          if (authData.state?.isAuthenticated && authData.state?.user) {
            return {
              isAuthenticated: true,
              user: authData.state.user,
              needsOnboarding: authData.state.needsOnboarding || false,
            };
          }
        }
      } catch (error) {
        console.warn('Failed to read auth state from localStorage:', error);
      }
    }

    try {
      const user = await this.getCurrentUser();
      if (!user) {
        return {
          isAuthenticated: false,
          user: null,
          needsOnboarding: false,
        };
      }

      const needsOnboarding = !(await this.hasCompletedOnboarding());

      return {
        isAuthenticated: true,
        user,
        needsOnboarding,
      };
    } catch (error) {
      return {
        isAuthenticated: false,
        user: null,
        needsOnboarding: false,
      };
    }
  }
}

export const authService = new AuthService();