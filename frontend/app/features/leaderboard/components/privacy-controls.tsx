import * as React from 'react';
import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Shield,
  Eye,
  EyeOff,
  Users,
  Globe,
  Lock,
  UserCheck,
  AlertTriangle,
  Info,
  Settings,
  CheckCircle,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@shared/components/ui/card';
import { Button } from '@shared/components/ui/button';
import { Badge } from '@shared/components/ui/badge';
import { Switch } from '@shared/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@shared/components/ui/dialog';
import { Separator } from '@shared/components/ui/separator';
import { Alert, AlertDescription } from '@shared/components/ui/alert';
import { cn } from '@shared/utils/cn';

export type PrivacyLevel = 'anonymous' | 'username' | 'full';
export type VisibilityScope = 'none' | 'team' | 'organization' | 'global';

export interface LeaderboardPrivacySettings {
  participationLevel: PrivacyLevel;
  dataSharing: {
    carbonEfficiency: boolean;
    improvementTrends: boolean;
    achievements: boolean;
    challengeParticipation: boolean;
  };
  visibility: {
    leaderboard: VisibilityScope;
    profile: VisibilityScope;
    activities: VisibilityScope;
  };
  teamParticipation: boolean;
  allowMentorship: boolean;
  shareMethodology: boolean;
}

interface PrivacyControlsProps {
  className?: string;
  settings?: LeaderboardPrivacySettings;
  onSettingsChange?: (settings: LeaderboardPrivacySettings) => void;
  onOptOut?: () => void;
  showOptOut?: boolean;
}

const DEFAULT_SETTINGS: LeaderboardPrivacySettings = {
  participationLevel: 'username',
  dataSharing: {
    carbonEfficiency: true,
    improvementTrends: true,
    achievements: true,
    challengeParticipation: true,
  },
  visibility: {
    leaderboard: 'global',
    profile: 'organization',
    activities: 'team',
  },
  teamParticipation: true,
  allowMentorship: false,
  shareMethodology: true,
};

export const PrivacyControls = ({
  className,
  settings = DEFAULT_SETTINGS,
  onSettingsChange,
  onOptOut,
  showOptOut = true,
}: PrivacyControlsProps) => {
  const [localSettings, setLocalSettings] = useState<LeaderboardPrivacySettings>(settings);
  const [showOptOutDialog, setShowOptOutDialog] = useState(false);

  const updateSettings = (updates: Partial<LeaderboardPrivacySettings>) => {
    const newSettings = { ...localSettings, ...updates };
    setLocalSettings(newSettings);
    onSettingsChange?.(newSettings);
  };

  const updateDataSharing = (key: keyof typeof localSettings.dataSharing, value: boolean) => {
    updateSettings({
      dataSharing: {
        ...localSettings.dataSharing,
        [key]: value,
      },
    });
  };

  const updateVisibility = (key: keyof typeof localSettings.visibility, value: VisibilityScope) => {
    updateSettings({
      visibility: {
        ...localSettings.visibility,
        [key]: value,
      },
    });
  };

  const getPrivacyLevelDescription = (level: PrivacyLevel) => {
    switch (level) {
      case 'anonymous':
        return 'Only your rank and metrics are shown. No personal information is visible.';
      case 'username':
        return 'Your username and metrics are shown. Real name remains private.';
      case 'full':
        return 'Your full profile, username, and metrics are visible to others.';
    }
  };

  const getVisibilityScopeDescription = (scope: VisibilityScope) => {
    switch (scope) {
      case 'none':
        return 'Not visible to anyone';
      case 'team':
        return 'Visible to your team members only';
      case 'organization':
        return 'Visible to your organization';
      case 'global':
        return 'Visible to all EcoTrace users';
    }
  };

  const privacyLevelOptions = [
    { value: 'anonymous', label: 'Anonymous', icon: EyeOff, description: 'Maximum privacy' },
    { value: 'username', label: 'Username Only', icon: UserCheck, description: 'Balanced visibility' },
    { value: 'full', label: 'Full Profile', icon: Eye, description: 'Open sharing' },
  ];

  const visibilityOptions = [
    { value: 'none', label: 'Private', icon: Lock },
    { value: 'team', label: 'Team', icon: Users },
    { value: 'organization', label: 'Organization', icon: Globe },
    { value: 'global', label: 'Public', icon: Eye },
  ];

  const dataCategories = [
    {
      key: 'carbonEfficiency',
      label: 'Carbon Efficiency Scores',
      description: 'Your carbon footprint per commit and efficiency metrics',
    },
    {
      key: 'improvementTrends',
      label: 'Improvement Trends',
      description: 'Your progress and improvement patterns over time',
    },
    {
      key: 'achievements',
      label: 'Achievements & Badges',
      description: 'Unlocked achievements and milestone celebrations',
    },
    {
      key: 'challengeParticipation',
      label: 'Challenge Participation',
      description: 'Your participation in team and community challenges',
    },
  ];

  return (
    <div className={cn('space-y-6', className)}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Leaderboard Privacy Settings</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Your privacy is important to us. These settings give you full control over what information
              is shared in leaderboards and challenges. Changes take effect immediately.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div>
              <h3 className="text-h6 font-medium mb-4">Participation Level</h3>
              <div className="grid gap-3">
                {privacyLevelOptions.map((option) => {
                  const Icon = option.icon;
                  const isSelected = localSettings.participationLevel === option.value;
                  
                  return (
                    <motion.div
                      key={option.value}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      className={cn(
                        'p-4 border-2 rounded-lg cursor-pointer transition-all',
                        isSelected
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-carbon-200 hover:border-carbon-300'
                      )}
                      onClick={() => updateSettings({ participationLevel: option.value as PrivacyLevel })}
                    >
                      <div className="flex items-start space-x-3">
                        <div className={cn(
                          'p-2 rounded-full',
                          isSelected ? 'bg-primary-100' : 'bg-carbon-100'
                        )}>
                          <Icon className={cn(
                            'h-4 w-4',
                            isSelected ? 'text-primary-600' : 'text-carbon-600'
                          )} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium text-carbon-900">{option.label}</h4>
                            {isSelected && (
                              <CheckCircle className="h-4 w-4 text-primary-500" />
                            )}
                            <Badge variant={isSelected ? 'default' : 'outline'}>
                              {option.description}
                            </Badge>
                          </div>
                          <p className="text-body-sm text-carbon-600 mt-1">
                            {getPrivacyLevelDescription(option.value as PrivacyLevel)}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-h6 font-medium mb-4">Data Sharing Preferences</h3>
              <div className="space-y-4">
                {dataCategories.map((category) => (
                  <div key={category.key} className="flex items-center justify-between">
                    <div>
                      <p className="text-body-base font-medium text-carbon-900">{category.label}</p>
                      <p className="text-body-sm text-carbon-600">{category.description}</p>
                    </div>
                    <Switch
                      checked={localSettings.dataSharing[category.key as keyof typeof localSettings.dataSharing]}
                      onCheckedChange={(checked) => 
                        updateDataSharing(category.key as keyof typeof localSettings.dataSharing, checked)
                      }
                    />
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-h6 font-medium mb-4">Visibility Scopes</h3>
              <div className="space-y-4">
                {[
                  { key: 'leaderboard', label: 'Leaderboard Ranking', description: 'Who can see your position on leaderboards' },
                  { key: 'profile', label: 'Profile Information', description: 'Who can view your detailed profile' },
                  { key: 'activities', label: 'Activity History', description: 'Who can see your commits and contributions' },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between">
                    <div>
                      <p className="text-body-base font-medium text-carbon-900">{item.label}</p>
                      <p className="text-body-sm text-carbon-600">{item.description}</p>
                    </div>
                    <Select
                      value={localSettings.visibility[item.key as keyof typeof localSettings.visibility]}
                      onValueChange={(value) => 
                        updateVisibility(item.key as keyof typeof localSettings.visibility, value as VisibilityScope)
                      }
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {visibilityOptions.map((option) => {
                          const Icon = option.icon;
                          return (
                            <SelectItem key={option.value} value={option.value}>
                              <div className="flex items-center space-x-2">
                                <Icon className="h-4 w-4" />
                                <span>{option.label}</span>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-h6 font-medium mb-4">Community Features</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-body-base font-medium text-carbon-900">Team Challenges</p>
                    <p className="text-body-sm text-carbon-600">
                      Participate in collaborative team challenges and competitions
                    </p>
                  </div>
                  <Switch
                    checked={localSettings.teamParticipation}
                    onCheckedChange={(checked) => updateSettings({ teamParticipation: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-body-base font-medium text-carbon-900">Mentorship Program</p>
                    <p className="text-body-sm text-carbon-600">
                      Allow experienced developers to offer you guidance and tips
                    </p>
                  </div>
                  <Switch
                    checked={localSettings.allowMentorship}
                    onCheckedChange={(checked) => updateSettings({ allowMentorship: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-body-base font-medium text-carbon-900">Share Methodologies</p>
                    <p className="text-body-sm text-carbon-600">
                      Share your successful carbon reduction techniques with the community
                    </p>
                  </div>
                  <Switch
                    checked={localSettings.shareMethodology}
                    onCheckedChange={(checked) => updateSettings({ shareMethodology: checked })}
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {showOptOut && (
        <Card className="border-warning-200">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-warning-700">
              <AlertTriangle className="h-5 w-5" />
              <span>Complete Opt-Out</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-body-sm text-carbon-600 mb-4">
              If you prefer not to participate in any leaderboards or challenges, you can opt out completely.
              This will remove you from all rankings and disable gamification features.
            </p>
            
            <Dialog open={showOptOutDialog} onOpenChange={setShowOptOutDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-warning-300 text-warning-700 hover:bg-warning-50">
                  Opt Out of Leaderboards
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center space-x-2 text-warning-700">
                    <AlertTriangle className="h-5 w-5" />
                    <span>Confirm Opt-Out</span>
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-body-base text-carbon-600">
                    Opting out will:
                  </p>
                  <ul className="text-body-sm text-carbon-600 space-y-2 list-disc list-inside ml-4">
                    <li>Remove you from all leaderboards immediately</li>
                    <li>Disable participation in challenges and competitions</li>
                    <li>Hide your achievements from other users</li>
                    <li>Stop all gamification notifications</li>
                  </ul>
                  <p className="text-body-sm text-carbon-500">
                    You can rejoin leaderboards at any time by updating your privacy settings.
                  </p>
                  <div className="flex justify-end space-x-3 pt-4">
                    <Button variant="outline" onClick={() => setShowOptOutDialog(false)}>
                      Keep Participating
                    </Button>
                    <Button 
                      variant="destructive" 
                      onClick={() => {
                        onOptOut?.();
                        setShowOptOutDialog(false);
                      }}
                    >
                      Opt Out
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      )}
    </div>
  );
};