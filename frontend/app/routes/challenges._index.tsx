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
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@shared/components/ui/card';
import { Button } from '@shared/components/ui/button';
import { Badge } from '@shared/components/ui/badge';
import { Progress } from '@shared/components/ui/progress';

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
  const [activeTab, setActiveTab] = useState<'challenges' | 'achievements'>('challenges');

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
                Challenges & Achievements
              </h1>
              <p className="text-body-md text-carbon-600">
                Take on challenges to reduce your carbon footprint and earn rewards
              </p>
            </div>

            <div className="flex space-x-2 mt-4 md:mt-0">
              <Button
                variant={activeTab === 'challenges' ? 'default' : 'outline'}
                onClick={() => setActiveTab('challenges')}
              >
                <Target className="h-4 w-4 mr-2" />
                Active Challenges
              </Button>
              <Button
                variant={activeTab === 'achievements' ? 'default' : 'outline'}
                onClick={() => setActiveTab('achievements')}
              >
                <Trophy className="h-4 w-4 mr-2" />
                Achievements
              </Button>
            </div>
          </div>
        </motion.div>

        {activeTab === 'challenges' && (
          <div className="grid lg:grid-cols-4 gap-8">
            <div className="lg:col-span-3 space-y-6">
              {challenges.map((challenge, index) => {
                const Icon = challenge.icon;
                const isLocked = challenge.status === 'locked';
                const isCompleted = challenge.progress >= challenge.target;

                return (
                  <motion.div key={challenge.id} variants={itemVariants}>
                    <Card className={`${isLocked ? 'opacity-60' : ''} ${isCompleted ? 'ring-2 ring-green-500' : ''}`}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-4">
                            <div className={`p-3 rounded-lg bg-${challenge.color}-100`}>
                              {isLocked ? (
                                <Lock className="h-6 w-6 text-carbon-400" />
                              ) : (
                                <Icon className={`h-6 w-6 text-${challenge.color}-600`} />
                              )}
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2">
                                <CardTitle className="text-lg">{challenge.title}</CardTitle>
                                {isCompleted && (
                                  <CheckCircle className="h-5 w-5 text-green-500" />
                                )}
                              </div>
                              <p className="text-body-sm text-carbon-600">
                                {challenge.description}
                              </p>
                              <div className="flex items-center space-x-2">
                                <Badge className={getDifficultyColor(challenge.difficulty)}>
                                  {challenge.difficulty}
                                </Badge>
                                <Badge variant="outline">{challenge.category}</Badge>
                                <Badge variant="success">
                                  <Star className="h-3 w-3 mr-1" />
                                  {challenge.reward} points
                                </Badge>
                              </div>
                            </div>
                          </div>

                          {!isLocked && !isCompleted && (
                            <Button size="sm">
                              <Play className="h-4 w-4 mr-2" />
                              Start
                            </Button>
                          )}
                          {isCompleted && (
                            <Button size="sm" variant="outline" disabled>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Completed
                            </Button>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        {!isLocked ? (
                          <div className="space-y-3">
                            <div className="flex justify-between items-center text-body-sm">
                              <span className="text-carbon-600">Progress</span>
                              <span className="font-medium">
                                {challenge.progress} / {challenge.target}
                              </span>
                            </div>
                            <div className="relative">
                              <div className="w-full bg-carbon-200 rounded-full h-2">
                                <div 
                                  className={`${getProgressColor(challenge.progress, challenge.target)} h-2 rounded-full transition-all duration-300`}
                                  style={{ width: `${Math.min((challenge.progress / challenge.target) * 100, 100)}%` }}
                                />
                              </div>
                            </div>
                            {challenge.timeLeft && (
                              <p className="text-caption text-carbon-500">{challenge.timeLeft}</p>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <p className="text-body-sm text-carbon-500">
                              <Lock className="h-4 w-4 inline mr-1" />
                              {challenge.requirement}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>

            <div className="space-y-6">
              <motion.div variants={itemVariants}>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Star className="h-5 w-5 text-yellow-500" />
                      <span>Your Points</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-center space-y-4">
                    <div className="text-4xl font-bold text-yellow-500">2,350</div>
                    <p className="text-body-sm text-carbon-600">Total points earned</p>
                    <Button className="w-full" size="sm">
                      Redeem Rewards
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={itemVariants}>
                <Card>
                  <CardHeader>
                    <CardTitle>Challenge Stats</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-body-sm text-carbon-600">Active</span>
                      <span className="font-medium">3</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-body-sm text-carbon-600">Completed</span>
                      <span className="font-medium text-green-600">8</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-body-sm text-carbon-600">Success Rate</span>
                      <span className="font-medium">73%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-body-sm text-carbon-600">Streak</span>
                      <span className="font-medium text-blue-600">5 days</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        )}

        {activeTab === 'achievements' && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {achievements.map((achievement, index) => {
              const Icon = achievement.icon;
              
              return (
                <motion.div key={achievement.id} variants={itemVariants}>
                  <Card className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6 text-center space-y-4">
                      <div className="bg-primary-100 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto">
                        <Icon className="h-8 w-8 text-primary-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-carbon-900 mb-1">{achievement.title}</h3>
                        <p className="text-body-sm text-carbon-600 mb-2">{achievement.description}</p>
                        <Badge variant="success">
                          <Star className="h-3 w-3 mr-1" />
                          {achievement.reward} points
                        </Badge>
                      </div>
                      <p className="text-caption text-carbon-500">
                        Earned on {new Date(achievement.earnedAt).toLocaleDateString()}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </main>
  );
}