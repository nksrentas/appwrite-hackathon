import type { MetaFunction } from '@remix-run/node';
import { Link } from '@remix-run/react';
import { Button } from '@shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/components/ui/card';
import { ArrowLeft, Github, Shield, Target, Users, Zap } from 'lucide-react';

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
      <nav className="px-6 py-3 border-b border-border">
        <div className="max-w-7xl mx-auto">
          <Link
            to="/"
            className="inline-flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors duration-200"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Home</span>
          </Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-16">
        <div className="space-y-12">
          <div className="text-center space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold">About EcoTrace</h1>
            <p className="text-xl text-muted-foreground">
              Making software development more sustainable, one commit at a time.
            </p>
          </div>

          <div className="prose prose-invert max-w-none space-y-6">
            <Card className="bg-card border-border">
              <CardContent className="pt-6">
                <p className="text-muted-foreground leading-relaxed">
                  EcoTrace was born from a simple observation: the tech industry's carbon footprint
                  is growing exponentially, yet most developers have no visibility into their
                  environmental impact. We're changing that by providing real-time carbon tracking
                  for development activities.
                </p>
              </CardContent>
            </Card>

            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-semibold mb-4">Our Story</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Founded in 2025, EcoTrace emerged from the Appwrite Hackathon with a clear vision:
                  to empower developers with the tools and insights needed to reduce their carbon
                  footprint. We believe that awareness is the first step toward meaningful change.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-semibold mb-4">What We Do</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  We provide a comprehensive platform that:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                  <li>Tracks carbon emissions from GitHub activities in real-time</li>
                  <li>Calculates the environmental impact of CI/CD pipelines</li>
                  <li>Offers actionable insights to reduce emissions</li>
                  <li>Creates healthy competition through team leaderboards</li>
                  <li>Provides transparent methodology backed by scientific research</li>
                </ul>
              </div>

              <div>
                <h2 className="text-2xl font-semibold mb-6">Our Values</h2>
                <div className="grid md:grid-cols-2 gap-6">
                  {values.map((value, index) => {
                    const Icon = value.icon;
                    return (
                      <Card key={index} className="bg-card border-border">
                        <CardHeader>
                          <div className="flex items-start space-x-4">
                            <div className="bg-primary/10 p-3 rounded-lg">
                              <Icon className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                              <CardTitle className="text-lg">{value.title}</CardTitle>
                              <p className="text-sm text-muted-foreground mt-2">
                                {value.description}
                              </p>
                            </div>
                          </div>
                        </CardHeader>
                      </Card>
                    );
                  })}
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-semibold mb-4">Join Us</h2>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  Whether you're an individual developer or part of a large team, EcoTrace provides
                  the tools you need to understand and reduce your carbon footprint. Together, we
                  can make software development more sustainable.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link to="/">
                    <Button size="lg">Get Started</Button>
                  </Link>
                  <a
                    href="https://github.com/nksrentas/appwrite-hackathon"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button size="lg" variant="outline">
                      <Github className="h-5 w-5 mr-2" />
                      View on GitHub
                    </Button>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
