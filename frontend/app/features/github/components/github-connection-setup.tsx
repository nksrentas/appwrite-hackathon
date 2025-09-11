import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from '@remix-run/react';
import { motion, AnimatePresence } from 'framer-motion';
import { GitBranch, Shield, CheckCircle2, XCircle, AlertTriangle, ExternalLink, Loader2 } from 'lucide-react';

import { Button } from '~/shared/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/shared/components/ui/card';
import { Alert, AlertDescription } from '~/shared/components/ui/alert';
import { Badge } from '~/shared/components/ui/badge';
import { useGitHubStore } from '../stores/github.store';
import { useToast } from '~/shared/hooks/use-toast';

interface PermissionItem {
  permission: string;
  description: string;
  why: string;
  granted: boolean;
}

const requiredPermissions: PermissionItem[] = [
  {
    permission: 'Repository metadata',
    description: 'Name, language, size, and visibility',
    why: 'To display repository information and calculate carbon footprint based on project characteristics',
    granted: true
  },
  {
    permission: 'Commit history',
    description: 'Timestamps, authors, and file changes',
    why: 'To track development activity and calculate carbon impact of code changes',
    granted: true
  },
  {
    permission: 'CI/CD events',
    description: 'Build runs, deployments, and duration',
    why: 'To measure energy consumption of automated processes and infrastructure usage',
    granted: true
  },
  {
    permission: 'Webhook management',
    description: 'Create and manage repository webhooks',
    why: 'To receive real-time updates about repository activities for immediate carbon tracking',
    granted: true
  }
];

const forbiddenAccess = [
  'Your source code content',
  'Issues, pull requests, or discussions',
  'Repository settings or admin functions',
  'Personal or sensitive information',
  'Write access to your repositories'
];

export function GitHubConnectionSetup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  const {
    isConnected,
    isConnecting,
    connectionError,
    initiateConnection,
    handleOAuthCallback,
    clearError
  } = useGitHubStore();

  const [setupStep, setSetupStep] = useState<'intro' | 'connecting' | 'callback' | 'success'>('intro');
  const [callbackProcessed, setCallbackProcessed] = useState(false);

  // Handle OAuth callback
  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      toast({
        title: 'Connection Failed',
        description: `GitHub OAuth error: ${error}`,
        variant: 'destructive',
      });
      setSetupStep('intro');
      return;
    }

    if (code && state && !callbackProcessed) {
      setCallbackProcessed(true);
      setSetupStep('callback');
      
      handleOAuthCallback(code, state)
        .then(() => {
          setSetupStep('success');
          toast({
            title: 'GitHub Connected!',
            description: 'Your GitHub account has been successfully connected.',
          });
          
          // Redirect to repository selection after brief success display
          setTimeout(() => {
            navigate('/integrations/github/repositories');
          }, 2000);
        })
        .catch((error) => {
          console.error('OAuth callback error:', error);
          setSetupStep('intro');
          toast({
            title: 'Connection Failed',
            description: error.message || 'Failed to complete GitHub connection',
            variant: 'destructive',
          });
        });
    }
  }, [searchParams, handleOAuthCallback, callbackProcessed, toast, navigate]);

  const handleConnectGitHub = async () => {
    try {
      clearError('connection');
      setSetupStep('connecting');
      
      const { authUrl } = await initiateConnection();
      
      // Redirect to GitHub OAuth
      window.location.href = authUrl;
    } catch (error) {
      console.error('Failed to initiate connection:', error);
      setSetupStep('intro');
      toast({
        title: 'Connection Failed',
        description: error instanceof Error ? error.message : 'Failed to connect to GitHub',
        variant: 'destructive',
      });
    }
  };

  if (isConnected && setupStep !== 'success') {
    navigate('/integrations/github/repositories');
    return null;
  }

  return (
    <div className="container mx-auto max-w-4xl py-8 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <GitBranch className="w-8 h-8 text-primary" />
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <Shield className="w-4 h-4 text-green-600" />
              </div>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Connect Your GitHub Account
          </h1>
          <p className="text-lg text-gray-600">
            Start tracking your development carbon footprint in seconds
          </p>
        </div>

        <AnimatePresence mode="wait">
          {setupStep === 'intro' && (
            <motion.div
              key="intro"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* Privacy & Permissions Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="w-5 h-5 text-green-600" />
                      Privacy-First Integration
                    </CardTitle>
                    <CardDescription>
                      We request minimal permissions for carbon tracking only
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-medium text-green-800 mb-3 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        What we access:
                      </h4>
                      <div className="space-y-3">
                        {requiredPermissions.map((perm) => (
                          <div key={perm.permission} className="border-l-2 border-green-200 pl-3">
                            <div className="flex items-center gap-2 mb-1">
                              <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                              <span className="font-medium text-sm">{perm.permission}</span>
                            </div>
                            <p className="text-xs text-gray-600 mb-1">{perm.description}</p>
                            <p className="text-xs text-green-700">{perm.why}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-red-800 mb-3 flex items-center gap-2">
                        <XCircle className="w-4 h-4" />
                        What we DON'T access:
                      </h4>
                      <div className="space-y-2">
                        {forbiddenAccess.map((item) => (
                          <div key={item} className="flex items-center gap-2">
                            <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                            <span className="text-sm text-gray-700">{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Benefits Card */}
                <Card>
                  <CardHeader>
                    <CardTitle>🌱 What You'll Get</CardTitle>
                    <CardDescription>
                      Comprehensive carbon footprint tracking for your development workflow
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <Badge variant="secondary" className="mt-0.5">Commits</Badge>
                        <div>
                          <p className="font-medium text-sm">Development Activity</p>
                          <p className="text-xs text-gray-600">Track carbon impact of code changes and development practices</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <Badge variant="secondary" className="mt-0.5">CI/CD</Badge>
                        <div>
                          <p className="font-medium text-sm">Build & Deploy Energy</p>
                          <p className="text-xs text-gray-600">Monitor energy consumption of automated workflows and infrastructure</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <Badge variant="secondary" className="mt-0.5">Analytics</Badge>
                        <div>
                          <p className="font-medium text-sm">Carbon Insights</p>
                          <p className="text-xs text-gray-600">Get detailed reports and suggestions for reducing your carbon footprint</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <Badge variant="secondary" className="mt-0.5">Real-time</Badge>
                        <div>
                          <p className="font-medium text-sm">Live Updates</p>
                          <p className="text-xs text-gray-600">Receive immediate feedback on the environmental impact of your activities</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {connectionError && (
                <Alert variant="destructive" className="mb-6">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{connectionError}</AlertDescription>
                </Alert>
              )}

              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="pt-6 text-center">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold mb-2">Ready to get started?</h3>
                    <p className="text-gray-600">
                      Connect with GitHub to begin tracking your development carbon footprint
                    </p>
                  </div>
                  
                  <Button
                    size="lg"
                    onClick={handleConnectGitHub}
                    disabled={isConnecting}
                    className="relative"
                  >
                    {isConnecting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <GitBranch className="w-4 h-4 mr-2" />
                    )}
                    {isConnecting ? 'Connecting...' : 'Connect with GitHub'}
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </Button>
                  
                  <p className="text-xs text-gray-500 mt-3">
                    You'll be redirected to GitHub to authorize this connection
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {setupStep === 'connecting' && (
            <motion.div
              key="connecting"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.3 }}
              className="text-center py-16"
            >
              <div className="mb-6">
                <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Redirecting to GitHub...</h2>
              <p className="text-gray-600">
                You'll be asked to authorize EcoTrace to access your repository metadata
              </p>
            </motion.div>
          )}

          {setupStep === 'callback' && (
            <motion.div
              key="callback"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="text-center py-16"
            >
              <div className="mb-6">
                <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Completing Connection...</h2>
              <p className="text-gray-600">
                Setting up your GitHub integration and syncing repository data
              </p>
            </motion.div>
          )}

          {setupStep === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="text-center py-16"
            >
              <div className="mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
              </div>
              <h2 className="text-xl font-semibold mb-2 text-green-800">Connection Successful!</h2>
              <p className="text-gray-600 mb-4">
                Your GitHub account has been connected. Redirecting to repository selection...
              </p>
              <div className="inline-flex items-center text-sm text-gray-500">
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Setting up your repositories
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}