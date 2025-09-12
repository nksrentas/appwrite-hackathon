import type { MetaFunction } from '@remix-run/node';
import { Link } from '@remix-run/react';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/components/ui/card';
import { Button } from '@shared/components/ui/button';
import { Badge } from '@shared/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@shared/components/ui/tabs';
import { Alert, AlertDescription } from '@shared/components/ui/alert';
import { Separator } from '@shared/components/ui/separator';
import { ArrowLeft, Database, Eye, Lock, Mail, Shield, UserCheck, CheckCircle2, AlertTriangle } from 'lucide-react';

export const meta: MetaFunction = () => {
  return [
    { title: 'Privacy Policy - EcoTrace' },
    {
      name: 'description',
      content: 'Learn how EcoTrace protects your privacy and handles your data.',
    },
  ];
};

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="px-6 py-3 border-b border-border bg-background/95 backdrop-blur-supports-[backdrop-filter]:bg-background/95 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto">
          <Button asChild variant="ghost" className="group">
            <Link to="/" className="inline-flex items-center space-x-2">
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
              <span>Back to Home</span>
            </Link>
          </Button>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-16">
        <div className="space-y-12">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <div className="inline-flex items-center space-x-2 mb-4">
              <Badge variant="outline" className="text-xs">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                GDPR Compliant
              </Badge>
              <Badge variant="secondary" className="text-xs">
                Privacy First
              </Badge>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold">Privacy Policy</h1>
            <p className="text-xl text-muted-foreground">
              Your privacy is fundamental to our mission
            </p>
            <p className="text-sm text-muted-foreground">Last updated: December 2025</p>
          </div>

          <Alert className="max-w-2xl mx-auto">
            <Shield className="h-4 w-4" />
            <AlertDescription>
              At EcoTrace, we believe in complete transparency about how we collect, use, and
              protect your data. This policy outlines our commitment to your privacy and data
              security.
            </AlertDescription>
          </Alert>

          <div className="space-y-8">
            <section>
              <Card className="bg-card border-border">
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <Database className="h-5 w-5 text-primary" />
                    <CardTitle>Information We Collect</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">GitHub Integration Data</h3>
                    <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                      <li>Public repository information</li>
                      <li>Commit history and metadata</li>
                      <li>Pull request and issue activity</li>
                      <li>CI/CD pipeline execution data</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Account Information</h3>
                    <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                      <li>GitHub username and public profile</li>
                      <li>Email address (if provided)</li>
                      <li>OAuth tokens (encrypted and secure)</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Usage Analytics</h3>
                    <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                      <li>Feature usage patterns</li>
                      <li>Performance metrics</li>
                      <li>Error logs (anonymized)</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </section>

            <section>
              <Card className="bg-card border-border">
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <Eye className="h-5 w-5 text-primary" />
                    <CardTitle>How We Use Your Data</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-muted-foreground">We use your information exclusively to:</p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                    <li>Calculate and track your carbon emissions</li>
                    <li>Provide personalized insights and recommendations</li>
                    <li>Generate team and community leaderboards</li>
                    <li>Improve our calculation methodology</li>
                    <li>Send important service updates (opt-in)</li>
                  </ul>
                  <div className="mt-4 p-4 bg-destructive/5 border border-destructive/20 rounded-lg">
                    <p className="text-sm font-semibold text-destructive mb-1">We Never:</p>
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 ml-4">
                      <li>Sell your data to third parties</li>
                      <li>Share individual data without consent</li>
                      <li>Use your code or proprietary information</li>
                      <li>Access private repositories</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </section>

            <section>
              <Card className="bg-card border-border">
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <Lock className="h-5 w-5 text-primary" />
                    <CardTitle>Data Security</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-muted-foreground">
                    We implement industry-standard security measures to protect your data:
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                    <li>End-to-end encryption for sensitive data</li>
                    <li>Secure OAuth 2.0 authentication</li>
                    <li>Regular security audits and updates</li>
                    <li>Isolated data storage with access controls</li>
                    <li>Automatic data backup and recovery</li>
                  </ul>
                </CardContent>
              </Card>
            </section>

            <section>
              <Card className="bg-card border-border">
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <UserCheck className="h-5 w-5 text-primary" />
                    <CardTitle>Your Rights</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-muted-foreground">You have complete control over your data:</p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                    <li>
                      <strong>Access:</strong> Request a copy of all your data
                    </li>
                    <li>
                      <strong>Correction:</strong> Update or correct your information
                    </li>
                    <li>
                      <strong>Deletion:</strong> Request complete data removal
                    </li>
                    <li>
                      <strong>Portability:</strong> Export your data in standard formats
                    </li>
                    <li>
                      <strong>Opt-out:</strong> Disable specific features or tracking
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </section>

            <section>
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle>Third-Party Services</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-muted-foreground">
                    We integrate with the following services to provide our functionality:
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                    <li>
                      <strong>GitHub:</strong> Repository and activity data
                    </li>
                    <li>
                      <strong>Appwrite:</strong> Authentication and database
                    </li>
                    <li>
                      <strong>WattTime:</strong> Grid carbon intensity data
                    </li>
                    <li>
                      <strong>Cloud Providers:</strong> Infrastructure metrics
                    </li>
                  </ul>
                  <p className="text-muted-foreground mt-4">
                    Each service has its own privacy policy. We only share the minimum data
                    necessary for functionality.
                  </p>
                </CardContent>
              </Card>
            </section>

            <section>
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle>Data Retention</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-3">
                    We retain your data according to the following schedule:
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                    <li>Activity data: 12 months</li>
                    <li>Aggregated metrics: Indefinitely (anonymized)</li>
                    <li>Account data: Until deletion requested</li>
                    <li>Security logs: 90 days</li>
                  </ul>
                </CardContent>
              </Card>
            </section>

            <section>
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle>Cookies and Tracking</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    We use minimal cookies essential for functionality:
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4 mt-3">
                    <li>Authentication tokens</li>
                    <li>Session management</li>
                    <li>User preferences</li>
                  </ul>
                  <p className="text-muted-foreground mt-3">
                    We do not use tracking cookies or advertising networks.
                  </p>
                </CardContent>
              </Card>
            </section>

            <section>
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle>Changes to This Policy</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    We may update this policy to reflect changes in our practices or legal
                    requirements. We will notify you of significant changes via email or dashboard
                    notification at least 30 days before they take effect.
                  </p>
                </CardContent>
              </Card>
            </section>

            <section>
              <Card className="bg-card border-border">
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <Mail className="h-5 w-5 text-primary" />
                    <CardTitle>Contact Us</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-3">
                    For privacy concerns or data requests, contact us at:
                  </p>
                  <div className="space-y-2 text-muted-foreground">
                    <p>Email: privacy@ecotrace.dev</p>
                    <p>
                      GitHub:{' '}
                      <a
                        href="https://github.com/nksrentas/appwrite-hackathon"
                        className="text-primary hover:underline"
                      >
                        @nksrentas/appwrite-hackathon
                      </a>
                    </p>
                  </div>
                  <p className="text-muted-foreground mt-4">
                    We respond to all privacy requests within 48 hours.
                  </p>
                </CardContent>
              </Card>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
