import type { LoaderFunctionArgs } from '@remix-run/node';
import { json, redirect } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { useEffect } from 'react';
import { Leaf, User, Settings, LogOut } from 'lucide-react';
import { useAuthStore } from '@features/auth/stores/auth.store';

export async function loader({ request }: LoaderFunctionArgs) {
  return json({});
}

export default function Dashboard() {
  const { user, isAuthenticated, signOut, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const handleSignOut = async () => {
    try {
      await signOut();
      window.location.href = '/';
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-carbon-50 via-primary-50/30 to-scientific-50/20">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-carbon-900 mb-2">Loading...</h2>
          <p className="text-carbon-600">Please wait while we load your dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-carbon-50 via-primary-50/30 to-scientific-50/20">
      <nav className="bg-white border-b border-carbon-200">
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="bg-primary-500 p-2 rounded-lg carbon-glow">
                <Leaf className="h-6 w-6 text-white" />
              </div>
              <span className="text-display-md text-carbon-900 font-bold">EcoTrace</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5 text-carbon-500" />
                <span className="text-sm text-carbon-700">{user.name}</span>
              </div>
              
              <button
                onClick={handleSignOut}
                className="flex items-center space-x-1 px-3 py-2 text-sm text-carbon-600 hover:text-carbon-900 hover:bg-carbon-50 rounded-lg transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 lg:px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-carbon-900 mb-2">Welcome back, {user.name}!</h1>
          <p className="text-carbon-600">Track your development carbon footprint and make a positive impact.</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="dashboard-card p-6">
            <h3 className="text-lg font-semibold text-carbon-900 mb-4">Carbon Footprint</h3>
            <div className="text-3xl font-bold text-primary-500 mb-2">42.5 kg</div>
            <p className="text-sm text-carbon-600">CO₂ this month</p>
          </div>

          <div className="dashboard-card p-6">
            <h3 className="text-lg font-semibold text-carbon-900 mb-4">Repositories</h3>
            <div className="text-3xl font-bold text-scientific-500 mb-2">12</div>
            <p className="text-sm text-carbon-600">Active projects</p>
          </div>

          <div className="dashboard-card p-6">
            <h3 className="text-lg font-semibold text-carbon-900 mb-4">Efficiency Score</h3>
            <div className="text-3xl font-bold text-efficiency-500 mb-2">8.7</div>
            <p className="text-sm text-carbon-600">Out of 10</p>
          </div>
        </div>

        <div className="mt-8 dashboard-card p-6">
          <h2 className="text-xl font-semibold text-carbon-900 mb-4">Getting Started</h2>
          <p className="text-carbon-600 mb-6">
            Welcome to EcoTrace! We're setting up your carbon footprint tracking. Connect your repositories to start monitoring your environmental impact.
          </p>
          
          <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
              <span className="text-sm font-medium text-primary-700">Connected to GitHub</span>
            </div>
            <p className="text-sm text-primary-600">
              Your GitHub account is connected. Repository scanning will begin shortly.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}