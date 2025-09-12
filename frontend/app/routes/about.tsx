import type { MetaFunction } from '@remix-run/node';
import { Link } from '@remix-run/react';
import { Button } from '@shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/components/ui/card';
import { Badge } from '@shared/components/ui/badge';
import { Separator } from '@shared/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@shared/components/ui/tabs';
import { Alert, AlertDescription } from '@shared/components/ui/alert';
import { ArrowLeft, Github, Shield, Target, Users, Zap, Calendar, CheckCircle2 } from 'lucide-react';

export const meta: MetaFunction = () => {
  return [
    { title: 'About - EcoTrace' },
    {
      name: 'description',
      content:
        'Learn about EcoTrace and our mission to make software development more sustainable.',
    },
  ];
};

const values = [
  {
    icon: Target,
    title: 'Mission-Driven',
    description: 'We believe every line of code can contribute to a more sustainable future.',
  },
  {
    icon: Users,
    title: 'Community-First',
    description:
      'Building a global community of developers committed to environmental responsibility.',
  },
  {
    icon: Zap,
    title: 'Innovation',
    description: 'Leveraging cutting-edge technology to measure and reduce carbon emissions.',
  },
  {
    icon: Shield,
    title: 'Transparency',
    description: 'Open-source methodology and clear communication about our impact calculations.',
  },
];

export default function About() {
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
                <Calendar className="h-3 w-3 mr-1" />
                Founded 2025
              </Badge>
              <Badge variant="secondary" className="text-xs">
                Open Source
              </Badge>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold">About EcoTrace</h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Making software development more sustainable, one commit at a time.
            </p>
          </div>

          <Alert className="max-w-2xl mx-auto">
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              EcoTrace was created during the Appwrite Hackathon to help developers understand 
              and reduce their environmental impact through data-driven insights.
            </AlertDescription>
          </Alert>

          <Tabs defaultValue="story" className="space-y-8">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="story">Our Story</TabsTrigger>
              <TabsTrigger value="mission">Our Mission</TabsTrigger>
              <TabsTrigger value="values">Our Values</TabsTrigger>
            </TabsList>

            <TabsContent value="story" className="space-y-6">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    <span>The Beginning</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground leading-relaxed">
                    EcoTrace was born from a simple observation: the tech industry's carbon footprint
                    is growing exponentially, yet most developers have no visibility into their
                    environmental impact.
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    Founded in 2025, EcoTrace emerged from the Appwrite Hackathon with a clear vision:
                    to empower developers with the tools and insights needed to reduce their carbon
                    footprint. We believe that awareness is the first step toward meaningful change.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="mission" className="space-y-6">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Target className="h-5 w-5 text-primary" />
                    <span>What We Do</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground leading-relaxed">
                    We provide a comprehensive platform that helps developers understand and reduce their environmental impact:
                  </p>
                  <div className="grid gap-3">
                    <div className="flex items-start space-x-3">
                      <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">Tracks carbon emissions from GitHub activities in real-time</span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">Calculates the environmental impact of CI/CD pipelines</span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">Offers actionable insights to reduce emissions</span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">Creates healthy competition through team leaderboards</span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">Provides transparent methodology backed by scientific research</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="values" className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                {values.map((value, index) => {
                  const Icon = value.icon;
                  return (
                    <Card key={index} className="bg-card border-border hover:border-primary/50 transition-colors">
                      <CardHeader>
                        <div className="flex items-start space-x-4">
                          <div className="bg-primary/10 p-3 rounded-lg">
                            <Icon className="h-6 w-6 text-primary" />
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-lg flex items-center justify-between">
                              {value.title}
                              <Badge variant="outline" className="text-xs">Core</Badge>
                            </CardTitle>
                            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                              {value.description}
                            </p>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>

          <Separator />

          <div className="text-center space-y-6">
            <h2 className="text-2xl font-semibold">Join the Movement</h2>
            <p className="text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              Whether you're an individual developer or part of a large team, EcoTrace provides
              the tools you need to understand and reduce your carbon footprint. Together, we
              can make software development more sustainable.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="shadow-sm">
                <Link to="/">
                  Get Started
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="shadow-sm">
                <a
                  href="https://github.com/nksrentas/appwrite-hackathon"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Github className="h-5 w-5 mr-2" />
                  View on GitHub
                </a>
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
