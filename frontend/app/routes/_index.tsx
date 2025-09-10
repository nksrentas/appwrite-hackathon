import type { MetaFunction, LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { Link } from '@remix-run/react';
import { useEffect } from 'react';
import { Github, Leaf, BarChart, Users, Shield, Zap } from 'lucide-react';
import { useAuthStore } from '@features/auth/stores/auth.store';
import { Button } from '@shared/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/components/ui/card';

export const meta: MetaFunction = () => {
  return [
    { title: 'EcoTrace - Carbon Footprint Tracking for Developers' },
    {
      name: 'description',
      content:
        'Track your development carbon footprint in real-time. Monitor GitHub activities, get insights, and reduce your environmental impact.',
    },
  ];
};

export async function loader({ request }: LoaderFunctionArgs) {
  return json({});
}

const features = [
  {
    icon: BarChart,
    title: 'Real-time Tracking',
    description: 'Monitor carbon emissions from commits, PRs, and CI runs in real-time',
  },
  {
    icon: Github,
    title: 'GitHub Integration',
    description: 'Seamlessly connect with your GitHub repositories and activities',
  },
  {
    icon: Users,
    title: 'Team Leaderboards',
    description: 'Compare efficiency with peers and drive sustainable development',
  },
  {
    icon: Shield,
    title: 'Data Transparency',
    description: 'Scientific methodology with confidence levels and source attribution',
  },
  {
    icon: Zap,
    title: 'Efficiency Insights',
    description: 'Get actionable insights to reduce your development carbon footprint',
  },
  {
    icon: Leaf,
    title: 'Environmental Impact',
    description: 'Understand and minimize the environmental impact of your code',
  },
];

export default function Index() {
  const { signIn, isLoading, error, clearError } = useAuthStore();

  useEffect(() => {
    clearError();
  }, [clearError]);

  const handleSignIn = async () => {
    try {
      await signIn();
    } catch (err) {
      console.error('Sign in failed:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-carbon-50 via-primary-50/30 to-scientific-50/20">
      <nav className="px-4 lg:px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-primary-500 p-2 rounded-lg carbon-glow">
              <Leaf className="h-6 w-6 text-white" />
            </div>
            <span className="text-display-md text-carbon-900 font-bold">EcoTrace</span>
          </div>

          <div className="flex items-center space-x-4">
            <Link
              to="/about"
              className="text-body-md text-carbon-600 hover:text-carbon-900 transition-colors"
            >
              About
            </Link>
            <Link
              to="/methodology"
              className="text-body-md text-carbon-600 hover:text-carbon-900 transition-colors"
            >
              Methodology
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 lg:px-6 py-12 lg:py-20">
        <div className="text-center space-y-8 mb-16">
          <div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-carbon-900 tracking-tight">
              Track Your{' '}
              <span className="text-primary-500 relative">
                Code's
                <svg
                  className="absolute -bottom-2 left-0 right-0 h-3 text-primary-200"
                  viewBox="0 0 200 12"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M0,8 Q50,2 100,6 T200,4"
                    stroke="currentColor"
                    strokeWidth="3"
                    fill="none"
                  />
                </svg>
              </span>{' '}
              Carbon Footprint
            </h1>
          </div>

          <p className="text-body-lg text-carbon-600 max-w-3xl mx-auto leading-relaxed">
            Monitor the environmental impact of your development activities in real-time. Connect
            with GitHub, track emissions from commits and CI runs, and join a community committed to
            sustainable software development.
          </p>

          <div>
            {error && (
              <div className="bg-danger-50 border border-danger-200 text-danger-700 px-4 py-3 rounded-lg max-w-md mx-auto mb-4">
                {error}
              </div>
            )}

            <Button
              onClick={handleSignIn}
              disabled={isLoading}
              size="lg"
              className="px-8 py-4 text-lg font-medium carbon-shadow"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin -ml-1 mr-3 h-5 w-5">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                  </div>
                  Connecting...
                </>
              ) : (
                <>
                  <Github className="w-5 h-5 mr-3" />
                  Sign in with GitHub
                </>
              )}
            </Button>
          </div>

          <div className="flex items-center justify-center space-x-4 text-body-sm text-carbon-500">
            <div className="flex items-center space-x-1">
              <Shield className="h-4 w-4" />
              <span>Secure OAuth</span>
            </div>
            <div className="w-1 h-1 bg-carbon-300 rounded-full" />
            <div className="flex items-center space-x-1">
              <Leaf className="h-4 w-4" />
              <span>Privacy First</span>
            </div>
            <div className="w-1 h-1 bg-carbon-300 rounded-full" />
            <span>Free Forever</span>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card key={index} className="hover:shadow-lg transition-shadow duration-300">
                <CardHeader>
                  <div className="flex items-start space-x-4">
                    <div className="bg-primary-100 p-3 rounded-lg flex-shrink-0">
                      <Icon className="h-6 w-6 text-primary-600" />
                    </div>
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{feature.title}</CardTitle>
                      <CardDescription className="text-body-sm leading-relaxed">
                        {feature.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>

        <div className="mt-20 text-center">
          <h2 className="text-display-md text-carbon-900 font-bold mb-12">
            Join the Sustainable Development Movement
          </h2>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="space-y-2">
              <div className="text-4xl font-bold text-primary-500">10k+</div>
              <div className="text-carbon-600">Developers Tracking</div>
            </div>
            <div className="space-y-2">
              <div className="text-4xl font-bold text-scientific-500">2.5M</div>
              <div className="text-carbon-600">Activities Monitored</div>
            </div>
            <div className="space-y-2">
              <div className="text-4xl font-bold text-efficiency-500">150kg</div>
              <div className="text-carbon-600">CO₂ Saved This Month</div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-carbon-200 py-8">
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex items-center space-x-3">
              <div className="bg-primary-500 p-2 rounded-lg">
                <Leaf className="h-5 w-5 text-white" />
              </div>
              <span className="text-carbon-900 font-semibold">EcoTrace</span>
            </div>

            <div className="flex items-center space-x-6 text-body-sm text-carbon-500">
              <Link to="/privacy" className="hover:text-carbon-700 transition-colors">
                Privacy Policy
              </Link>
              <Link to="/terms" className="hover:text-carbon-700 transition-colors">
                Terms of Service
              </Link>
              <a
                href="https://github.com/ecotrace"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-carbon-700 transition-colors"
              >
                Open Source
              </a>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-carbon-200 text-center text-caption text-carbon-400">
            © 2024 EcoTrace. Building a more sustainable future, one commit at a time.
          </div>
        </div>
      </footer>
    </div>
  );
}