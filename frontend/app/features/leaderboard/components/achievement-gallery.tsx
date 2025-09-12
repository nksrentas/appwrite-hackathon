import * as React from 'react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy,
  Medal,
  Award,
  Star,
  Target,
  Zap,
  Calendar,
  GitCommit,
  Clock,
  TrendingUp,
  Users,
  Flame,
  Shield,
  Crown,
  Lock,
  Share2,
  Download,
  ChevronRight,
  Sparkles,
  CheckCircle,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@shared/components/ui/card';
import { Button } from '@shared/components/ui/button';
import { Badge } from '@shared/components/ui/badge';
import { Progress } from '@shared/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@shared/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@shared/components/ui/tabs';
import { toast } from '@shared/hooks/use-toast';
import { cn } from '@shared/utils/cn';

export type AchievementRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export type AchievementCategory = 'efficiency' | 'improvement' | 'community' | 'challenge' | 'milestone' | 'special';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  detailDescription?: string;
  icon: React.ComponentType<{ className?: string }>;
  category: AchievementCategory;
  rarity: AchievementRarity;
  points: number;
  unlockedAt?: Date;
  progress?: {
    current: number;
    target: number;
    unit?: string;
  };
  unlockCriteria: {
    type: string;
    description: string;
    requirements: Record<string, any>;
  };
  prerequisites?: string[];
  isSecret?: boolean;
  shareableImage?: string;
}

interface AchievementGalleryProps {
  className?: string;
  achievements: Achievement[];
  onShare?: (achievement: Achievement) => void;
  onExport?: () => void;
  showProgress?: boolean;
  showSecrets?: boolean;
  enableUnlockAnimations?: boolean;
}

const RARITY_COLORS = {
  common: { bg: 'bg-carbon-100', text: 'text-carbon-700', border: 'border-carbon-300' },
  uncommon: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
  rare: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
  epic: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300' },
  legendary: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300' },
};

const CATEGORY_ICONS = {
  efficiency: Zap,
  improvement: TrendingUp,
  community: Users,
  challenge: Target,
  milestone: Trophy,
  special: Crown,
};

export const AchievementGallery = ({
  className,
  achievements,
  onShare,
  onExport,
  showProgress = true,
  showSecrets = false,
  enableUnlockAnimations = true,
}: AchievementGalleryProps) => {
  const [selectedCategory, setSelectedCategory] = useState<AchievementCategory | 'all'>('all');
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);
  const [newlyUnlocked, setNewlyUnlocked] = useState<Set<string>>(new Set());
  const [showUnlockAnimation, setShowUnlockAnimation] = useState<Achievement | null>(null);

  // Mock newly unlocked achievements for demonstration
  useEffect(() => {
    const timer = setTimeout(() => {
      const unlockedAchievement = achievements.find(a => a.id === 'efficiency-master');
      if (unlockedAchievement && enableUnlockAnimations) {
        setShowUnlockAnimation(unlockedAchievement);
        setNewlyUnlocked(prev => new Set([...prev, unlockedAchievement.id]));
        
        // Clear animation after duration
        setTimeout(() => {
          setShowUnlockAnimation(null);
          setNewlyUnlocked(prev => {
            const updated = new Set(prev);
            updated.delete(unlockedAchievement.id);
            return updated;
          });
        }, 5000);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [achievements, enableUnlockAnimations]);

  const categories = [
    { value: 'all', label: 'All Achievements', icon: Trophy },
    { value: 'efficiency', label: 'Efficiency', icon: Zap },
    { value: 'improvement', label: 'Improvement', icon: TrendingUp },
    { value: 'community', label: 'Community', icon: Users },
    { value: 'challenge', label: 'Challenges', icon: Target },
    { value: 'milestone', label: 'Milestones', icon: Trophy },
    { value: 'special', label: 'Special', icon: Crown },
  ];

  const filteredAchievements = achievements.filter(achievement => {
    if (!showSecrets && achievement.isSecret && !achievement.unlockedAt) return false;
    if (selectedCategory === 'all') return true;
    return achievement.category === selectedCategory;
  });

  const achievementStats = {
    total: achievements.length,
    unlocked: achievements.filter(a => a.unlockedAt).length,
    points: achievements.filter(a => a.unlockedAt).reduce((sum, a) => sum + a.points, 0),
    rarity: achievements
      .filter(a => a.unlockedAt)
      .reduce((acc, a) => {
        acc[a.rarity] = (acc[a.rarity] || 0) + 1;
        return acc;
      }, {} as Record<AchievementRarity, number>),
  };

  const handleShare = (achievement: Achievement) => {
    if (onShare) {
      onShare(achievement);
    } else {
      // Default sharing logic
      if (navigator.share) {
        navigator.share({
          title: `Achievement Unlocked: ${achievement.name}`,
          text: achievement.description,
          url: window.location.href,
        });
      } else {
        navigator.clipboard.writeText(
          `🏆 Achievement Unlocked: ${achievement.name}\n${achievement.description}\n\nEcoTrace - Making development more sustainable`
        );
        toast({
          title: 'Copied to clipboard',
          description: 'Achievement details copied for sharing',
        });
      }
    }
  };

  const getRarityGlow = (rarity: AchievementRarity) => {
    switch (rarity) {
      case 'legendary':
        return 'shadow-lg shadow-yellow-200/50 ring-2 ring-yellow-300/30';
      case 'epic':
        return 'shadow-lg shadow-purple-200/50 ring-2 ring-purple-300/30';
      case 'rare':
        return 'shadow-md shadow-blue-200/50 ring-1 ring-blue-300/30';
      default:
        return '';
    }
  };

  const unlockAnimationVariants = {
    initial: {
      scale: 0.8,
      opacity: 0,
      rotateY: -90,
    },
    animate: {
      scale: 1,
      opacity: 1,
      rotateY: 0,
      transition: {
        duration: 0.8,
        ease: 'easeOut',
      },
    },
    exit: {
      scale: 0.9,
      opacity: 0,
      y: -20,
      transition: {
        duration: 0.3,
      },
    },
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Achievement Stats */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              <span>Achievement Gallery</span>
            </CardTitle>
            
            {onExport && (
              <Button variant="outline" onClick={onExport}>
                <Download className="h-4 w-4 mr-2" />
                Export Collection
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary-500">
                {achievementStats.unlocked}
              </div>
              <div className="text-caption text-carbon-600">
                of {achievementStats.total} unlocked
              </div>
              <Progress 
                value={(achievementStats.unlocked / achievementStats.total) * 100} 
                className="mt-2" 
              />
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-500">
                {achievementStats.points}
              </div>
              <div className="text-caption text-carbon-600">points earned</div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-purple-500">
                {achievementStats.rarity.legendary || 0}
              </div>
              <div className="text-caption text-carbon-600">legendary</div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-blue-500">
                {achievementStats.rarity.epic || 0}
              </div>
              <div className="text-caption text-carbon-600">epic</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category Filters */}
      <Tabs value={selectedCategory} onValueChange={(value) => setSelectedCategory(value as any)}>
        <TabsList className="grid grid-cols-4 md:grid-cols-7 w-full">
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <TabsTrigger key={category.value} value={category.value} className="text-xs">
                <Icon className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">{category.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value={selectedCategory} className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {filteredAchievements.map((achievement) => {
                const Icon = achievement.icon;
                const isUnlocked = !!achievement.unlockedAt;
                const isSecret = achievement.isSecret && !isUnlocked;
                const rarity = RARITY_COLORS[achievement.rarity];
                const isNewlyUnlocked = newlyUnlocked.has(achievement.id);

                return (
                  <motion.div
                    key={achievement.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    whileHover={{ scale: isUnlocked ? 1.02 : 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card
                      className={cn(
                        'cursor-pointer transition-all duration-300 relative overflow-hidden',
                        isUnlocked ? 'hover:shadow-lg' : 'opacity-60',
                        isNewlyUnlocked && 'animate-pulse',
                        getRarityGlow(achievement.rarity),
                        rarity.border
                      )}
                      onClick={() => setSelectedAchievement(achievement)}
                    >
                      {/* Rarity indicator */}
                      <div className={cn('absolute top-0 right-0 px-2 py-1 rounded-bl-lg text-xs font-medium', rarity.bg, rarity.text)}>
                        {achievement.rarity}
                      </div>

                      {/* New badge */}
                      {isNewlyUnlocked && (
                        <motion.div
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{ scale: 1, rotate: 0 }}
                          className="absolute top-2 left-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-bold"
                        >
                          NEW!
                        </motion.div>
                      )}

                      <CardContent className="p-6 text-center space-y-4">
                        <div className={cn(
                          'mx-auto w-16 h-16 rounded-full flex items-center justify-center',
                          isUnlocked ? rarity.bg : 'bg-carbon-100'
                        )}>
                          {isSecret ? (
                            <Lock className="h-8 w-8 text-carbon-400" />
                          ) : (
                            <Icon className={cn(
                              'h-8 w-8',
                              isUnlocked ? rarity.text : 'text-carbon-400'
                            )} />
                          )}
                        </div>

                        <div>
                          <h3 className={cn(
                            'font-bold mb-2',
                            isUnlocked ? 'text-carbon-900' : 'text-carbon-500'
                          )}>
                            {isSecret ? '???' : achievement.name}
                          </h3>
                          <p className={cn(
                            'text-body-sm',
                            isUnlocked ? 'text-carbon-600' : 'text-carbon-400'
                          )}>
                            {isSecret ? 'Secret achievement - unlock to reveal' : achievement.description}
                          </p>
                        </div>

                        {showProgress && achievement.progress && !isUnlocked && (
                          <div className="space-y-2">
                            <div className="flex justify-between text-caption">
                              <span>Progress</span>
                              <span>{achievement.progress.current} / {achievement.progress.target} {achievement.progress.unit || ''}</span>
                            </div>
                            <Progress 
                              value={(achievement.progress.current / achievement.progress.target) * 100}
                              className="h-2"
                            />
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <Badge variant={isUnlocked ? 'success' : 'outline'}>
                            <Star className="h-3 w-3 mr-1" />
                            {achievement.points} pts
                          </Badge>
                          
                          {isUnlocked && achievement.unlockedAt && (
                            <div className="text-caption text-carbon-500">
                              {achievement.unlockedAt.toLocaleDateString()}
                            </div>
                          )}
                        </div>

                        {isUnlocked && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleShare(achievement);
                            }}
                            className="w-full"
                          >
                            <Share2 className="h-4 w-4 mr-2" />
                            Share
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </TabsContent>
      </Tabs>

      {/* Achievement Detail Modal */}
      <Dialog open={!!selectedAchievement} onOpenChange={() => setSelectedAchievement(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-3">
              {selectedAchievement && (
                <>
                  <div className={cn(
                    'p-3 rounded-full',
                    RARITY_COLORS[selectedAchievement.rarity].bg
                  )}>
                    <selectedAchievement.icon className={cn(
                      'h-6 w-6',
                      RARITY_COLORS[selectedAchievement.rarity].text
                    )} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{selectedAchievement.name}</h2>
                    <Badge className={cn(
                      'mt-1',
                      RARITY_COLORS[selectedAchievement.rarity].bg,
                      RARITY_COLORS[selectedAchievement.rarity].text
                    )}>
                      {selectedAchievement.rarity} • {selectedAchievement.points} points
                    </Badge>
                  </div>
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {selectedAchievement && (
            <div className="space-y-6">
              <div>
                <h3 className="font-medium mb-2">Description</h3>
                <p className="text-carbon-600">
                  {selectedAchievement.detailDescription || selectedAchievement.description}
                </p>
              </div>

              <div>
                <h3 className="font-medium mb-2">Unlock Requirements</h3>
                <p className="text-carbon-600">{selectedAchievement.unlockCriteria.description}</p>
              </div>

              {selectedAchievement.prerequisites && selectedAchievement.prerequisites.length > 0 && (
                <div>
                  <h3 className="font-medium mb-2">Prerequisites</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedAchievement.prerequisites.map((prereq, index) => (
                      <Badge key={index} variant="outline">{prereq}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedAchievement.unlockedAt && (
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span>Unlocked {selectedAchievement.unlockedAt.toLocaleDateString()}</span>
                  </div>
                  <Button onClick={() => handleShare(selectedAchievement)}>
                    <Share2 className="h-4 w-4 mr-2" />
                    Share Achievement
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Unlock Animation */}
      <AnimatePresence>
        {showUnlockAnimation && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              variants={unlockAnimationVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="bg-white rounded-2xl p-8 text-center shadow-2xl max-w-md mx-4"
            >
              <motion.div
                animate={{ 
                  rotate: [0, 10, -10, 0],
                  scale: [1, 1.1, 1] 
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut'
                }}
                className={cn(
                  'mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-4',
                  RARITY_COLORS[showUnlockAnimation.rarity].bg
                )}
              >
                <showUnlockAnimation.icon className={cn(
                  'h-10 w-10',
                  RARITY_COLORS[showUnlockAnimation.rarity].text
                )} />
              </motion.div>
              
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <h2 className="text-2xl font-bold text-carbon-900 mb-2">
                  Achievement Unlocked!
                </h2>
                <h3 className="text-xl font-semibold text-primary-600 mb-2">
                  {showUnlockAnimation.name}
                </h3>
                <p className="text-carbon-600 mb-4">
                  {showUnlockAnimation.description}
                </p>
                <Badge className={cn(
                  RARITY_COLORS[showUnlockAnimation.rarity].bg,
                  RARITY_COLORS[showUnlockAnimation.rarity].text
                )}>
                  <Star className="h-4 w-4 mr-1" />
                  {showUnlockAnimation.points} points earned
                </Badge>
              </motion.div>

              <motion.div
                className="absolute -top-4 -left-4 w-8 h-8"
                animate={{
                  rotate: 360,
                  scale: [1, 1.2, 1],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: 'linear'
                }}
              >
                <Sparkles className="w-full h-full text-yellow-400" />
              </motion.div>
              
              <motion.div
                className="absolute -bottom-4 -right-4 w-6 h-6"
                animate={{
                  rotate: -360,
                  scale: [1, 1.3, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'linear'
                }}
              >
                <Sparkles className="w-full h-full text-blue-400" />
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};