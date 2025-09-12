import type { LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { Link, Outlet } from '@remix-run/react';
import { useEffect } from 'react';
import {
  Leaf,
  Bell,
  Settings,
  RefreshCw,
  ArrowLeft,
} from 'lucide-react';

import { useAuthStore } from '@features/auth/stores/auth.store';
import { Button } from '@shared/components/ui/button';
import { Separator } from '@shared/components/ui/separator';

export async function loader({ request }: LoaderFunctionArgs) {
  return json({});
}

export default function LeaderboardLayout() {
  const { user, isAuthenticated, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-carbon-900">Authentication Required</h1>
          <p className="text-carbon-600">Please sign in to view the leaderboard.</p>
          <Link to="/">
            <Button>Go to Sign In</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/95 backdrop-blur-supports-[backdrop-filter]:bg-background/95 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <Link to="/" className="flex items-center space-x-3">
                <div className="bg-primary p-2 rounded-lg">
                  <Leaf className="h-6 w-6 text-primary-foreground" />
                </div>
                <span className="text-display-md font-bold">EcoTrace</span>
              </Link>

              <nav className="hidden md:flex space-x-6">
                <Link
                  to="/dashboard"
                  className="text-body-md text-muted-foreground hover:text-foreground transition-colors"
                >
                  Dashboard
                </Link>
                <Link
                  to="/carbon-insights"
                  className="text-body-md text-muted-foreground hover:text-foreground transition-colors"
                >
                  Carbon Insights
                </Link>
                <Link
                  to="/analytics"
                  className="text-body-md text-muted-foreground hover:text-foreground transition-colors"
                >
                  Analytics
                </Link>
                <Link
                  to="/leaderboard"
                  className="text-body-md text-primary font-medium border-b-2 border-primary pb-1"
                >
                  Leaderboard
                </Link>
                <Link
                  to="/challenges"
                  className="text-body-md text-muted-foreground hover:text-foreground transition-colors"
                >
                  Challenges
                </Link>
              </nav>
            </div>

            <div className="flex items-center space-x-4">
              <Link to="/dashboard">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>

              <Button variant="ghost" size="icon">
                <RefreshCw className="h-4 w-4" />
              </Button>

              <Button variant="ghost" size="icon">
                <Bell className="h-4 w-4" />
              </Button>

              <Button variant="ghost" size="icon">
                <Settings className="h-4 w-4" />
              </Button>

              <Separator orientation="vertical" className="h-6" />
              
              {user && (
                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <div className="text-body-sm font-medium">
                      {user.name || 'Developer'}
                    </div>
                    <div className="text-caption text-muted-foreground">
                      @{(user as any).githubUsername || 'username'}
                    </div>
                  </div>
                  {(user as any).avatar && (
                    <img
                      src={(user as any).avatar}
                      alt="Profile"
                      className="h-8 w-8 rounded-full ring-2 ring-primary/20"
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <Outlet />
    </div>
  );
}