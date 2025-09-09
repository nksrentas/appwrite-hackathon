import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { authService, type AuthUser } from '../services/auth.service';

export interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  needsOnboarding: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  checkAuth: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  updatePreferences: (params: { preferences: Record<string, unknown> }) => Promise<void>;
  clearError: () => void;
  setLoading: (params: { loading: boolean }) => void;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set, get) => ({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        needsOnboarding: false,

        signIn: async () => {
          try {
            set({ isLoading: true, error: null });
            await authService.signInWithGitHub();
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Authentication failed',
              isLoading: false,
            });
            throw error;
          }
        },

        signOut: async () => {
          try {
            set({ isLoading: true, error: null });
            await authService.signOut();
            set({
              user: null,
              isAuthenticated: false,
              needsOnboarding: false,
              isLoading: false,
            });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Sign out failed',
              isLoading: false,
            });
            throw error;
          }
        },

        checkAuth: async () => {
          try {
            set({ isLoading: true, error: null });
            const { isAuthenticated, user, needsOnboarding } = await authService.checkAuthStatus();

            set({
              isAuthenticated,
              user,
              needsOnboarding,
              isLoading: false,
            });
          } catch (error) {
            set({
              isAuthenticated: false,
              user: null,
              needsOnboarding: false,
              error: error instanceof Error ? error.message : 'Auth check failed',
              isLoading: false,
            });
          }
        },

        completeOnboarding: async () => {
          try {
            set({ isLoading: true, error: null });
            await authService.completeOnboarding();
            set({
              needsOnboarding: false,
              isLoading: false,
            });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Onboarding completion failed',
              isLoading: false,
            });
            throw error;
          }
        },

        updatePreferences: async ({ preferences }) => {
          try {
            set({ isLoading: true, error: null });
            const updatedUser = await authService.updatePreferences(preferences);
            set({
              user: updatedUser as AuthUser,
              isLoading: false,
            });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Preferences update failed',
              isLoading: false,
            });
            throw error;
          }
        },

        clearError: () => {
          set({ error: null });
        },

        setLoading: ({ loading }) => {
          set({ isLoading: loading });
        },
      }),
      {
        name: 'ecotrace-auth',
        partialize: (state) => ({
          user: state.user,
          isAuthenticated: state.isAuthenticated,
          needsOnboarding: state.needsOnboarding,
        }),
      }
    ),
    {
      name: 'auth-store',
    }
  )
);