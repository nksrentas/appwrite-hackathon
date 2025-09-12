import type { MetaFunction, LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { Link } from '@remix-run/react';
import { useEffect } from 'react';
import { Github, Leaf, BarChart, Users, Shield, Zap, CheckCircle2, TrendingUp } from 'lucide-react';
import { useAuthStore } from '@features/auth/stores/auth.store';
import { Button } from '@shared/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/components/ui/card';
import { Badge } from '@shared/components/ui/badge';
import { Separator } from '@shared/components/ui/separator';
import { Alert, AlertDescription } from '@shared/components/ui/alert';

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
    <div className="min-h-screen bg-background">
      <nav className="px-6 py-3 border-b border-border">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-primary p-2 rounded-lg">
              <Leaf className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-display-md font-bold">EcoTrace</span>
          </div>

          <div className="flex items-center space-x-6">
            <Link
              to="/about"
              className="text-body-md text-muted-foreground hover:text-foreground transition-colors duration-200"
            >
              About
            </Link>
            <Link
              to="/methodology"
              className="text-body-md text-muted-foreground hover:text-foreground transition-colors duration-200"
            >
              Methodology
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-16 lg:py-24">
        <div className="text-center space-y-8 mb-16">
          <div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight">
              Track Your{' '}
              <span className="text-primary">
                Code's
              </span>{' '}
              Carbon Footprint
            </h1>
          </div>

          <p className="text-body-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Monitor the environmental impact of your development activities in real-time. Connect
            with GitHub, track emissions from commits and CI runs, and join a community committed to
            sustainable software development.
          </p>

          <div>
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg max-w-md mx-auto mb-4">
                {error}
              </div>
            )}

            <Button
              onClick={handleSignIn}
              disabled={isLoading}
              size="lg"
              className="px-8 py-4 text-lg font-medium"
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

          <div className="flex items-center justify-center space-x-4 text-body-sm">
            <Badge variant="outline" className="text-xs">
              <Shield className="h-3 w-3 mr-1" />
              Secure OAuth
            </Badge>
            <Badge variant="outline" className="text-xs">
              <Leaf className="h-3 w-3 mr-1" />
              Privacy First
            </Badge>
            <Badge variant="secondary" className="text-xs">
              Free Forever
            </Badge>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card key={index} className="bg-card border-border hover:border-primary/50 transition-all duration-200 group">
                <CardHeader>
                  <div className="flex items-start space-x-4">
                    <div className="bg-primary/10 p-3 rounded-lg flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{feature.title}</CardTitle>
                        <Badge variant="outline" className="text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                          Core
                        </Badge>
                      </div>
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

        <Separator className="my-16" />

        <div className="text-center space-y-8">
          <div className="space-y-4">
            <Badge variant="outline" className="text-xs">
              <TrendingUp className="h-3 w-3 mr-1" />
              Growing Community
            </Badge>
            <h2 className="text-display-md font-bold">
              Join the Sustainable Development Movement
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Be part of a community that's making a real difference in reducing the environmental impact of software development.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <Card className="bg-card border-border hover:border-primary/50 transition-colors">
              <CardContent className="pt-6 text-center">
                <div className="flex items-center justify-center mb-2">
                  <div className="text-4xl font-bold text-primary">10k+</div>
                  <Badge variant="secondary" className="ml-2 text-xs">+12%</Badge>
                </div>
                <div className="text-muted-foreground">Developers Tracking</div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border hover:border-primary/50 transition-colors">
              <CardContent className="pt-6 text-center">
                <div className="flex items-center justify-center mb-2">
                  <div className="text-4xl font-bold text-primary">2.5M</div>
                  <Badge variant="secondary" className="ml-2 text-xs">+8%</Badge>
                </div>
                <div className="text-muted-foreground">Activities Monitored</div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border hover:border-primary/50 transition-colors">
              <CardContent className="pt-6 text-center">
                <div className="flex items-center justify-center mb-2">
                  <div className="text-4xl font-bold text-primary">150kg</div>
                  <Badge variant="secondary" className="ml-2 text-xs">+25%</Badge>
                </div>
                <div className="text-muted-foreground">CO₂ Saved This Month</div>
              </CardContent>
            </Card>
          </div>

          <Alert className="max-w-2xl mx-auto text-left">
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              <strong>Join today</strong> and get instant access to your carbon footprint dashboard, 
              real-time insights, and tools to reduce your environmental impact.
            </AlertDescription>
          </Alert>
        </div>
      </main>

      <footer className="border-t border-border py-8 mt-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex items-center space-x-3">
              <div className="bg-primary p-2 rounded-lg">
                <Leaf className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-semibold">EcoTrace</span>
            </div>

            <div className="flex items-center space-x-6 text-body-sm text-muted-foreground">
              <Link to="/privacy" className="hover:text-foreground transition-colors duration-200">
                Privacy Policy
              </Link>
              <Link to="/terms" className="hover:text-foreground transition-colors duration-200">
                Terms of Service
              </Link>
              <a
                href="https://github.com/nksrentas/appwrite-hackathon"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors duration-200"
              >
                Open Source
              </a>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-border text-center text-caption text-muted-foreground">
            © 2024 EcoTrace. Building a more sustainable future, one commit at a time.
          </div>
        </div>
      </footer>
    </div>
  );
}