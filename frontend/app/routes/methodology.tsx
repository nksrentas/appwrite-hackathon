import type { MetaFunction } from '@remix-run/node';
import { Link } from '@remix-run/react';
import { ArrowLeft, Calculator, Database, Activity, TrendingUp, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/components/ui/card';
import { Badge } from '@shared/components/ui/badge';

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
      <nav className="px-6 py-3 border-b border-border">
        <div className="max-w-7xl mx-auto">
          <Link to="/" className="inline-flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors duration-200">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Home</span>
          </Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-16">
        <div className="space-y-12">
          <div className="text-center space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold">Our Methodology</h1>
            <p className="text-xl text-muted-foreground">
              Transparent, scientific approach to carbon emission calculations
            </p>
          </div>

          <Card className="bg-primary/5 border-primary/20">
            <CardHeader>
              <div className="flex items-start space-x-3">
                <Info className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <CardTitle className="text-lg">Important Note</CardTitle>
                  <p className="text-sm text-muted-foreground mt-2">
                    Our calculations are based on industry averages and peer-reviewed research. Actual emissions 
                    may vary based on your specific infrastructure, cloud provider, and geographic location.
                  </p>
                </div>
              </div>
            </CardHeader>
          </Card>

          <div className="space-y-8">
            <section>
              <h2 className="text-2xl font-semibold mb-4">Core Principles</h2>
              <div className="grid gap-4">
                <Card className="bg-card border-border">
                  <CardHeader>
                    <div className="flex items-center space-x-3">
                      <Calculator className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg">Scientific Accuracy</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      All calculations are based on published research from institutions like the Green Software 
                      Foundation, Cloud Carbon Footprint, and academic papers on software energy consumption.
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-card border-border">
                  <CardHeader>
                    <div className="flex items-center space-x-3">
                      <Database className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg">Data Sources</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      We aggregate data from GitHub API, CI/CD platforms, and cloud providers. Energy grid 
                      intensity data comes from WattTime API and regional energy authorities.
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-card border-border">
                  <CardHeader>
                    <div className="flex items-center space-x-3">
                      <Activity className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg">Real-time Updates</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      Emissions are calculated in real-time using webhooks and event streams. We continuously 
                      update our models based on new research and user feedback.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Emission Calculations</h2>
              <p className="text-muted-foreground mb-6">
                Base emissions for common development activities (in kg CO₂e):
              </p>
              <div className="space-y-4">
                {calculations.map((calc, index) => (
                  <Card key={index} className="bg-card border-border">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="font-semibold text-lg">{calc.activity}</h3>
                        <div className="flex items-center gap-2">
                          <Badge variant={calc.confidence === 'High' ? 'default' : 'secondary'}>
                            {calc.confidence} Confidence
                          </Badge>
                          <span className="text-primary font-mono font-semibold">
                            {calc.baseEmission} kg
                          </span>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Factors considered:</p>
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
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Calculation Formula</h2>
              <Card className="bg-card border-border">
                <CardContent className="pt-6">
                  <div className="bg-background/50 p-4 rounded-lg font-mono text-sm">
                    <p className="text-primary mb-2">Total Emissions = Σ(Activity × BaseEmission × Factors)</p>
                    <p className="text-muted-foreground">Where:</p>
                    <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1 ml-4">
                      <li>Activity = Number of times activity occurred</li>
                      <li>BaseEmission = Standard emission for activity type</li>
                      <li>Factors = Multipliers based on context (size, duration, region)</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Continuous Improvement</h2>
              <Card className="bg-card border-border">
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Model Updates</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Our methodology evolves with new research and data. Recent improvements include:
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                    <li>Enhanced cloud provider specific calculations</li>
                    <li>Regional renewable energy mix consideration</li>
                    <li>Time-of-day grid intensity variations</li>
                    <li>Container and serverless workload optimizations</li>
                    <li>Machine learning model training emissions</li>
                  </ul>
                </CardContent>
              </Card>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">References</h2>
              <Card className="bg-card border-border">
                <CardContent className="pt-6">
                  <ul className="space-y-3 text-muted-foreground">
                    <li>• Green Software Foundation - Software Carbon Intensity Specification</li>
                    <li>• Cloud Carbon Footprint - Methodology Documentation</li>
                    <li>• WattTime API - Real-time Grid Emissions Data</li>
                    <li>• IEEE - "Energy Consumption of Programming Languages" (2021)</li>
                    <li>• ACM - "The Carbon Footprint of Machine Learning" (2023)</li>
                  </ul>
                </CardContent>
              </Card>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}