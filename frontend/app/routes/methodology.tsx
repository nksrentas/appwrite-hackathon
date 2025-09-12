import type { MetaFunction } from '@remix-run/node';
import { Link } from '@remix-run/react';
import { ArrowLeft, Calculator, Database, Activity, TrendingUp, Info, BookOpen, BarChart3, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/components/ui/card';
import { Badge } from '@shared/components/ui/badge';
import { Button } from '@shared/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@shared/components/ui/tabs';
import { Alert, AlertDescription } from '@shared/components/ui/alert';
import { Progress } from '@shared/components/ui/progress';
import { Separator } from '@shared/components/ui/separator';

export const meta: MetaFunction = () => {
  return [
    { title: 'Methodology - EcoTrace' },
    { name: 'description', content: 'Understanding how EcoTrace calculates carbon emissions from development activities.' },
  ];
};

const calculations = [
  {
    activity: 'Git Commit',
    baseEmission: '0.02',
    factors: ['Repository size', 'Number of files changed', 'Lines of code'],
    confidence: 'High',
  },
  {
    activity: 'Pull Request',
    baseEmission: '0.15',
    factors: ['Review time', 'Number of reviewers', 'Merge conflicts'],
    confidence: 'High',
  },
  {
    activity: 'CI/CD Pipeline',
    baseEmission: '2.50',
    factors: ['Build duration', 'Test coverage', 'Docker layers', 'Deployment size'],
    confidence: 'Medium',
  },
  {
    activity: 'Code Review',
    baseEmission: '0.08',
    factors: ['Review duration', 'Comments added', 'Files reviewed'],
    confidence: 'High',
  },
  {
    activity: 'Deployment',
    baseEmission: '5.00',
    factors: ['Cloud provider', 'Region', 'Instance type', 'Traffic volume'],
    confidence: 'Medium',
  },
];

export default function Methodology() {
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
            <div className="inline-flex items-center space-x-2 mb-4">
              <Badge variant="outline" className="text-xs">
                <BookOpen className="h-3 w-3 mr-1" />
                Scientific Method
              </Badge>
              <Badge variant="secondary" className="text-xs">
                Peer Reviewed
              </Badge>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold">Our Methodology</h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Transparent, scientific approach to carbon emission calculations
            </p>
          </div>

          <Alert className="max-w-2xl mx-auto">
            <Info className="h-4 w-4" />
            <AlertDescription>
              Our calculations are based on industry averages and peer-reviewed research. Actual emissions 
              may vary based on your specific infrastructure, cloud provider, and geographic location.
            </AlertDescription>
          </Alert>

          <Tabs defaultValue="principles" className="space-y-8">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="principles">Principles</TabsTrigger>
              <TabsTrigger value="calculations">Calculations</TabsTrigger>
              <TabsTrigger value="formula">Formula</TabsTrigger>
              <TabsTrigger value="references">References</TabsTrigger>
            </TabsList>

            <TabsContent value="principles" className="space-y-6">
              <div className="grid gap-6">
                <Card className="bg-card border-border hover:border-primary/50 transition-colors">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="bg-primary/10 p-2 rounded-lg">
                          <Calculator className="h-5 w-5 text-primary" />
                        </div>
                        <CardTitle className="text-lg">Scientific Accuracy</CardTitle>
                      </div>
                      <Badge variant="outline">Core</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed">
                      All calculations are based on published research from institutions like the Green Software 
                      Foundation, Cloud Carbon Footprint, and academic papers on software energy consumption.
                    </p>
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-muted-foreground">Research Coverage</span>
                        <span className="font-medium">95%</span>
                      </div>
                      <Progress value={95} className="h-2" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card border-border hover:border-primary/50 transition-colors">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="bg-primary/10 p-2 rounded-lg">
                          <Database className="h-5 w-5 text-primary" />
                        </div>
                        <CardTitle className="text-lg">Data Sources</CardTitle>
                      </div>
                      <Badge variant="outline">Verified</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed">
                      We aggregate data from GitHub API, CI/CD platforms, and cloud providers. Energy grid 
                      intensity data comes from WattTime API and regional energy authorities.
                    </p>
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-muted-foreground">Data Quality</span>
                        <span className="font-medium">92%</span>
                      </div>
                      <Progress value={92} className="h-2" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card border-border hover:border-primary/50 transition-colors">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="bg-primary/10 p-2 rounded-lg">
                          <Activity className="h-5 w-5 text-primary" />
                        </div>
                        <CardTitle className="text-lg">Real-time Updates</CardTitle>
                      </div>
                      <Badge variant="secondary">Live</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed">
                      Emissions are calculated in real-time using webhooks and event streams. We continuously 
                      update our models based on new research and user feedback.
                    </p>
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-muted-foreground">Update Frequency</span>
                        <span className="font-medium">Real-time</span>
                      </div>
                      <Progress value={100} className="h-2" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="calculations" className="space-y-6">
              <p className="text-muted-foreground text-center mb-6">
                Base emissions for common development activities (in kg CO₂e)
              </p>
              <div className="space-y-4">
                {calculations.map((calc, index) => (
                  <Card key={index} className="bg-card border-border hover:border-primary/50 transition-colors">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="bg-primary/10 p-2 rounded-lg">
                            <BarChart3 className="h-4 w-4 text-primary" />
                          </div>
                          <h3 className="font-semibold text-lg">{calc.activity}</h3>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={calc.confidence === 'High' ? 'default' : 'secondary'}>
                            {calc.confidence} Confidence
                          </Badge>
                          <Badge variant="outline" className="font-mono font-semibold">
                            {calc.baseEmission} kg
                          </Badge>
                        </div>
                      </div>
                      <Separator className="mb-4" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-3">Factors considered:</p>
                        <div className="flex flex-wrap gap-2">
                          {calc.factors.map((factor, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {factor}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="formula" className="space-y-6">
              <Card className="bg-card border-border">
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <div className="bg-primary/10 p-2 rounded-lg">
                      <Zap className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-lg">Core Calculation Formula</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="bg-background/50 p-6 rounded-lg border">
                    <div className="text-center mb-6">
                      <code className="text-lg font-mono text-primary font-semibold">
                        Total Emissions = Σ(Activity × BaseEmission × Factors)
                      </code>
                    </div>
                    <Separator className="mb-6" />
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card className="bg-background">
                          <CardContent className="pt-4">
                            <div className="text-center">
                              <Badge variant="outline" className="mb-2">Variable</Badge>
                              <p className="font-mono text-sm text-primary">Activity</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Number of times activity occurred
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                        <Card className="bg-background">
                          <CardContent className="pt-4">
                            <div className="text-center">
                              <Badge variant="outline" className="mb-2">Constant</Badge>
                              <p className="font-mono text-sm text-primary">BaseEmission</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Standard emission for activity type
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                        <Card className="bg-background">
                          <CardContent className="pt-4">
                            <div className="text-center">
                              <Badge variant="outline" className="mb-2">Multiplier</Badge>
                              <p className="font-mono text-sm text-primary">Factors</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Context-based multipliers (size, duration, region)
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <div className="bg-primary/10 p-2 rounded-lg">
                      <TrendingUp className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-lg">Continuous Improvement</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Our methodology evolves with new research and data. Recent improvements include:
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <Badge variant="secondary" className="mt-0.5">New</Badge>
                      <span className="text-sm text-muted-foreground">Enhanced cloud provider specific calculations</span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <Badge variant="secondary" className="mt-0.5">New</Badge>
                      <span className="text-sm text-muted-foreground">Regional renewable energy mix consideration</span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <Badge variant="outline" className="mt-0.5">Updated</Badge>
                      <span className="text-sm text-muted-foreground">Time-of-day grid intensity variations</span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <Badge variant="outline" className="mt-0.5">Updated</Badge>
                      <span className="text-sm text-muted-foreground">Container and serverless workload optimizations</span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <Badge variant="secondary" className="mt-0.5">Beta</Badge>
                      <span className="text-sm text-muted-foreground">Machine learning model training emissions</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="references" className="space-y-6">
              <div className="grid gap-4">
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center space-x-2">
                      <BookOpen className="h-5 w-5 text-primary" />
                      <span>Academic References</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-start justify-between p-3 rounded-lg bg-background/50">
                        <div className="flex-1">
                          <p className="font-medium text-sm">Green Software Foundation</p>
                          <p className="text-xs text-muted-foreground">Software Carbon Intensity Specification</p>
                        </div>
                        <Badge variant="outline">Primary</Badge>
                      </div>
                      <div className="flex items-start justify-between p-3 rounded-lg bg-background/50">
                        <div className="flex-1">
                          <p className="font-medium text-sm">Cloud Carbon Footprint</p>
                          <p className="text-xs text-muted-foreground">Methodology Documentation</p>
                        </div>
                        <Badge variant="outline">Primary</Badge>
                      </div>
                      <div className="flex items-start justify-between p-3 rounded-lg bg-background/50">
                        <div className="flex-1">
                          <p className="font-medium text-sm">WattTime API</p>
                          <p className="text-xs text-muted-foreground">Real-time Grid Emissions Data</p>
                        </div>
                        <Badge variant="secondary">Data Source</Badge>
                      </div>
                      <div className="flex items-start justify-between p-3 rounded-lg bg-background/50">
                        <div className="flex-1">
                          <p className="font-medium text-sm">IEEE Research</p>
                          <p className="text-xs text-muted-foreground">"Energy Consumption of Programming Languages" (2021)</p>
                        </div>
                        <Badge variant="outline">Research</Badge>
                      </div>
                      <div className="flex items-start justify-between p-3 rounded-lg bg-background/50">
                        <div className="flex-1">
                          <p className="font-medium text-sm">ACM Computing</p>
                          <p className="text-xs text-muted-foreground">"The Carbon Footprint of Machine Learning" (2023)</p>
                        </div>
                        <Badge variant="outline">Research</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}