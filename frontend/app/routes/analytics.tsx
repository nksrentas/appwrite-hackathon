import type { MetaFunction, LoaderFunctionArgs } from '@remix-run/node';
import { json, redirect } from '@remix-run/node';
import { useLoaderData, Link, Outlet } from '@remix-run/react';
import { useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  TrendingUp,
  Calendar,
  Settings,
  Leaf,
  Bell,
  RefreshCw,
  ArrowLeft,
} from 'lucide-react';

import { useAuthStore } from '@features/auth/stores/auth.store';
import { Button } from '@shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/components/ui/card';

export const meta: MetaFunction = () => {
  return [
    { title: 'Analytics - EcoTrace' },
    { name: 'description', content: 'Detailed carbon footprint analytics and insights' },
  ];
};

export async function loader({ request }: LoaderFunctionArgs) {
  return json({});
}

export default function AnalyticsLayout() {
  const { user, isAuthenticated, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-carbon-900">Authentication Required</h1>
          <p className="text-carbon-600">Please sign in to access analytics.</p>
          <Link to="/">
            <Button>Go to Sign In</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-carbon-50 via-primary-50/20 to-background">
      <header className="border-b border-carbon-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <Link to="/" className="flex items-center space-x-3">
                <div className="bg-primary-500 p-2 rounded-lg carbon-glow">
                  <Leaf className="h-6 w-6 text-white" />
                </div>
                <span className="text-display-md text-carbon-900 font-bold">EcoTrace</span>
              </Link>

              <nav className="hidden md:flex space-x-6">
                <Link
                  to="/dashboard"
                  className="text-body-md text-carbon-600 hover:text-carbon-900 transition-colors"
                >
                  Dashboard
                </Link>
                <Link
                  to="/analytics"
                  className="text-body-md text-primary-600 font-medium border-b-2 border-primary-500 pb-1"
                >
                  Analytics
                </Link>
                <Link
                  to="/leaderboard"
                  className="text-body-md text-carbon-600 hover:text-carbon-900 transition-colors"
                >
                  Leaderboard
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

              {user && (
                <div className="flex items-center space-x-3 pl-4 border-l border-carbon-200">
                  <div className="text-right">
                    <div className="text-body-sm font-medium text-carbon-900">
                      {user.name || 'Developer'}
                    </div>
                  </div>
                  {(user as any).avatar && (
                    <img
                      src={(user as any).avatar}
                      alt="Profile"
                      className="h-8 w-8 rounded-full ring-2 ring-primary-500/20"
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 lg:px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="mb-8">
            <h1 className="text-display-lg text-carbon-900 font-bold mb-2">Analytics</h1>
            <p className="text-body-md text-carbon-600">
              Detailed insights into your carbon footprint patterns and trends
            </p>
          </div>
        </motion.div>

        <Outlet />
      </main>
    </div>
  );
}