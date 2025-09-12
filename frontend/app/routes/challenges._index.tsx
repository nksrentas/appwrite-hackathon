import type { MetaFunction, LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Target,
  Trophy,
  Calendar,
  Zap,
  GitCommit,
  Clock,
  CheckCircle,
  Lock,
  Star,
  Award,
  TrendingUp,
  Play,
  Users,
  Settings,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@shared/components/ui/card';
import { Button } from '@shared/components/ui/button';
import { Badge } from '@shared/components/ui/badge';
import { Progress } from '@shared/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@shared/components/ui/tabs';

// Import new components
import { ChallengeDiscovery } from '@features/leaderboard/components/challenge-discovery';
import { TeamFormation } from '@features/leaderboard/components/team-formation';
import { NotificationIntegration } from '@features/leaderboard/components/notification-integration';

export const meta: MetaFunction = () => {
  return [
    { title: 'Challenges - EcoTrace' },
    { name: 'description', content: 'Carbon footprint reduction challenges and achievements' },
  ];
};

export async function loader({ request }: LoaderFunctionArgs) {
  return json({});
}

const challenges = [
  {
    id: 'green-streak',
    title: 'Green Streak Master',
    description: 'Maintain low carbon impact for 30 consecutive days',
    difficulty: 'Medium',
    category: 'Consistency',
    reward: 500,
    progress: 18,
    target: 30,
    status: 'active',
    icon: Target,
    color: 'green',
    timeLeft: '12 days remaining',
  },
  {
    id: 'efficiency-boost',
    title: 'Efficiency Booster',
    description: 'Reduce your average commit carbon footprint by 25%',
    difficulty: 'Hard',
    category: 'Optimization',
    reward: 750,
    progress: 15,
    target: 25,
    status: 'active',
    icon: Zap,
    color: 'yellow',
    timeLeft: '3 weeks remaining',
  },
  {
    id: 'early-bird',
    title: 'Early Bird',
    description: 'Complete 50 commits before 9 AM',
    difficulty: 'Easy',
    category: 'Timing',
    reward: 200,
    progress: 32,
    target: 50,
    status: 'active',
    icon: Clock,
    color: 'blue',
    timeLeft: '1 week remaining',
  },
  {
    id: 'test-champion',
    title: 'Test Champion',
    description: 'Achieve 95% test coverage on 10 repositories',
    difficulty: 'Hard',
    category: 'Quality',
    reward: 1000,
    progress: 0,
    target: 10,
    status: 'locked',
    icon: Trophy,
    color: 'purple',
    requirement: 'Complete Green Streak Master first',
  },
];

const achievements = [
  {
    id: 'first-steps',
    title: 'First Steps',
    description: 'Connected your first GitHub repository',
    reward: 100,
    earnedAt: '2024-01-15',
    icon: GitCommit,
  },
  {
    id: 'week-warrior',
    title: 'Week Warrior',
    description: 'Maintained efficiency for 7 consecutive days',
    reward: 250,
    earnedAt: '2024-01-22',
    icon: Calendar,
  },
  {
    id: 'optimizer',
    title: 'Code Optimizer',
    description: 'Reduced carbon footprint by 50% in one month',
    reward: 500,
    earnedAt: '2024-02-01',
    icon: TrendingUp,
  },
];

export default function Challenges() {
  const [activeTab, setActiveTab] = useState<'challenges' | 'teams' | 'notifications'>('challenges');

  const mockCurrentUser = {
    id: 'user1',
    username: 'current-user',
    name: 'Current User',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=64&h=64&fit=crop&crop=face',
  };

  const getProgressColor = (progress: number, target: number) => {
    const percentage = (progress / target) * 100;
    if (percentage >= 100) return 'bg-green-500';
    if (percentage >= 75) return 'bg-yellow-500';
    if (percentage >= 50) return 'bg-blue-500';
    return 'bg-carbon-400';
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy':
        return 'bg-green-100 text-green-800';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'Hard':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-carbon-100 text-carbon-800';
    }
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
                Challenges & Teams
              </h1>
              <p className="text-body-md text-carbon-600">
                Join challenges, form teams, and collaborate to reduce your carbon footprint
              </p>
            </div>
          </div>
        </motion.div>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="challenges" className="flex items-center space-x-2">
              <Target className="h-4 w-4" />
              <span>Challenges</span>
            </TabsTrigger>
            <TabsTrigger value="teams" className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>Teams</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center space-x-2">
              <Settings className="h-4 w-4" />
              <span>Notifications</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="challenges" className="space-y-6">
            <ChallengeDiscovery
              currentUser={mockCurrentUser}
              onJoinChallenge={(challengeId) => {
                console.log('Joining challenge:', challengeId);
              }}
              onLeaveChallenge={(challengeId) => {
                console.log('Leaving challenge:', challengeId);
              }}
              onCreateChallenge={(challenge) => {
                console.log('Creating challenge:', challenge);
              }}
            />
          </TabsContent>

          <TabsContent value="teams" className="space-y-6">
            <TeamFormation
              currentUser={mockCurrentUser}
              onCreateTeam={(team) => {
                console.log('Creating team:', team);
              }}
              onJoinTeam={(teamId) => {
                console.log('Joining team:', teamId);
              }}
              onLeaveTeam={(teamId) => {
                console.log('Leaving team:', teamId);
              }}
              onInviteUser={(teamId, username) => {
                console.log('Inviting user:', { teamId, username });
              }}
              onAcceptInvite={(inviteId) => {
                console.log('Accepting invite:', inviteId);
              }}
              onDeclineInvite={(inviteId) => {
                console.log('Declining invite:', inviteId);
              }}
            />
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Notification Center</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <NotificationIntegration
                      userId={mockCurrentUser.id}
                      onNotificationRead={(id) => {
                        console.log('Marking notification as read:', id);
                      }}
                      onNotificationDismiss={(id) => {
                        console.log('Dismissing notification:', id);
                      }}
                      onNavigateToAction={(url) => {
                        console.log('Navigating to:', url);
                      }}
                      showFloatingNotifications={false}
                    />
                  </CardContent>
                </Card>
              </div>
              
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Notification Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-sm text-carbon-600">
                      Configure when and how you receive notifications about:
                    </div>
                    <ul className="text-sm text-carbon-600 space-y-2 list-disc list-inside ml-4">
                      <li>Achievement unlocks</li>
                      <li>Challenge invitations</li>
                      <li>Team updates</li>
                      <li>Rank changes</li>
                      <li>Goal reminders</li>
                      <li>Progress milestones</li>
                    </ul>
                    <Button variant="outline" className="w-full">
                      Manage Settings
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>

      </motion.div>
    </main>
  );
}