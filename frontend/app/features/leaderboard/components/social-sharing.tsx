import * as React from 'react';
import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Share2,
  Twitter,
  Linkedin,
  Facebook,
  Link,
  Download,
  Copy,
  Check,
  Globe,
  Users,
  Trophy,
  Award,
  Star,
  Target,
  Zap,
  TrendingUp,
  Camera,
  Image as ImageIcon,
  X,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@shared/components/ui/card';
import { Button } from '@shared/components/ui/button';
import { Badge } from '@shared/components/ui/badge';
import { Input } from '@shared/components/ui/input';
import { Textarea } from '@shared/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@shared/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@shared/components/ui/tabs';
import { Switch } from '@shared/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/components/ui/select';
import { toast } from '@shared/hooks/use-toast';
import { cn } from '@shared/utils/cn';

export interface ShareableAchievement {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  category: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  points: number;
  unlockedAt: Date;
  shareableImage?: string;
}

export interface ShareableProgress {
  metric: string;
  value: number;
  improvement: number;
  timeframe: string;
  rank?: number;
  totalParticipants?: number;
}

export interface ShareableTeamStats {
  teamName: string;
  teamRank: number;
  carbonSaved: number;
  challengesCompleted: number;
  members: number;
}

interface SocialSharingProps {
  className?: string;
  achievement?: ShareableAchievement;
  progress?: ShareableProgress;
  teamStats?: ShareableTeamStats;
  onShare?: (platform: string, content: string) => void;
  onGenerateImage?: () => Promise<string | null>;
}

type SharePlatform = 'twitter' | 'linkedin' | 'facebook' | 'link' | 'image';
type ShareTemplate = 'achievement' | 'progress' | 'milestone' | 'team' | 'custom';

const PLATFORM_CONFIGS = {
  twitter: {
    name: 'Twitter',
    icon: Twitter,
    color: 'bg-blue-500 hover:bg-blue-600',
    maxLength: 280,
    hashtags: ['EcoTrace', 'SustainableDev', 'GreenCoding', 'CarbonNeutral'],
  },
  linkedin: {
    name: 'LinkedIn',
    icon: Linkedin,
    color: 'bg-blue-700 hover:bg-blue-800',
    maxLength: 3000,
    hashtags: ['EcoTrace', 'SustainableDevelopment', 'GreenTech', 'ClimateAction'],
  },
  facebook: {
    name: 'Facebook',
    icon: Facebook,
    color: 'bg-blue-600 hover:bg-blue-700',
    maxLength: 63206,
    hashtags: ['EcoTrace', 'SustainableDev', 'ClimateAction'],
  },
  link: {
    name: 'Copy Link',
    icon: Link,
    color: 'bg-carbon-600 hover:bg-carbon-700',
  },
  image: {
    name: 'Download Image',
    icon: Download,
    color: 'bg-green-600 hover:bg-green-700',
  },
};

export const SocialSharing = ({
  className,
  achievement,
  progress,
  teamStats,
  onShare,
  onGenerateImage,
}: SocialSharingProps) => {
  const [selectedTemplate, setSelectedTemplate] = useState<ShareTemplate>('achievement');
  const [customMessage, setCustomMessage] = useState('');
  const [includeHashtags, setIncludeHashtags] = useState(true);
  const [includeLink, setIncludeLink] = useState(true);
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [previewMode, setPreviewMode] = useState<'text' | 'visual'>('text');

  const generateShareContent = useCallback((template: ShareTemplate, platform?: SharePlatform): string => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const profileUrl = `${baseUrl}/profile`;
    const hashtags = includeHashtags ? PLATFORM_CONFIGS[platform || 'twitter'].hashtags : [];
    
    let content = '';
    
    switch (template) {
      case 'achievement':
        if (achievement) {
          const emoji = achievement.rarity === 'legendary' ? '👑' : 
                       achievement.rarity === 'epic' ? '💎' : 
                       achievement.rarity === 'rare' ? '🌟' : 
                       achievement.rarity === 'uncommon' ? '⭐' : '🏅';
          
          content = `${emoji} Achievement Unlocked: ${achievement.name}!\n\n${achievement.description}\n\n🎯 ${achievement.points} points earned\n📅 ${achievement.unlockedAt.toLocaleDateString()}\n\n`;
          
          if (platform === 'linkedin') {
            content += `I'm proud to share this milestone in my journey toward more sustainable software development. `;
            content += `Every small step counts in reducing our digital carbon footprint.\n\n`;
          }
          
          content += `Join me on EcoTrace to track your development impact!`;
        }
        break;
        
      case 'progress':
        if (progress) {
          const trendEmoji = progress.improvement > 0 ? '📈' : '📉';
          const improvementText = progress.improvement > 0 ? 'improved' : 'working on';
          
          content = `🌱 Progress Update!\n\n${progress.metric}: ${progress.value}\n${trendEmoji} ${Math.abs(progress.improvement)}% ${improvementText} this ${progress.timeframe}\n\n`;
          
          if (progress.rank && progress.totalParticipants) {
            content += `🏆 Currently ranked #${progress.rank} out of ${progress.totalParticipants.toLocaleString()} developers\n\n`;
          }
          
          content += `Tracking my sustainable development journey with EcoTrace!`;
        }
        break;
        
      case 'team':
        if (teamStats) {
          content = `🌍 Team Achievement: ${teamStats.teamName}\n\n`;
          content += `🏆 Team Rank: #${teamStats.teamRank}\n`;
          content += `♻️ Carbon Saved: ${teamStats.carbonSaved}kg CO₂\n`;
          content += `✅ Challenges Completed: ${teamStats.challengesCompleted}\n`;
          content += `👥 ${teamStats.members} amazing teammates\n\n`;
          content += `Together, we're making development more sustainable!`;
        }
        break;
        
      case 'milestone':
        content = `🎉 Major milestone reached!\n\nJust hit a significant carbon efficiency goal on my sustainable development journey. `;
        content += `Small changes in how we code can make a big difference for our planet.\n\n`;
        content += `What's your next green coding goal?`;
        break;
        
      case 'custom':
        content = customMessage;
        break;
    }
    
    // Add hashtags
    if (includeHashtags && hashtags.length > 0) {
      const hashtagString = hashtags.map(tag => `#${tag}`).join(' ');
      content += `\n\n${hashtagString}`;
    }
    
    // Add link
    if (includeLink) {
      content += `\n\n🔗 ${profileUrl}`;
    }
    
    return content.trim();
  }, [achievement, progress, teamStats, customMessage, includeHashtags, includeLink]);

  const handleShare = async (platform: SharePlatform) => {
    const content = generateShareContent(selectedTemplate, platform);
    
    switch (platform) {
      case 'twitter':
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(content)}`;
        window.open(twitterUrl, '_blank', 'width=550,height=420');
        break;
        
      case 'linkedin':
        const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`;
        window.open(linkedinUrl, '_blank', 'width=550,height=420');
        break;
        
      case 'facebook':
        const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`;
        window.open(facebookUrl, '_blank', 'width=550,height=420');
        break;
        
      case 'link':
        try {
          await navigator.clipboard.writeText(content);
          setCopiedToClipboard(true);
          setTimeout(() => setCopiedToClipboard(false), 2000);
          toast({
            title: 'Copied to clipboard',
            description: 'Share content has been copied to your clipboard.',
          });
        } catch (error) {
          toast({
            title: 'Copy failed',
            description: 'Unable to copy to clipboard. Please select and copy manually.',
          });
        }
        break;
        
      case 'image':
        if (onGenerateImage) {
          setGeneratingImage(true);
          try {
            const imageUrl = await onGenerateImage();
            if (imageUrl) {
              // Create download link
              const link = document.createElement('a');
              link.href = imageUrl;
              link.download = `ecotrace-${selectedTemplate}-${Date.now()}.png`;
              link.click();
              
              toast({
                title: 'Image downloaded',
                description: 'Share image has been downloaded to your device.',
              });
            }
          } catch (error) {
            toast({
              title: 'Image generation failed',
              description: 'Unable to generate share image. Please try again.',
            });
          } finally {
            setGeneratingImage(false);
          }
        }
        break;
    }
    
    onShare?.(platform, content);
  };

  const getSharePreview = () => {
    const content = generateShareContent(selectedTemplate);
    const platform = PLATFORM_CONFIGS.twitter;
    const isOverLimit = content.length > platform.maxLength;
    
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Preview</span>
          <div className="flex items-center space-x-2">
            <Button
              variant={previewMode === 'text' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPreviewMode('text')}
            >
              Text
            </Button>
            <Button
              variant={previewMode === 'visual' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPreviewMode('visual')}
            >
              Visual
            </Button>
          </div>
        </div>
        
        {previewMode === 'text' ? (
          <div className={cn(
            'p-4 border border-carbon-200 rounded-lg bg-carbon-50 min-h-[120px]',
            isOverLimit && 'border-red-300 bg-red-50'
          )}>
            <div className="whitespace-pre-wrap text-sm">{content}</div>
            <div className={cn(
              'text-xs mt-2 flex justify-between',
              isOverLimit ? 'text-red-600' : 'text-carbon-500'
            )}>
              <span>Character count: {content.length}</span>
              <span>Twitter limit: {platform.maxLength}</span>
            </div>
          </div>
        ) : (
          <div className="p-4 border border-carbon-200 rounded-lg bg-white">
            <div className="bg-gradient-to-br from-primary-50 to-green-50 p-6 rounded-lg text-center">
              <div className="w-16 h-16 bg-primary-500 rounded-full flex items-center justify-center mx-auto mb-4">
                {achievement && React.createElement(achievement.icon, { className: 'h-8 w-8 text-white' })}
              </div>
              <h3 className="font-bold text-lg mb-2">
                {achievement?.name || 'EcoTrace Achievement'}
              </h3>
              <p className="text-carbon-600 text-sm mb-4">
                {achievement?.description || 'Sustainable development milestone reached!'}
              </p>
              <Badge className="bg-primary-500">
                <Star className="h-3 w-3 mr-1" />
                {achievement?.points || 100} points
              </Badge>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={cn('space-y-6', className)}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Share2 className="h-5 w-5" />
            <span>Share Your Success</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Share Template</label>
                <Select value={selectedTemplate} onValueChange={(value) => setSelectedTemplate(value as ShareTemplate)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="achievement">Achievement Unlock</SelectItem>
                    <SelectItem value="progress">Progress Update</SelectItem>
                    <SelectItem value="milestone">Major Milestone</SelectItem>
                    <SelectItem value="team">Team Success</SelectItem>
                    <SelectItem value="custom">Custom Message</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {selectedTemplate === 'custom' && (
                <div>
                  <label className="block text-sm font-medium mb-2">Custom Message</label>
                  <Textarea
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    placeholder="Write your custom share message..."
                    rows={4}
                  />
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Include Hashtags</label>
                  <Switch checked={includeHashtags} onCheckedChange={setIncludeHashtags} />
                </div>
                
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Include Profile Link</label>
                  <Switch checked={includeLink} onCheckedChange={setIncludeLink} />
                </div>
              </div>
            </div>

            <div>
              {getSharePreview()}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {(Object.keys(PLATFORM_CONFIGS) as SharePlatform[]).map((platform) => {
              const config = PLATFORM_CONFIGS[platform];
              const Icon = config.icon;
              const isGenerating = platform === 'image' && generatingImage;
              const isCopied = platform === 'link' && copiedToClipboard;
              
              return (
                <Button
                  key={platform}
                  onClick={() => handleShare(platform)}
                  disabled={isGenerating}
                  className={cn(
                    'flex items-center space-x-2 text-white',
                    config.color,
                    isCopied && 'bg-green-600 hover:bg-green-700'
                  )}
                >
                  {isGenerating ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    >
                      <Camera className="h-4 w-4" />
                    </motion.div>
                  ) : isCopied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline">
                    {isCopied ? 'Copied!' : config.name}
                  </span>
                </Button>
              );
            })}
          </div>

          <div className="text-xs text-carbon-500 space-y-1">
            <p>• Sharing helps inspire others to join the sustainable development movement</p>
            <p>• Your privacy settings control what information is included in shares</p>
            <p>• Generated images respect your current privacy preferences</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};