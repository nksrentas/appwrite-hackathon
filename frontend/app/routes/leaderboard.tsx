import type { MetaFunction, LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { Link } from '@remix-run/react';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Trophy,
  Medal,
  Award,
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  Leaf,
  Bell,
  Settings,
  RefreshCw,
  ArrowLeft,
  Crown,
  Star,
} from 'lucide-react';

import { useAuthStore } from '@features/auth/stores/auth.store';
import { useLeaderboardStore } from '@features/leaderboard/stores/leaderboard.store';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/components/ui/card';
import { Button } from '@shared/components/ui/button';
import { Badge } from '@shared/components/ui/badge';
import { Avatar } from '@shared/components/ui/avatar';

export const meta: MetaFunction = () => {
  return [
    { title: 'Leaderboard - EcoTrace' },
    { name: 'description', content: 'Developer carbon efficiency rankings and achievements' },
  ];
};

export async function loader({ request }: LoaderFunctionArgs) {
  return json({});
}

const mockLeaderboardData = [
  {
    id: '1',
    username: 'eco-warrior',
    name: 'Alex Chen',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=64&h=64&fit=crop&crop=face',
    carbonScore: 0.24,
    trend: 'down',
    trendChange: 15.2,
    rank: 1,
    previousRank: 2,
    achievements: ['efficiency-master', 'green-streak'],
    totalContributions: 847,
  },
  {
    id: '2',
    username: 'sustainable-dev',
    name: 'Sarah Johnson',
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b832c96a?w=64&h=64&fit=crop&crop=face',
    carbonScore: 0.31,
    trend: 'up',
    trendChange: 8.7,
    rank: 2,
    previousRank: 1,
    achievements: ['early-adopter', 'team-leader'],
    totalContributions: 623,
  },
  {
    id: '3',
    username: 'carbon-zero',
    name: 'Mike Rodriguez',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=64&h=64&fit=crop&crop=face',
    carbonScore: 0.35,
    trend: 'stable',
    trendChange: 2.1,
    rank: 3,
    previousRank: 3,
    achievements: ['consistency-king'],
    totalContributions: 512,
  },
];

const timeRanges = [
  { id: 'week', label: 'This Week' },
  { id: 'month', label: 'This Month' },
  { id: 'quarter', label: 'This Quarter' },
  { id: 'year', label: 'This Year' },
];

const categories = [
  { id: 'overall', label: 'Overall Efficiency' },
  { id: 'commits', label: 'Commit Efficiency' },
  { id: 'prs', label: 'PR Impact' },
  { id: 'ci', label: 'CI Optimization' },
];

export default function Leaderboard() {
  const { user, isAuthenticated, checkAuth } = useAuthStore();
  const [selectedTimeRange, setSelectedTimeRange] = useState('month');
  const [selectedCategory, setSelectedCategory] = useState('overall');

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-carbon-900">Authentication Required</h1>
          <p className="text-carbon-600">Please sign in to view the leaderboard.</p>
          <Link to="/">
            <Button>Go to Sign In</Button>
          </Link>
        </div>
      </div>
    );
  }

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Award className="h-5 w-5 text-amber-600" />;
      default:
        return <span className="text-carbon-500 font-bold">#{rank}</span>;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-red-500" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-green-500" />;
      default:
        return <Minus className="h-4 w-4 text-carbon-400" />;
    }
  };

  const getRankChangeColor = (current: number, previous: number) => {
    if (current < previous) return 'text-green-500';
    if (current > previous) return 'text-red-500';
    return 'text-carbon-400';
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        duration: 0.6,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 },
    },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-carbon-50 via-primary-50/20 to-background">
      <header className="border-b border-carbon-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <Link to="/" className="flex items-center space-x-3">
                <div className="bg-primary-500 p-2 rounded-lg carbon-glow">
                  <Leaf className="h-6 w-6 text-white" />
                </div>
                <span className="text-display-md text-carbon-900 font-bold">EcoTrace</span>
              </Link>

              <nav className="hidden md:flex space-x-6">
                <Link
                  to="/dashboard"
                  className="text-body-md text-carbon-600 hover:text-carbon-900 transition-colors"
                >
                  Dashboard
                </Link>
                <Link
                  to="/analytics"
                  className="text-body-md text-carbon-600 hover:text-carbon-900 transition-colors"
                >
                  Analytics
                </Link>
                <Link
                  to="/leaderboard"
                  className="text-body-md text-primary-600 font-medium border-b-2 border-primary-500 pb-1"
                >
                  Leaderboard
                </Link>
              </nav>
            </div>

            <div className="flex items-center space-x-4">
              <Link to="/dashboard">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>

              <Button variant="ghost" size="icon">
                <RefreshCw className="h-4 w-4" />
              </Button>

              <Button variant="ghost" size="icon">
                <Bell className="h-4 w-4" />
              </Button>

              <Button variant="ghost" size="icon">
                <Settings className="h-4 w-4" />
              </Button>

              {user && (
                <div className="flex items-center space-x-3 pl-4 border-l border-carbon-200">
                  <div className="text-right">
                    <div className="text-body-sm font-medium text-carbon-900">
                      {user.name || 'Developer'}
                    </div>
                  </div>
                  {(user as any).avatar && (
                    <img
                      src={(user as any).avatar}
                      alt="Profile"
                      className="h-8 w-8 rounded-full ring-2 ring-primary-500/20"
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 lg:px-6 py-8">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-8"
        >
          <motion.div variants={itemVariants}>
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
              <div>
                <h1 className="text-display-lg text-carbon-900 font-bold mb-2">
                  Carbon Efficiency Leaderboard
                </h1>
                <p className="text-body-md text-carbon-600">
                  See how you rank among developers committed to sustainable coding
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 mt-4 md:mt-0">
                <div className="flex space-x-2">
                  {timeRanges.map((range) => (
                    <Button
                      key={range.id}
                      variant={selectedTimeRange === range.id ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedTimeRange(range.id)}
                    >
                      {range.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex space-x-2 mb-6">
              {categories.map((category) => (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setSelectedCategory(category.id)}
                >
                  {category.label}
                </Button>
              ))}
            </div>
          </motion.div>

          <div className="grid lg:grid-cols-4 gap-8">
            <div className="lg:col-span-3">
              <motion.div variants={itemVariants}>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Trophy className="h-5 w-5 text-yellow-500" />
                      <span>Top Performers</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {mockLeaderboardData.map((developer, index) => (
                        <motion.div
                          key={developer.id}
                          variants={itemVariants}
                          className="flex items-center space-x-4 p-4 bg-carbon-50 rounded-lg hover:bg-carbon-100 transition-colors"
                        >
                          <div className="flex items-center justify-center w-8">
                            {getRankIcon(developer.rank)}
                          </div>

                          <div className="flex items-center space-x-3 flex-1">
                            <Avatar className="h-10 w-10">
                              <img
                                src={developer.avatar}
                                alt={developer.name}
                                className="h-full w-full object-cover rounded-full"
                              />
                            </Avatar>

                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <h3 className="font-semibold text-carbon-900">
                                  {developer.name}
                                </h3>
                                <span className="text-carbon-500 text-sm">
                                  @{developer.username}
                                </span>
                                {developer.achievements.length > 0 && (
                                  <div className="flex space-x-1">
                                    {developer.achievements.slice(0, 2).map((achievement, i) => (
                                      <Star
                                        key={i}
                                        className="h-4 w-4 text-yellow-500 fill-current"
                                      />
                                    ))}
                                  </div>
                                )}
                              </div>
                              <p className="text-caption text-carbon-500">
                                {developer.totalContributions} contributions
                              </p>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-lg font-bold text-carbon-900">
                              {developer.carbonScore} kg CO₂
                            </div>
                            <div className="flex items-center space-x-1 text-caption">
                              {getTrendIcon(developer.trend)}
                              <span className={
                                developer.trend === 'down' ? 'text-green-500' : 
                                developer.trend === 'up' ? 'text-red-500' : 'text-carbon-400'
                              }>
                                {developer.trendChange}%
                              </span>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className={`text-caption font-medium ${getRankChangeColor(developer.rank, developer.previousRank)}`}>
                              {developer.rank === developer.previousRank ? 
                                '—' : 
                                developer.rank < developer.previousRank ? 
                                  `↑${developer.previousRank - developer.rank}` : 
                                  `↓${developer.rank - developer.previousRank}`
                              }
                            </div>
                            <div className="text-caption text-carbon-400">vs last week</div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            <div className="space-y-6">
              <motion.div variants={itemVariants}>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Users className="h-5 w-5" />
                      <span>Your Rank</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-center space-y-4">
                    <div className="text-4xl font-bold text-primary-500">#47</div>
                    <p className="text-body-sm text-carbon-600">Out of 2,847 developers</p>
                    <div className="space-y-2">
                      <div className="text-2xl font-bold text-carbon-900">0.52 kg CO₂</div>
                      <Badge variant="success">Top 25% Efficiency</Badge>
                    </div>
                    <Button className="w-full" size="sm">
                      View My Profile
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={itemVariants}>
                <Card>
                  <CardHeader>
                    <CardTitle>Global Stats</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-body-sm text-carbon-600">Total Developers</span>
                      <span className="font-medium">2,847</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-body-sm text-carbon-600">Average Efficiency</span>
                      <span className="font-medium">0.68 kg CO₂</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-body-sm text-carbon-600">Total CO₂ Saved</span>
                      <span className="font-medium text-green-600">1.2 tons</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-body-sm text-carbon-600">This Month</span>
                      <span className="font-medium text-green-600">150 kg</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={itemVariants}>
                <Card>
                  <CardHeader>
                    <CardTitle>Achievement Goals</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-body-sm">Green Streak</span>
                        <Badge variant="outline">12/30 days</Badge>
                      </div>
                      <div className="w-full bg-carbon-200 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: '40%' }}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-body-sm">Efficiency Master</span>
                        <Badge variant="outline">3/5 weeks</Badge>
                      </div>
                      <div className="w-full bg-carbon-200 rounded-full h-2">
                        <div 
                          className="bg-primary-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: '60%' }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}