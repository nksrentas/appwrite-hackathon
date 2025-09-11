import * as React from 'react';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Bell,
  Shield,
  Globe,
  Palette,
  Database,
  Download,
  Trash2,
  Eye,
  EyeOff,
  Save,
  RefreshCw,
  Check,
  X,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/components/ui/card';
import { Button } from '@shared/components/ui/button';
import { Badge } from '@shared/components/ui/badge';
import { Separator } from '@shared/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@shared/components/ui/tabs';
import { Switch } from '@shared/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@shared/components/ui/dialog';
import {
  Form,
  FormField,
  FormLabel,
  FormControl,
  FormInput,
  FormError,
  FormDescription,
  FormValidationSummary,
  ControlledFormInput,
  useFormField,
} from '@shared/components/ui/form';
import { toast } from '@shared/hooks/use-toast';
import {
  userPreferencesSchema,
  validateForm,
  type UserPreferencesFormData,
} from '@shared/utils/validation';
import { cn } from '@shared/utils/cn';

interface UserSettingsProps {
  className?: string;
  currentUser?: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    avatar?: string;
    createdAt: Date;
    lastLogin: Date;
  };
  onSave?: (preferences: UserPreferencesFormData) => Promise<void>;
  onDeleteAccount?: () => Promise<void>;
  onExportData?: () => Promise<void>;
}

interface UserPreferences {
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
    weeklyReports: boolean;
    goalReminders: boolean;
    dataUpdates: boolean;
  };
  units: {
    distance: 'km' | 'miles';
    energy: 'kwh' | 'btu';
    temperature: 'celsius' | 'fahrenheit';
    weight: 'kg' | 'lbs';
  };
  privacy: {
    shareData: boolean;
    publicProfile: boolean;
    dataRetention: '1year' | '2years' | '5years' | 'indefinite';
    analytics: boolean;
  };
  appearance: {
    theme: 'light' | 'dark' | 'system';
    compactMode: boolean;
    animations: boolean;
    highContrast: boolean;
  };
  calculation: {
    defaultApproach: 'conservative' | 'average' | 'optimistic';
    showUncertainty: boolean;
    detailLevel: 'basic' | 'advanced' | 'expert';
    autoCalculate: boolean;
  };
}

const DEFAULT_PREFERENCES: UserPreferences = {
  notifications: {
    email: true,
    push: true,
    sms: false,
    weeklyReports: true,
    goalReminders: true,
    dataUpdates: false,
  },
  units: {
    distance: 'km',
    energy: 'kwh',
    temperature: 'celsius',
    weight: 'kg',
  },
  privacy: {
    shareData: false,
    publicProfile: false,
    dataRetention: '2years',
    analytics: true,
  },
  appearance: {
    theme: 'system',
    compactMode: false,
    animations: true,
    highContrast: false,
  },
  calculation: {
    defaultApproach: 'conservative',
    showUncertainty: true,
    detailLevel: 'advanced',
    autoCalculate: true,
  },
};

export const UserSettings = ({
  className,
  currentUser,
  onSave,
  onDeleteAccount,
  onExportData,
}: UserSettingsProps) => {
  const [activeTab, setActiveTab] = useState('profile');
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);

  const nameField = useFormField(currentUser?.name || '');
  const emailField = useFormField(currentUser?.email || '');
  const phoneField = useFormField(currentUser?.phone || '');
  const currentPasswordField = useFormField('');
  const newPasswordField = useFormField('');
  const confirmPasswordField = useFormField('');

  useEffect(() => {
    setHasUnsavedChanges(true);
  }, [preferences]);

  const updatePreference = <K extends keyof UserPreferences, L extends keyof UserPreferences[K]>(
    category: K,
    key: L,
    value: UserPreferences[K][L]
  ) => {
    setPreferences(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value,
      },
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const formData: UserPreferencesFormData = {
        name: nameField.value,
        email: emailField.value,
        phone: phoneField.value || undefined,
        notifications: preferences.notifications,
        units: preferences.units,
        privacy: preferences.privacy,
      };

      const validation = validateForm(userPreferencesSchema, formData);
      if (!validation.success) {
        toast.error({
          title: 'Validation Error',
          description: validation.errors[0]?.message || 'Please check your input.',
        });
        return;
      }

      await onSave?.(validation.data);
      setHasUnsavedChanges(false);
      
      toast.success({
        title: 'Settings Saved',
        description: 'Your preferences have been updated successfully.',
      });
    } catch (error) {
      console.error('Save failed:', error);
      toast.error({
        title: 'Save Failed',
        description: 'There was an error saving your settings. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (newPasswordField.value !== confirmPasswordField.value) {
      toast.error({
        title: 'Password Mismatch',
        description: 'New password and confirmation do not match.',
      });
      return;
    }

    try {
      toast.success({
        title: 'Password Updated',
        description: 'Your password has been changed successfully.',
      });
      setShowPasswordChange(false);
      currentPasswordField.reset();
      newPasswordField.reset();
      confirmPasswordField.reset();
    } catch (error) {
      toast.error({
        title: 'Password Change Failed',
        description: 'There was an error changing your password.',
      });
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await onDeleteAccount?.();
      toast.success({
        title: 'Account Deleted',
        description: 'Your account has been deleted successfully.',
      });
    } catch (error) {
      toast.error({
        title: 'Deletion Failed',
        description: 'There was an error deleting your account.',
      });
    }
  };

  const TABS = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'privacy', label: 'Privacy & Security', icon: Shield },
    { id: 'units', label: 'Units & Formats', icon: Globe },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'calculation', label: 'Calculation Preferences', icon: Database },
  ];

  return (
    <div className={cn('space-y-6', className)}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h3 font-bold text-carbon-900">Settings</h1>
          <p className="text-body-base text-carbon-600">
            Manage your account, preferences, and privacy settings
          </p>
        </div>
        {hasUnsavedChanges && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center space-x-3"
          >
            <Badge variant="outline" className="text-warning-600 border-warning-300">
              Unsaved Changes
            </Badge>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center space-x-2"
            >
              {isSaving ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span>Save Changes</span>
            </Button>
          </motion.div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          {TABS.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id} className="flex items-center space-x-2">
              <tab.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>Profile Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ControlledFormInput
                  id="name"
                  label="Full Name"
                  field={nameField}
                  onValueChange={nameField.setValue}
                  required
                />
                <ControlledFormInput
                  id="email"
                  label="Email Address"
                  type="email"
                  field={emailField}
                  onValueChange={emailField.setValue}
                  required
                />
                <ControlledFormInput
                  id="phone"
                  label="Phone Number"
                  type="tel"
                  field={phoneField}
                  onValueChange={phoneField.setValue}
                  placeholder="+1 (555) 123-4567"
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-h6 font-medium">Password</h3>
                    <p className="text-body-sm text-carbon-600">
                      Last changed: {currentUser?.lastLogin.toLocaleDateString() || 'Never'}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setShowPasswordChange(!showPasswordChange)}
                  >
                    {showPasswordChange ? 'Cancel' : 'Change Password'}
                  </Button>
                </div>

                {showPasswordChange && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4 border-t pt-4"
                  >
                    <ControlledFormInput
                      id="current-password"
                      label="Current Password"
                      type="password"
                      field={currentPasswordField}
                      onValueChange={currentPasswordField.setValue}
                      required
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <ControlledFormInput
                        id="new-password"
                        label="New Password"
                        type="password"
                        field={newPasswordField}
                        onValueChange={newPasswordField.setValue}
                        required
                      />
                      <ControlledFormInput
                        id="confirm-password"
                        label="Confirm New Password"
                        type="password"
                        field={confirmPasswordField}
                        onValueChange={confirmPasswordField.setValue}
                        required
                      />
                    </div>
                    <div className="flex justify-end space-x-3">
                      <Button
                        variant="outline"
                        onClick={() => setShowPasswordChange(false)}
                      >
                        Cancel
                      </Button>
                      <Button onClick={handlePasswordChange}>
                        Update Password
                      </Button>
                    </div>
                  </motion.div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-body-sm text-carbon-500">Account Created</p>
                  <p className="text-body-base text-carbon-900">
                    {currentUser?.createdAt.toLocaleDateString() || 'Unknown'}
                  </p>
                </div>
                <div>
                  <p className="text-body-sm text-carbon-500">Last Login</p>
                  <p className="text-body-base text-carbon-900">
                    {currentUser?.lastLogin.toLocaleDateString() || 'Unknown'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="h-5 w-5" />
                <span>Notification Preferences</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {[
                { key: 'email', label: 'Email Notifications', description: 'Receive updates via email' },
                { key: 'push', label: 'Push Notifications', description: 'Browser and mobile notifications' },
                { key: 'sms', label: 'SMS Notifications', description: 'Text message alerts' },
                { key: 'weeklyReports', label: 'Weekly Reports', description: 'Carbon footprint summaries' },
                { key: 'goalReminders', label: 'Goal Reminders', description: 'Progress towards carbon goals' },
                { key: 'dataUpdates', label: 'Data Updates', description: 'New emission factors and methodologies' },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between">
                  <div>
                    <p className="text-body-base font-medium text-carbon-900">{item.label}</p>
                    <p className="text-body-sm text-carbon-600">{item.description}</p>
                  </div>
                  <Switch
                    checked={preferences.notifications[item.key as keyof typeof preferences.notifications]}
                    onCheckedChange={(checked) => 
                      updatePreference('notifications', item.key as keyof typeof preferences.notifications, checked)
                    }
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="privacy" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Privacy & Security</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-body-base font-medium text-carbon-900">Share Anonymous Data</p>
                    <p className="text-body-sm text-carbon-600">
                      Help improve EcoTrace by sharing anonymized usage data
                    </p>
                  </div>
                  <Switch
                    checked={preferences.privacy.shareData}
                    onCheckedChange={(checked) => updatePreference('privacy', 'shareData', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-body-base font-medium text-carbon-900">Public Profile</p>
                    <p className="text-body-sm text-carbon-600">
                      Make your carbon reduction achievements visible to others
                    </p>
                  </div>
                  <Switch
                    checked={preferences.privacy.publicProfile}
                    onCheckedChange={(checked) => updatePreference('privacy', 'publicProfile', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-body-base font-medium text-carbon-900">Analytics</p>
                    <p className="text-body-sm text-carbon-600">
                      Allow usage analytics to improve your experience
                    </p>
                  </div>
                  <Switch
                    checked={preferences.privacy.analytics}
                    onCheckedChange={(checked) => updatePreference('privacy', 'analytics', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-body-base font-medium text-carbon-900">Data Retention</p>
                    <p className="text-body-sm text-carbon-600">
                      How long to keep your calculation history
                    </p>
                  </div>
                  <Select
                    value={preferences.privacy.dataRetention}
                    onValueChange={(value) => 
                      updatePreference('privacy', 'dataRetention', value as typeof preferences.privacy.dataRetention)
                    }
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1year">1 Year</SelectItem>
                      <SelectItem value="2years">2 Years</SelectItem>
                      <SelectItem value="5years">5 Years</SelectItem>
                      <SelectItem value="indefinite">Indefinite</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-h6 font-medium">Data Management</h3>
                <div className="flex space-x-3">
                  <Button
                    variant="outline"
                    onClick={onExportData}
                    className="flex items-center space-x-2"
                  >
                    <Download className="h-4 w-4" />
                    <span>Export My Data</span>
                  </Button>
                  <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                    <DialogTrigger asChild>
                      <Button variant="destructive" className="flex items-center space-x-2">
                        <Trash2 className="h-4 w-4" />
                        <span>Delete Account</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle className="flex items-center space-x-2 text-danger-600">
                          <AlertTriangle className="h-5 w-5" />
                          <span>Delete Account</span>
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <p className="text-body-base text-carbon-600">
                          This action cannot be undone. This will permanently delete your account and remove all your data from our servers.
                        </p>
                        <div className="flex justify-end space-x-3">
                          <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                            Cancel
                          </Button>
                          <Button variant="destructive" onClick={handleDeleteAccount}>
                            Delete Account
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="units" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Globe className="h-5 w-5" />
                <span>Units & Formats</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {[
                { key: 'distance', label: 'Distance', options: [{ value: 'km', label: 'Kilometers' }, { value: 'miles', label: 'Miles' }] },
                { key: 'energy', label: 'Energy', options: [{ value: 'kwh', label: 'Kilowatt Hours' }, { value: 'btu', label: 'BTU' }] },
                { key: 'temperature', label: 'Temperature', options: [{ value: 'celsius', label: 'Celsius' }, { value: 'fahrenheit', label: 'Fahrenheit' }] },
                { key: 'weight', label: 'Weight', options: [{ value: 'kg', label: 'Kilograms' }, { value: 'lbs', label: 'Pounds' }] },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between">
                  <div>
                    <p className="text-body-base font-medium text-carbon-900">{item.label}</p>
                  </div>
                  <Select
                    value={preferences.units[item.key as keyof typeof preferences.units]}
                    onValueChange={(value) => 
                      updatePreference('units', item.key as keyof typeof preferences.units, value as any)
                    }
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {item.options.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Palette className="h-5 w-5" />
                <span>Appearance</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-body-base font-medium text-carbon-900">Theme</p>
                  <p className="text-body-sm text-carbon-600">Choose your preferred color scheme</p>
                </div>
                <Select
                  value={preferences.appearance.theme}
                  onValueChange={(value) => 
                    updatePreference('appearance', 'theme', value as typeof preferences.appearance.theme)
                  }
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {[
                { key: 'compactMode', label: 'Compact Mode', description: 'Use smaller spacing and elements' },
                { key: 'animations', label: 'Animations', description: 'Enable smooth transitions and effects' },
                { key: 'highContrast', label: 'High Contrast', description: 'Increase contrast for better accessibility' },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between">
                  <div>
                    <p className="text-body-base font-medium text-carbon-900">{item.label}</p>
                    <p className="text-body-sm text-carbon-600">{item.description}</p>
                  </div>
                  <Switch
                    checked={preferences.appearance[item.key as keyof typeof preferences.appearance]}
                    onCheckedChange={(checked) => 
                      updatePreference('appearance', item.key as keyof typeof preferences.appearance, checked)
                    }
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calculation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Database className="h-5 w-5" />
                <span>Calculation Preferences</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-body-base font-medium text-carbon-900">Default Approach</p>
                  <p className="text-body-sm text-carbon-600">
                    How to handle uncertainties in calculations
                  </p>
                </div>
                <Select
                  value={preferences.calculation.defaultApproach}
                  onValueChange={(value) => 
                    updatePreference('calculation', 'defaultApproach', value as typeof preferences.calculation.defaultApproach)
                  }
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="conservative">Conservative</SelectItem>
                    <SelectItem value="average">Average</SelectItem>
                    <SelectItem value="optimistic">Optimistic</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-body-base font-medium text-carbon-900">Detail Level</p>
                  <p className="text-body-sm text-carbon-600">
                    Amount of detail in calculation explanations
                  </p>
                </div>
                <Select
                  value={preferences.calculation.detailLevel}
                  onValueChange={(value) => 
                    updatePreference('calculation', 'detailLevel', value as typeof preferences.calculation.detailLevel)
                  }
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">Basic</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                    <SelectItem value="expert">Expert</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {[
                { key: 'showUncertainty', label: 'Show Uncertainty', description: 'Display confidence intervals and uncertainty ranges' },
                { key: 'autoCalculate', label: 'Auto Calculate', description: 'Automatically calculate when data changes' },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between">
                  <div>
                    <p className="text-body-base font-medium text-carbon-900">{item.label}</p>
                    <p className="text-body-sm text-carbon-600">{item.description}</p>
                  </div>
                  <Switch
                    checked={preferences.calculation[item.key as keyof typeof preferences.calculation]}
                    onCheckedChange={(checked) => 
                      updatePreference('calculation', item.key as keyof typeof preferences.calculation, checked)
                    }
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};