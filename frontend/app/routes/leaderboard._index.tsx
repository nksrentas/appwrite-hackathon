import type { MetaFunction, LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { useState } from 'react';
import {
  Trophy,
  Medal,
  Crown,
  TrendingUp,
  TrendingDown,
  Award,
  Target,
  Users,
  Search,
  Filter,
  ArrowUp,
  ArrowDown,
  Minus,
  Star,
  Zap,
  Activity,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@shared/components/ui/card';
import { Button } from '@shared/components/ui/button';
import { Badge } from '@shared/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@shared/components/ui/tabs';
import { Input } from '@shared/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@shared/components/ui/avatar';
import { Progress } from '@shared/components/ui/progress';
import { Separator } from '@shared/components/ui/separator';
import { Alert, AlertDescription } from '@shared/components/ui/alert';

export const meta: MetaFunction = () => {
  return [
    { title: 'Leaderboard - EcoTrace' },
    { name: 'description', content: 'Community leaderboard for carbon footprint efficiency' },
  ];
};

export async function loader({ request }: LoaderFunctionArgs) {
  return json({
    timestamp: new Date().toISOString(),
  });
}

// Mock data for leaderboard
const mockLeaderboard = {
  individuals: [
    {
      id: 1,
      rank: 1,
      name: 'Alex Chen',
      username: 'alexchen',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop&crop=face',
      score: 2847,
      efficiency: 92,
      trend: 'up',
      change: 12.5,
      commits: 127,
      carbonSaved: 234,
      achievements: ['eco-warrior', 'efficiency-master', 'streak-keeper']
    },
    {
      id: 2,
      rank: 2,
      name: 'Sarah Johnson',
      username: 'sarah-dev',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=32&h=32&fit=crop&crop=face',
      score: 2634,
      efficiency: 89,
      trend: 'up',
      change: 8.3,
      commits: 98,
      carbonSaved: 198,
      achievements: ['clean-coder', 'optimizer', 'green-thumb']
    },
    {
      id: 3,
      rank: 3,
      name: 'Mike Rodriguez',
      username: 'mike-codes',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=32&h=32&fit=crop&crop=face',
      score: 2456,
      efficiency: 87,
      trend: 'stable',
      change: -1.2,
      commits: 89,
      carbonSaved: 176,
      achievements: ['consistent', 'team-player']
    },
    {
      id: 4,
      rank: 4,
      name: 'Emma Wilson',
      username: 'emma-w',
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=32&h=32&fit=crop&crop=face',
      score: 2298,
      efficiency: 85,
      trend: 'down',
      change: -5.7,
      commits: 76,
      carbonSaved: 145,
      achievements: ['innovator', 'early-adopter']
    },
    {
      id: 5,
      rank: 5,
      name: 'David Kim',
      username: 'dkim-dev',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=32&h=32&fit=crop&crop=face',
      score: 2189,
      efficiency: 83,
      trend: 'up',
      change: 3.4,
      commits: 67,
      carbonSaved: 134,
      achievements: ['steady-climber']
    }
  ],
  teams: [
    {
      id: 1,
      rank: 1,
      name: 'Green Coders',
      members: 12,
      totalScore: 28470,
      avgEfficiency: 91,
      trend: 'up',
      change: 15.2,
      carbonSaved: 1847
    },
    {
      id: 2,
      rank: 2,
      name: 'Eco Engineers',
      members: 8,
      totalScore: 24356,
      avgEfficiency: 88,
      trend: 'up',
      change: 7.8,
      carbonSaved: 1623
    },
    {
      id: 3,
      rank: 3,
      name: 'Carbon Crushers',
      members: 15,
      totalScore: 21890,
      avgEfficiency: 85,
      trend: 'stable',
      change: 0.5,
      carbonSaved: 1456
    }
  ]
};

const achievements = {
  'eco-warrior': { icon: Trophy, color: 'text-yellow-600', label: 'Eco Warrior' },
  'efficiency-master': { icon: Zap, color: 'text-blue-600', label: 'Efficiency Master' },
  'streak-keeper': { icon: Target, color: 'text-green-600', label: 'Streak Keeper' },
  'clean-coder': { icon: Star, color: 'text-purple-600', label: 'Clean Coder' },
  'optimizer': { icon: TrendingUp, color: 'text-orange-600', label: 'Optimizer' },
  'green-thumb': { icon: Activity, color: 'text-emerald-600', label: 'Green Thumb' },
  'consistent': { icon: Medal, color: 'text-gray-600', label: 'Consistent' },
  'team-player': { icon: Users, color: 'text-indigo-600', label: 'Team Player' },
  'innovator': { icon: Award, color: 'text-pink-600', label: 'Innovator' },
  'early-adopter': { icon: Crown, color: 'text-red-600', label: 'Early Adopter' },
  'steady-climber': { icon: TrendingUp, color: 'text-teal-600', label: 'Steady Climber' }
};

export default function Leaderboard() {
  const { timestamp } = useLoaderData<typeof loader>();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('score');
  const [selectedPeriod, setSelectedPeriod] = useState('7d');

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <ArrowUp className="h-4 w-4 text-green-600" />;
      case 'down': return <ArrowDown className="h-4 w-4 text-red-600" />;
      default: return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Crown className="h-5 w-5 text-yellow-500" />;
      case 2: return <Medal className="h-5 w-5 text-gray-400" />;
      case 3: return <Award className="h-5 w-5 text-amber-600" />;
      default: return <span className="text-lg font-bold text-muted-foreground">#{rank}</span>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div>
          <h1 className="text-display-lg font-bold">Leaderboard</h1>
          <p className="text-body-md text-muted-foreground mt-2">
            See how you stack up against the community in carbon efficiency
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">24 Hours</SelectItem>
              <SelectItem value="7d">7 Days</SelectItem>
              <SelectItem value="30d">30 Days</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Top Performers Alert */}
      <Alert>
        <Trophy className="h-4 w-4" />
        <AlertDescription>
          <strong>Congratulations!</strong> This week's top performers have saved a combined{' '}
          <span className="font-semibold text-primary">1,247kg of CO₂</span> through efficient development practices.
        </AlertDescription>
      </Alert>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search developers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="score">Efficiency Score</SelectItem>
                <SelectItem value="carbonSaved">Carbon Saved</SelectItem>
                <SelectItem value="commits">Commits</SelectItem>
                <SelectItem value="trend">Trend</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Main Leaderboard */}
      <Tabs defaultValue="individuals" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="individuals">Individual Rankings</TabsTrigger>
          <TabsTrigger value="teams">Team Rankings</TabsTrigger>
        </TabsList>

        <TabsContent value="individuals" className="space-y-6">
          {/* Top 3 Podium */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {mockLeaderboard.individuals.slice(0, 3).map((user) => (
              <Card key={user.id} className={`relative overflow-hidden ${
                user.rank === 1 ? 'ring-2 ring-yellow-500/50 bg-gradient-to-br from-yellow-50 to-background' :
                user.rank === 2 ? 'ring-1 ring-gray-400/50 bg-gradient-to-br from-gray-50 to-background' :
                'ring-1 ring-amber-600/50 bg-gradient-to-br from-amber-50 to-background'
              }`}>
                <CardHeader className="text-center space-y-4">
                  <div className="flex justify-center">
                    {getRankIcon(user.rank)}
                  </div>
                  <div className="space-y-2">
                    <Avatar className="h-16 w-16 mx-auto ring-2 ring-primary/20">
                      <AvatarImage src={user.avatar} alt={user.name} />
                      <AvatarFallback>{user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold text-lg">{user.name}</h3>
                      <p className="text-muted-foreground">@{user.username}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="text-center space-y-4">
                  <div className="space-y-2">
                    <div className="text-3xl font-bold text-primary">{user.score}</div>
                    <div className="text-sm text-muted-foreground">Efficiency Points</div>
                  </div>
                  <div className="flex items-center justify-center space-x-2">
                    {getTrendIcon(user.trend)}
                    <span className={`text-sm font-medium ${
                      user.trend === 'up' ? 'text-green-600' :
                      user.trend === 'down' ? 'text-red-600' :
                      'text-muted-foreground'
                    }`}>
                      {Math.abs(user.change)}%
                    </span>
                  </div>
                  <div className="flex justify-center space-x-1">
                    {user.achievements.slice(0, 3).map((achievement) => {
                      const AchievementIcon = achievements[achievement as keyof typeof achievements]?.icon || Star;
                      const color = achievements[achievement as keyof typeof achievements]?.color || 'text-muted-foreground';
                      return (
                        <AchievementIcon key={achievement} className={`h-4 w-4 ${color}`} />
                      );
                    })}
                    {user.achievements.length > 3 && (
                      <span className="text-xs text-muted-foreground">+{user.achievements.length - 3}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Full Rankings */}
          <Card>
            <CardHeader>
              <CardTitle>Full Rankings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockLeaderboard.individuals.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center justify-center w-8">
                        {user.rank <= 3 ? getRankIcon(user.rank) : (
                          <span className="font-semibold text-muted-foreground">#{user.rank}</span>
                        )}
                      </div>
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.avatar} alt={user.name} />
                        <AvatarFallback>{user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-sm text-muted-foreground">@{user.username}</div>
                      </div>
                      <div className="flex space-x-1">
                        {user.achievements.slice(0, 2).map((achievement) => {
                          const AchievementIcon = achievements[achievement as keyof typeof achievements]?.icon || Star;
                          const color = achievements[achievement as keyof typeof achievements]?.color || 'text-muted-foreground';
                          return (
                            <AchievementIcon key={achievement} className={`h-3 w-3 ${color}`} />
                          );
                        })}
                      </div>
                    </div>
                    <div className="flex items-center space-x-6 text-right">
                      <div>
                        <div className="font-semibold">{user.score}</div>
                        <div className="text-xs text-muted-foreground">Points</div>
                      </div>
                      <div>
                        <div className="font-medium">{user.efficiency}%</div>
                        <div className="text-xs text-muted-foreground">Efficiency</div>
                      </div>
                      <div>
                        <div className="font-medium">{user.carbonSaved}g</div>
                        <div className="text-xs text-muted-foreground">CO₂ Saved</div>
                      </div>
                      <div className="flex items-center space-x-1">
                        {getTrendIcon(user.trend)}
                        <span className={`text-sm ${
                          user.trend === 'up' ? 'text-green-600' :
                          user.trend === 'down' ? 'text-red-600' :
                          'text-muted-foreground'
                        }`}>
                          {Math.abs(user.change)}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="teams" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Team Rankings</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockLeaderboard.teams.map((team) => (
                  <div key={team.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center justify-center w-8">
                        {team.rank <= 3 ? getRankIcon(team.rank) : (
                          <span className="font-semibold text-muted-foreground">#{team.rank}</span>
                        )}
                      </div>
                      <div className="flex items-center justify-center w-10 h-10 bg-primary/10 rounded-lg">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium">{team.name}</div>
                        <div className="text-sm text-muted-foreground">{team.members} members</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-6 text-right">
                      <div>
                        <div className="font-semibold">{team.totalScore.toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">Total Points</div>
                      </div>
                      <div>
                        <div className="font-medium">{team.avgEfficiency}%</div>
                        <div className="text-xs text-muted-foreground">Avg Efficiency</div>
                      </div>
                      <div>
                        <div className="font-medium">{team.carbonSaved}kg</div>
                        <div className="text-xs text-muted-foreground">CO₂ Saved</div>
                      </div>
                      <div className="flex items-center space-x-1">
                        {getTrendIcon(team.trend)}
                        <span className={`text-sm ${
                          team.trend === 'up' ? 'text-green-600' :
                          team.trend === 'down' ? 'text-red-600' :
                          'text-muted-foreground'
                        }`}>
                          {Math.abs(team.change)}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Team Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="space-y-2">
                  <Users className="h-8 w-8 text-primary mx-auto" />
                  <div className="text-2xl font-bold">156</div>
                  <div className="text-muted-foreground">Active Teams</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="space-y-2">
                  <Activity className="h-8 w-8 text-green-600 mx-auto" />
                  <div className="text-2xl font-bold">4.2kg</div>
                  <div className="text-muted-foreground">Avg CO₂ Saved/Team</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="space-y-2">
                  <Trophy className="h-8 w-8 text-yellow-600 mx-auto" />
                  <div className="text-2xl font-bold">87%</div>
                  <div className="text-muted-foreground">Avg Team Efficiency</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}