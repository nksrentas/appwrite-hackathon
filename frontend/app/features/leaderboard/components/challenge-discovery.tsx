import * as React from 'react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Target,
  Users,
  Clock,
  Calendar,
  Trophy,
  Star,
  Play,
  Pause,
  CheckCircle,
  AlertTriangle,
  Filter,
  Search,
  TrendingUp,
  Zap,
  Award,
  Crown,
  Globe,
  Lock,
  User,
  ArrowRight,
  Info,
  BarChart3,
  Activity,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@shared/components/ui/card';
import { Button } from '@shared/components/ui/button';
import { Badge } from '@shared/components/ui/badge';
import { Progress } from '@shared/components/ui/progress';
import { Input } from '@shared/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@shared/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@shared/components/ui/dialog';
import { Avatar, AvatarFallback } from '@shared/components/ui/avatar';
import { Separator } from '@shared/components/ui/separator';
import { toast } from '@shared/hooks/use-toast';
import { cn } from '@shared/utils/cn';

export type ChallengeType = 'individual' | 'team' | 'organization' | 'global';
export type ChallengeDifficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert';
export type ChallengeStatus = 'upcoming' | 'active' | 'completed' | 'expired';
export type ChallengeCategory = 'efficiency' | 'reduction' | 'optimization' | 'learning' | 'community';

export interface Challenge {
  id: string;
  title: string;
  description: string;
  longDescription?: string;
  type: ChallengeType;
  category: ChallengeCategory;
  difficulty: ChallengeDifficulty;
  status: ChallengeStatus;
  startDate: Date;
  endDate: Date;
  maxParticipants?: number;
  currentParticipants: number;
  reward: {
    points: number;
    badges?: string[];
    title?: string;
  };
  requirements: {
    minCommits?: number;
    targetReduction?: number;
    skillLevel?: string;
    teamSize?: number;
  };
  progress?: {
    current: number;
    target: number;
    unit: string;
  };
  participants: ChallengeParticipant[];
  creator?: {
    id: string;
    name: string;
    avatar?: string;
  };
  tags: string[];
  rules: string[];
  isJoined?: boolean;
  joinedAt?: Date;
}

export interface ChallengeParticipant {
  id: string;
  userId: string;
  username: string;
  name: string;
  avatar?: string;
  progress: number;
  rank: number;
  joinedAt: Date;
  isTeamLead?: boolean;
}

interface ChallengeDiscoveryProps {
  className?: string;
  currentUser?: {
    id: string;
    username: string;
    name: string;
    avatar?: string;
  };
  challenges?: Challenge[];
  onJoinChallenge?: (challengeId: string) => void;
  onLeaveChallenge?: (challengeId: string) => void;
  onCreateChallenge?: (challenge: Partial<Challenge>) => void;
  showCreateButton?: boolean;
}

export const ChallengeDiscovery = ({
  className,
  currentUser,
  challenges = [],
  onJoinChallenge,
  onLeaveChallenge,
  onCreateChallenge,
  showCreateButton = true,
}: ChallengeDiscoveryProps) => {
  const [activeTab, setActiveTab] = useState<'discover' | 'active' | 'completed'>('discover');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<ChallengeType | 'all'>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<ChallengeDifficulty | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<ChallengeCategory | 'all'>('all');
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Mock challenges for demonstration
  const mockChallenges: Challenge[] = [
    {
      id: '1',
      title: 'Green Code Sprint',
      description: 'Reduce your average CO₂ per commit by 20% over the next 7 days',
      longDescription: 'Join this week-long challenge to optimize your code efficiency and reduce carbon impact. Learn best practices for green coding while competing with fellow developers.',
      type: 'individual',
      category: 'efficiency',
      difficulty: 'intermediate',
      status: 'active',
      startDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      currentParticipants: 127,
      maxParticipants: 200,
      reward: {
        points: 500,
        badges: ['green-sprinter'],
        title: 'Green Sprint Champion'
      },
      requirements: {
        minCommits: 10,
        targetReduction: 20
      },
      progress: {
        current: 12,
        target: 20,
        unit: '% reduction'
      },
      participants: [],
      tags: ['efficiency', 'optimization', 'beginner-friendly'],
      rules: [
        'Must make at least 10 commits during the challenge period',
        'All commits must include meaningful carbon optimization',
        'Document your optimization techniques'
      ],
      isJoined: true,
      joinedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
    },
    {
      id: '2',
      title: 'Team Carbon Champions',
      description: 'Form a team of 5 and collectively achieve net-zero carbon impact',
      longDescription: 'Work together with your team to implement sustainable development practices and achieve collective carbon neutrality.',
      type: 'team',
      category: 'reduction',
      difficulty: 'advanced',
      status: 'upcoming',
      startDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 17 * 24 * 60 * 60 * 1000),
      currentParticipants: 45,
      maxParticipants: 100,
      reward: {
        points: 1000,
        badges: ['team-champion', 'carbon-neutral'],
        title: 'Carbon Champion'
      },
      requirements: {
        teamSize: 5,
        targetReduction: 100
      },
      participants: [],
      creator: {
        id: 'user1',
        name: 'Alice Johnson',
        avatar: 'https://images.unsplash.com/photo-1494790108755-2616b832c96a?w=64&h=64&fit=crop&crop=face'
      },
      tags: ['team', 'net-zero', 'advanced'],
      rules: [
        'Teams must have exactly 5 members',
        'All team members must participate actively',
        'Document team strategies and learnings'
      ]
    },
    {
      id: '3',
      title: 'Optimization Master Class',
      description: 'Learn and implement 10 different code optimization techniques',
      longDescription: 'A comprehensive learning challenge focused on mastering various optimization techniques for more efficient, lower-carbon code.',
      type: 'individual',
      category: 'learning',
      difficulty: 'expert',
      status: 'active',
      startDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
      currentParticipants: 23,
      maxParticipants: 50,
      reward: {
        points: 1500,
        badges: ['optimization-master', 'technique-collector'],
        title: 'Optimization Master'
      },
      requirements: {
        skillLevel: 'advanced',
        minCommits: 30
      },
      progress: {
        current: 3,
        target: 10,
        unit: 'techniques'
      },
      participants: [],
      tags: ['learning', 'optimization', 'expert'],
      rules: [
        'Must implement 10 distinct optimization techniques',
        'Each technique must be documented with before/after metrics',
        'Share learnings with the community'
      ]
    }
  ];

  const allChallenges = [...challenges, ...mockChallenges];

  const filteredChallenges = allChallenges.filter(challenge => {
    const matchesSearch = challenge.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         challenge.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         challenge.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesType = selectedType === 'all' || challenge.type === selectedType;
    const matchesDifficulty = selectedDifficulty === 'all' || challenge.difficulty === selectedDifficulty;
    const matchesCategory = selectedCategory === 'all' || challenge.category === selectedCategory;
    
    const matchesTab = activeTab === 'discover' ? !challenge.isJoined :
                      activeTab === 'active' ? challenge.isJoined && challenge.status === 'active' :
                      challenge.isJoined && challenge.status === 'completed';

    return matchesSearch && matchesType && matchesDifficulty && matchesCategory && matchesTab;
  });

  const handleJoinChallenge = (challengeId: string) => {
    onJoinChallenge?.(challengeId);
    toast({
      title: 'Challenge Joined!',
      description: 'You have successfully joined the challenge. Good luck!',
    });
  };

  const handleLeaveChallenge = (challengeId: string) => {
    onLeaveChallenge?.(challengeId);
    toast({
      title: 'Left Challenge',
      description: 'You have left the challenge.',
    });
  };

  const getDifficultyColor = (difficulty: ChallengeDifficulty) => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-green-100 text-green-800';
      case 'intermediate':
        return 'bg-blue-100 text-blue-800';
      case 'advanced':
        return 'bg-orange-100 text-orange-800';
      case 'expert':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-carbon-100 text-carbon-800';
    }
  };

  const getTypeIcon = (type: ChallengeType) => {
    switch (type) {
      case 'individual':
        return User;
      case 'team':
        return Users;
      case 'organization':
        return Globe;
      case 'global':
        return Crown;
      default:
        return Target;
    }
  };

  const getCategoryIcon = (category: ChallengeCategory) => {
    switch (category) {
      case 'efficiency':
        return Zap;
      case 'reduction':
        return TrendingUp;
      case 'optimization':
        return BarChart3;
      case 'learning':
        return Award;
      case 'community':
        return Users;
      default:
        return Target;
    }
  };

  const getTimeRemaining = (endDate: Date) => {
    const now = new Date();
    const diff = endDate.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days} days left`;
    if (hours > 0) return `${hours} hours left`;
    return 'Ending soon';
  };

  const getTimeUntilStart = (startDate: Date) => {
    const now = new Date();
    const diff = startDate.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `Starts in ${days} days`;
    if (hours > 0) return `Starts in ${hours} hours`;
    return 'Starting soon';
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
    <div className={cn('space-y-6', className)}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-display-lg text-carbon-900 font-bold mb-2">
            Challenges
          </h1>
          <p className="text-body-md text-carbon-600">
            Discover challenges, improve your skills, and compete with other developers
          </p>
        </div>

        {showCreateButton && (
          <Button onClick={() => setShowCreateDialog(true)}>
            <Target className="h-4 w-4 mr-2" />
            Create Challenge
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="discover">
            Discover ({allChallenges.filter(c => !c.isJoined).length})
          </TabsTrigger>
          <TabsTrigger value="active">
            Active ({allChallenges.filter(c => c.isJoined && c.status === 'active').length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({allChallenges.filter(c => c.isJoined && c.status === 'completed').length})
          </TabsTrigger>
        </TabsList>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-carbon-400" />
                <Input
                  placeholder="Search challenges..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={selectedType} onValueChange={(value) => setSelectedType(value as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="individual">Individual</SelectItem>
                  <SelectItem value="team">Team</SelectItem>
                  <SelectItem value="organization">Organization</SelectItem>
                  <SelectItem value="global">Global</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedDifficulty} onValueChange={(value) => setSelectedDifficulty(value as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Difficulties" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Difficulties</SelectItem>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                  <SelectItem value="expert">Expert</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedCategory} onValueChange={(value) => setSelectedCategory(value as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="efficiency">Efficiency</SelectItem>
                  <SelectItem value="reduction">Carbon Reduction</SelectItem>
                  <SelectItem value="optimization">Optimization</SelectItem>
                  <SelectItem value="learning">Learning</SelectItem>
                  <SelectItem value="community">Community</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <TabsContent value={activeTab} className="space-y-6">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            <AnimatePresence>
              {filteredChallenges.length === 0 ? (
                <motion.div variants={itemVariants} className="md:col-span-2 lg:col-span-3">
                  <Card className="text-center py-12">
                    <CardContent>
                      <Target className="h-12 w-12 text-carbon-400 mx-auto mb-4" />
                      <h3 className="text-h5 font-medium mb-2">No challenges found</h3>
                      <p className="text-carbon-600 mb-6">
                        Try adjusting your filters or create a new challenge to get started
                      </p>
                      {activeTab === 'discover' && (
                        <Button onClick={() => setShowCreateDialog(true)}>
                          Create Challenge
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ) : (
                filteredChallenges.map((challenge) => {
                  const TypeIcon = getTypeIcon(challenge.type);
                  const CategoryIcon = getCategoryIcon(challenge.category);
                  
                  return (
                    <motion.div
                      key={challenge.id}
                      variants={itemVariants}
                      layout
                      className="relative"
                    >
                      <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <TypeIcon className="h-4 w-4 text-carbon-600" />
                                <Badge variant="outline">{challenge.type}</Badge>
                                <Badge className={getDifficultyColor(challenge.difficulty)}>
                                  {challenge.difficulty}
                                </Badge>
                              </div>
                              <CardTitle className="text-lg leading-tight">
                                {challenge.title}
                              </CardTitle>
                            </div>
                            
                            <div className="flex flex-col items-end space-y-2">
                              <Badge variant={challenge.status === 'active' ? 'success' : 
                                            challenge.status === 'upcoming' ? 'secondary' : 'outline'}>
                                {challenge.status}
                              </Badge>
                              {challenge.status === 'active' && (
                                <div className="text-xs text-carbon-500">
                                  <Clock className="h-3 w-3 inline mr-1" />
                                  {getTimeRemaining(challenge.endDate)}
                                </div>
                              )}
                              {challenge.status === 'upcoming' && (
                                <div className="text-xs text-carbon-500">
                                  <Calendar className="h-3 w-3 inline mr-1" />
                                  {getTimeUntilStart(challenge.startDate)}
                                </div>
                              )}
                            </div>
                          </div>
                        </CardHeader>

                        <CardContent className="space-y-4">
                          <p className="text-carbon-600 text-sm line-clamp-2">
                            {challenge.description}
                          </p>

                          {challenge.progress && challenge.isJoined && (
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="text-carbon-600">Your Progress</span>
                                <span className="font-medium">
                                  {challenge.progress.current} / {challenge.progress.target} {challenge.progress.unit}
                                </span>
                              </div>
                              <Progress 
                                value={(challenge.progress.current / challenge.progress.target) * 100}
                                className="h-2"
                              />
                            </div>
                          )}

                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center space-x-4">
                              <div className="flex items-center space-x-1">
                                <Users className="h-4 w-4 text-carbon-500" />
                                <span className="text-carbon-600">
                                  {challenge.currentParticipants}
                                  {challenge.maxParticipants && `/${challenge.maxParticipants}`}
                                </span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Trophy className="h-4 w-4 text-yellow-500" />
                                <span className="text-carbon-600">{challenge.reward.points} pts</span>
                              </div>
                            </div>
                            
                            <CategoryIcon className="h-4 w-4 text-carbon-500" />
                          </div>

                          <div className="flex flex-wrap gap-1">
                            {challenge.tags.slice(0, 3).map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                #{tag}
                              </Badge>
                            ))}
                            {challenge.tags.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{challenge.tags.length - 3}
                              </Badge>
                            )}
                          </div>

                          <Separator />

                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={() => setSelectedChallenge(challenge)}
                            >
                              <Info className="h-4 w-4 mr-2" />
                              Details
                            </Button>
                            
                            {challenge.isJoined ? (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleLeaveChallenge(challenge.id)}
                              >
                                Leave
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => handleJoinChallenge(challenge.id)}
                                disabled={challenge.status === 'completed' || challenge.status === 'expired' ||
                                         (challenge.maxParticipants && challenge.currentParticipants >= challenge.maxParticipants)}
                              >
                                <Play className="h-4 w-4 mr-2" />
                                Join
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          </motion.div>
        </TabsContent>
      </Tabs>

      {/* Challenge Detail Modal */}
      <Dialog open={!!selectedChallenge} onOpenChange={() => setSelectedChallenge(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-3">
              {selectedChallenge && (
                <>
                  <div className="p-2 bg-primary-100 rounded-full">
                    {React.createElement(getCategoryIcon(selectedChallenge.category), {
                      className: 'h-5 w-5 text-primary-600'
                    })}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{selectedChallenge.title}</h2>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge className={getDifficultyColor(selectedChallenge.difficulty)}>
                        {selectedChallenge.difficulty}
                      </Badge>
                      <Badge variant="outline">{selectedChallenge.type}</Badge>
                      <Badge variant={selectedChallenge.status === 'active' ? 'success' : 'outline'}>
                        {selectedChallenge.status}
                      </Badge>
                    </div>
                  </div>
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {selectedChallenge && (
            <div className="space-y-6">
              <div>
                <h3 className="font-medium mb-2">Description</h3>
                <p className="text-carbon-600">
                  {selectedChallenge.longDescription || selectedChallenge.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Timeline</h4>
                  <div className="space-y-1 text-sm">
                    <div>Start: {selectedChallenge.startDate.toLocaleDateString()}</div>
                    <div>End: {selectedChallenge.endDate.toLocaleDateString()}</div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Reward</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center space-x-1">
                      <Star className="h-4 w-4 text-yellow-500" />
                      <span>{selectedChallenge.reward.points} points</span>
                    </div>
                    {selectedChallenge.reward.title && (
                      <div>Title: {selectedChallenge.reward.title}</div>
                    )}
                  </div>
                </div>
              </div>

              {selectedChallenge.requirements && (
                <div>
                  <h3 className="font-medium mb-2">Requirements</h3>
                  <ul className="text-sm text-carbon-600 space-y-1">
                    {selectedChallenge.requirements.minCommits && (
                      <li>• Minimum {selectedChallenge.requirements.minCommits} commits</li>
                    )}
                    {selectedChallenge.requirements.targetReduction && (
                      <li>• Target: {selectedChallenge.requirements.targetReduction}% reduction</li>
                    )}
                    {selectedChallenge.requirements.teamSize && (
                      <li>• Team size: {selectedChallenge.requirements.teamSize} members</li>
                    )}
                  </ul>
                </div>
              )}

              {selectedChallenge.rules && selectedChallenge.rules.length > 0 && (
                <div>
                  <h3 className="font-medium mb-2">Rules</h3>
                  <ul className="text-sm text-carbon-600 space-y-1">
                    {selectedChallenge.rules.map((rule, index) => (
                      <li key={index}>• {rule}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setSelectedChallenge(null)}>
                  Close
                </Button>
                {selectedChallenge.isJoined ? (
                  <Button
                    variant="destructive"
                    onClick={() => {
                      handleLeaveChallenge(selectedChallenge.id);
                      setSelectedChallenge(null);
                    }}
                  >
                    Leave Challenge
                  </Button>
                ) : (
                  <Button
                    onClick={() => {
                      handleJoinChallenge(selectedChallenge.id);
                      setSelectedChallenge(null);
                    }}
                    disabled={selectedChallenge.status === 'completed' ||
                             (selectedChallenge.maxParticipants && 
                              selectedChallenge.currentParticipants >= selectedChallenge.maxParticipants)}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Join Challenge
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};