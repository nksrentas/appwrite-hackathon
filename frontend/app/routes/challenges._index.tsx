import type { MetaFunction, LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { useState } from 'react';
import {
  Trophy,
  Target,
  Calendar,
  Users,
  Zap,
  Activity,
  Leaf,
  Clock,
  CheckCircle,
  Star,
  Award,
  Flame,
  TrendingUp,
  PlayCircle,
  PauseCircle,
  RotateCcw,
  ArrowRight,
  Filter,
  Search,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@shared/components/ui/card';
import { Button } from '@shared/components/ui/button';
import { Badge } from '@shared/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@shared/components/ui/tabs';
import { Input } from '@shared/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/components/ui/select';
import { Progress } from '@shared/components/ui/progress';
import { Separator } from '@shared/components/ui/separator';
import { Alert, AlertDescription } from '@shared/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@shared/components/ui/avatar';

export const meta: MetaFunction = () => {
  return [
    { title: 'Challenges - EcoTrace' },
    { name: 'description', content: 'Carbon reduction challenges and sustainability goals' },
  ];
};

export async function loader({ request }: LoaderFunctionArgs) {
  return json({
    timestamp: new Date().toISOString(),
  });
}

// Mock data for challenges
const mockChallenges = {
  active: [
    {
      id: 1,
      title: 'Weekly Carbon Warrior',
      description: 'Reduce your carbon footprint by 25% this week',
      type: 'individual',
      difficulty: 'medium',
      duration: 7,
      timeLeft: 3,
      progress: 67,
      target: 25,
      current: 16.75,
      reward: 500,
      participants: 1247,
      icon: Zap,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      category: 'efficiency'
    },
    {
      id: 2,
      title: 'Zero Waste Development',
      description: 'Complete 10 commits with net-zero carbon impact',
      type: 'individual',
      difficulty: 'hard',
      duration: 14,
      timeLeft: 8,
      progress: 40,
      target: 10,
      current: 4,
      reward: 750,
      participants: 643,
      icon: Target,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      category: 'milestone'
    },
    {
      id: 3,
      title: 'Team Green Sprint',
      description: 'Work with your team to save 50kg CO₂ collectively',
      type: 'team',
      difficulty: 'medium',
      duration: 21,
      timeLeft: 12,
      progress: 76,
      target: 50,
      current: 38,
      reward: 1200,
      participants: 89,
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      category: 'teamwork'
    }
  ],
  available: [
    {
      id: 4,
      title: 'Efficiency Master',
      description: 'Achieve 95% efficiency rating for 5 consecutive days',
      type: 'individual',
      difficulty: 'hard',
      duration: 5,
      reward: 600,
      requirements: ['95% efficiency rating', '5 consecutive days'],
      icon: Star,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      category: 'efficiency'
    },
    {
      id: 5,
      title: 'Early Bird Optimizer',
      description: 'Complete daily carbon optimization before 9 AM for a week',
      type: 'individual',
      difficulty: 'easy',
      duration: 7,
      reward: 300,
      requirements: ['Daily optimization', 'Before 9 AM', '7 days'],
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      category: 'habits'
    },
    {
      id: 6,
      title: 'Community Builder',
      description: 'Help 3 new developers join the carbon tracking initiative',
      type: 'community',
      difficulty: 'medium',
      duration: 30,
      reward: 800,
      requirements: ['Invite 3 developers', 'They must complete onboarding'],
      icon: Users,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      category: 'community'
    }
  ],
  completed: [
    {
      id: 7,
      title: 'First Steps',
      description: 'Complete your first carbon footprint measurement',
      completedAt: '2024-01-15T10:30:00Z',
      reward: 100,
      earnedPoints: 100,
      icon: CheckCircle,
      color: 'text-green-600',
      category: 'milestone'
    },
    {
      id: 8,
      title: 'Consistency Champion',
      description: 'Track carbon footprint for 14 consecutive days',
      completedAt: '2024-01-20T15:45:00Z',
      reward: 400,
      earnedPoints: 400,
      icon: Calendar,
      color: 'text-blue-600',
      category: 'habits'
    }
  ]
};

const challengeCategories = [
  { id: 'all', label: 'All Challenges', count: 6 },
  { id: 'efficiency', label: 'Efficiency', count: 2 },
  { id: 'milestone', label: 'Milestones', count: 2 },
  { id: 'teamwork', label: 'Teamwork', count: 1 },
  { id: 'community', label: 'Community', count: 1 }
];

const difficultyColors = {
  easy: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  hard: 'bg-red-100 text-red-800'
};

export default function Challenges() {
  const { timestamp } = useLoaderData<typeof loader>();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');

  const getDifficultyBadge = (difficulty: string) => {
    return (
      <Badge variant="secondary" className={difficultyColors[difficulty as keyof typeof difficultyColors]}>
        {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
      </Badge>
    );
  };

  const getTimeLeftText = (days: number) => {
    if (days === 1) return '1 day left';
    if (days < 1) return 'Less than 1 day';
    return `${days} days left`;
  };

  const formatReward = (points: number) => {
    return `${points.toLocaleString()} pts`;
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div>
          <h1 className="text-display-lg font-bold">Challenges</h1>
          <p className="text-body-md text-muted-foreground mt-2">
            Take on sustainability challenges and earn rewards for reducing your carbon footprint
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {challengeCategories.map(cat => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.label} ({cat.count})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="space-y-2">
              <Activity className="h-8 w-8 text-primary mx-auto" />
              <div className="text-2xl font-bold">3</div>
              <div className="text-muted-foreground">Active Challenges</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="space-y-2">
              <Trophy className="h-8 w-8 text-yellow-600 mx-auto" />
              <div className="text-2xl font-bold">2</div>
              <div className="text-muted-foreground">Completed</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="space-y-2">
              <Star className="h-8 w-8 text-orange-600 mx-auto" />
              <div className="text-2xl font-bold">500</div>
              <div className="text-muted-foreground">Points Earned</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="space-y-2">
              <Flame className="h-8 w-8 text-red-600 mx-auto" />
              <div className="text-2xl font-bold">7</div>
              <div className="text-muted-foreground">Day Streak</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Current Progress Alert */}
      <Alert>
        <TrendingUp className="h-4 w-4" />
        <AlertDescription>
          <strong>Great progress!</strong> You're on track to complete 2 challenges this week. 
          Keep up the momentum to earn bonus rewards!
        </AlertDescription>
      </Alert>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search challenges..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Difficulties" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Difficulties</SelectItem>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs defaultValue="active" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="active">Active Challenges</TabsTrigger>
          <TabsTrigger value="available">Available</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {mockChallenges.active.map((challenge) => {
              const IconComponent = challenge.icon;
              return (
                <Card key={challenge.id} className="relative overflow-hidden hover:shadow-lg transition-shadow">
                  <div className={`absolute top-0 left-0 w-full h-1 ${challenge.bgColor.replace('bg-', 'bg-gradient-to-r from-')}`} />
                  <CardHeader className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className={`p-3 rounded-lg ${challenge.bgColor}`}>
                        <IconComponent className={`h-6 w-6 ${challenge.color}`} />
                      </div>
                      <div className="flex items-center space-x-2">
                        {getDifficultyBadge(challenge.difficulty)}
                        <Badge variant="outline">
                          {challenge.type === 'team' ? <Users className="h-3 w-3 mr-1" /> : null}
                          {challenge.type}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <CardTitle className="text-lg">{challenge.title}</CardTitle>
                      <p className="text-muted-foreground text-sm mt-1">{challenge.description}</p>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium">{challenge.progress}%</span>
                      </div>
                      <Progress value={challenge.progress} className="h-2" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{challenge.current} / {challenge.target}</span>
                        <span>{getTimeLeftText(challenge.timeLeft)}</span>
                      </div>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 text-sm">
                        <div className="flex items-center space-x-1">
                          <Trophy className="h-4 w-4 text-yellow-600" />
                          <span>{formatReward(challenge.reward)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span>{challenge.participants.toLocaleString()}</span>
                        </div>
                      </div>
                      <Button size="sm" variant="outline">
                        View Details
                        <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="available" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {mockChallenges.available.map((challenge) => {
              const IconComponent = challenge.icon;
              return (
                <Card key={challenge.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className={`p-3 rounded-lg ${challenge.bgColor}`}>
                        <IconComponent className={`h-6 w-6 ${challenge.color}`} />
                      </div>
                      <div className="flex items-center space-x-2">
                        {getDifficultyBadge(challenge.difficulty)}
                        <Badge variant="outline">
                          {challenge.type === 'team' ? <Users className="h-3 w-3 mr-1" /> : null}
                          {challenge.type}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <CardTitle className="text-lg">{challenge.title}</CardTitle>
                      <p className="text-muted-foreground text-sm mt-1">{challenge.description}</p>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="text-sm font-medium text-muted-foreground">Requirements:</div>
                      <ul className="space-y-1">
                        {challenge.requirements.map((req, index) => (
                          <li key={index} className="flex items-center space-x-2 text-sm">
                            <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                            <span>{req}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 text-sm">
                        <div className="flex items-center space-x-1">
                          <Trophy className="h-4 w-4 text-yellow-600" />
                          <span>{formatReward(challenge.reward)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>{challenge.duration} days</span>
                        </div>
                      </div>
                      <Button size="sm">
                        <PlayCircle className="h-4 w-4 mr-1" />
                        Start Challenge
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="completed" className="space-y-6">
          <div className="space-y-4">
            {mockChallenges.completed.map((challenge) => {
              const IconComponent = challenge.icon;
              return (
                <Card key={challenge.id} className="bg-muted/30">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <IconComponent className={`h-5 w-5 ${challenge.color}`} />
                        </div>
                        <div>
                          <h3 className="font-medium">{challenge.title}</h3>
                          <p className="text-sm text-muted-foreground">{challenge.description}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Completed {new Date(challenge.completedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center space-x-2">
                          <Trophy className="h-4 w-4 text-yellow-600" />
                          <span className="font-medium">{formatReward(challenge.earnedPoints)}</span>
                        </div>
                        <Badge variant="outline" className="mt-1">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Completed
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}