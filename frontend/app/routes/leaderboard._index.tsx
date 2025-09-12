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
  Crown,
  Star,
  Settings,
  Target,
  Activity,
  Zap,
  BarChart3,
} from 'lucide-react';

import { useAuthStore } from '@features/auth/stores/auth.store';
import { useLeaderboardStore } from '@features/leaderboard/stores/leaderboard.store';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/components/ui/card';
import { Button } from '@shared/components/ui/button';
import { Badge } from '@shared/components/ui/badge';
import { Avatar } from '@shared/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@shared/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@shared/components/ui/dialog';

// Import new leaderboard components
import { RealTimeLeaderboard } from '@features/leaderboard/components/real-time-leaderboard';
import { AchievementGallery } from '@features/leaderboard/components/achievement-gallery';
import { ProgressVisualization } from '@features/leaderboard/components/progress-visualization';
import { PrivacyControls } from '@features/leaderboard/components/privacy-controls';

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
  const { user } = useAuthStore();
  const [selectedTimeRange, setSelectedTimeRange] = useState('month');
  const [selectedCategory, setSelectedCategory] = useState('overall');
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'achievements' | 'progress' | 'settings'>('leaderboard');
  const [showPrivacyDialog, setShowPrivacyDialog] = useState(false);

  // Mock achievements data for the gallery
  const mockAchievements = [
    {
      id: 'efficiency-master',
      name: 'Efficiency Master',
      description: 'Maintain below 0.25kg CO₂ per commit for 30 days',
      detailDescription: 'This achievement recognizes developers who consistently maintain excellent carbon efficiency in their development practices.',
      icon: Zap,
      category: 'efficiency' as const,
      rarity: 'rare' as const,
      points: 500,
      unlockedAt: new Date('2024-01-15'),
      unlockCriteria: {
        type: 'efficiency_streak',
        description: 'Maintain carbon efficiency below target for 30 consecutive days',
        requirements: { threshold: 0.25, duration: 30, unit: 'days' }
      },
      shareableImage: '/achievements/efficiency-master.png'
    },
    {
      id: 'green-streak',
      name: 'Green Streak',
      description: 'Complete 7 days of eco-friendly commits',
      icon: Target,
      category: 'improvement' as const,
      rarity: 'uncommon' as const,
      points: 250,
      unlockedAt: new Date('2024-01-10'),
      unlockCriteria: {
        type: 'streak',
        description: 'Maintain improvement streak for 7 days',
        requirements: { duration: 7 }
      }
    },
    {
      id: 'team-player',
      name: 'Team Player',
      description: 'Complete 5 team challenges',
      icon: Users,
      category: 'community' as const,
      rarity: 'common' as const,
      points: 300,
      unlockedAt: new Date('2024-01-20'),
      unlockCriteria: {
        type: 'team_challenges',
        description: 'Successfully complete team challenges',
        requirements: { count: 5 }
      }
    },
    {
      id: 'carbon-zero',
      name: 'Carbon Zero Hero',
      description: 'Achieve net-zero carbon impact for a full week',
      icon: Award,
      category: 'milestone' as const,
      rarity: 'legendary' as const,
      points: 1000,
      progress: {
        current: 4,
        target: 7,
        unit: 'days'
      },
      unlockCriteria: {
        type: 'net_zero',
        description: 'Maintain net-zero or negative carbon impact',
        requirements: { duration: 7, threshold: 0 }
      }
    },
    {
      id: 'secret-achievement',
      name: 'Hidden Achievement',
      description: 'Complete the secret challenge',
      icon: Crown,
      category: 'special' as const,
      rarity: 'epic' as const,
      points: 750,
      isSecret: true,
      unlockCriteria: {
        type: 'secret',
        description: 'Discover and complete the hidden challenge',
        requirements: { secret: true }
      }
    }
  ];

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
                Developer Leaderboards
              </h1>
              <p className="text-body-md text-carbon-600">
                Track progress, compete with peers, and celebrate sustainable coding achievements
              </p>
            </div>

            <div className="flex items-center space-x-3 mt-4 md:mt-0">
              <Dialog open={showPrivacyDialog} onOpenChange={setShowPrivacyDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4 mr-2" />
                    Privacy
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Privacy & Participation Settings</DialogTitle>
                  </DialogHeader>
                  <PrivacyControls
                    onOptOut={() => {
                      setShowPrivacyDialog(false);
                      // Handle opt-out logic
                    }}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </motion.div>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="leaderboard" className="flex items-center space-x-2">
              <Trophy className="h-4 w-4" />
              <span>Rankings</span>
            </TabsTrigger>
            <TabsTrigger value="achievements" className="flex items-center space-x-2">
              <Award className="h-4 w-4" />
              <span>Achievements</span>
            </TabsTrigger>
            <TabsTrigger value="progress" className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4" />
              <span>Progress</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center space-x-2">
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="leaderboard" className="space-y-6">
            <RealTimeLeaderboard
              context="global"
              timeRange={selectedTimeRange as any}
              showControls={true}
              showUserPosition={true}
              autoUpdate={true}
            />
          </TabsContent>

          <TabsContent value="achievements" className="space-y-6">
            <AchievementGallery
              achievements={mockAchievements}
              showProgress={true}
              showSecrets={true}
              enableUnlockAnimations={true}
              onShare={(achievement) => {
                // Handle achievement sharing
                console.log('Sharing achievement:', achievement);
              }}
              onExport={() => {
                // Handle collection export
                console.log('Exporting achievement collection');
              }}
            />
          </TabsContent>

          <TabsContent value="progress" className="space-y-6">
            <ProgressVisualization
              userId={user?.id}
              showComparison={true}
              showPredictions={true}
              timeRange={selectedTimeRange as any}
              onTimeRangeChange={(range) => setSelectedTimeRange(range)}
            />
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <PrivacyControls
              showOptOut={true}
              onOptOut={() => {
                // Handle complete opt-out
                console.log('User opted out of leaderboards');
              }}
            />
          </TabsContent>
        </Tabs>

      </motion.div>
    </main>
  );
}