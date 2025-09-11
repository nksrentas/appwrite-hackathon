import * as React from 'react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Target,
  Zap,
  Users,
  BarChart3,
  ArrowRight,
  ArrowLeft,
  Check,
  Play,
  BookOpen,
  Settings,
  Globe,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/components/ui/card';
import { Button } from '@shared/components/ui/button';
import { Badge } from '@shared/components/ui/badge';
import { Progress } from '@shared/components/ui/progress';
import { Separator } from '@shared/components/ui/separator';
import { 
  Form,
  FormField,
  FormLabel,
  FormControl,
  FormInput,
  FormDescription,
  ControlledFormInput,
  useFormField 
} from '@shared/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@shared/components/ui/tabs';
import { cn } from '@shared/utils/cn';

interface WelcomeFlowProps {
  isOpen: boolean;
  onComplete: (preferences: UserOnboardingData) => void;
  onSkip?: () => void;
  className?: string;
}

interface UserOnboardingData {
  role: 'developer' | 'manager' | 'sustainability' | 'researcher' | 'other';
  organization: string;
  goals: string[];
  experience: 'beginner' | 'intermediate' | 'advanced';
  interests: string[];
  notifications: boolean;
  dataSharing: boolean;
}

const ONBOARDING_STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to EcoTrace',
    description: 'Your scientific carbon footprint tracker',
  },
  {
    id: 'role',
    title: 'Tell us about yourself',
    description: 'Help us customize your experience',
  },
  {
    id: 'goals',
    title: 'What are your goals?',
    description: 'Select what you want to achieve',
  },
  {
    id: 'preferences',
    title: 'Set your preferences',
    description: 'Configure your account settings',
  },
  {
    id: 'complete',
    title: 'You\'re all set!',
    description: 'Let\'s start tracking your carbon footprint',
  },
];

const ROLES = [
  {
    id: 'developer',
    title: 'Developer',
    description: 'Software developer or engineer',
    icon: Zap,
  },
  {
    id: 'manager',
    title: 'Manager',
    description: 'Team lead or project manager',
    icon: Users,
  },
  {
    id: 'sustainability',
    title: 'Sustainability Professional',
    description: 'Environmental or sustainability specialist',
    icon: Globe,
  },
  {
    id: 'researcher',
    title: 'Researcher',
    description: 'Academic or research professional',
    icon: BookOpen,
  },
  {
    id: 'other',
    title: 'Other',
    description: 'None of the above',
    icon: Settings,
  },
];

const GOALS = [
  { id: 'reduce_emissions', label: 'Reduce my carbon emissions', icon: Target },
  { id: 'track_progress', label: 'Track environmental progress', icon: BarChart3 },
  { id: 'compliance', label: 'Meet compliance requirements', icon: Check },
  { id: 'education', label: 'Learn about carbon footprints', icon: BookOpen },
  { id: 'benchmarking', label: 'Benchmark against others', icon: Users },
  { id: 'reporting', label: 'Generate reports', icon: BarChart3 },
];

const INTERESTS = [
  { id: 'cloud_computing', label: 'Cloud Computing' },
  { id: 'data_centers', label: 'Data Centers' },
  { id: 'renewable_energy', label: 'Renewable Energy' },
  { id: 'transportation', label: 'Transportation' },
  { id: 'waste_management', label: 'Waste Management' },
  { id: 'supply_chain', label: 'Supply Chain' },
  { id: 'carbon_offsetting', label: 'Carbon Offsetting' },
  { id: 'sustainability_reporting', label: 'Sustainability Reporting' },
];

export const WelcomeFlow = ({ isOpen, onComplete, onSkip, className }: WelcomeFlowProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  
  const organizationField = useFormField('');
  const experienceField = useFormField('intermediate');
  const notificationsField = useFormField(true);
  const dataSharingField = useFormField(false);

  const progress = ((currentStep + 1) / ONBOARDING_STEPS.length) * 100;
  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1;

  const nextStep = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const previousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    const preferences: UserOnboardingData = {
      role: selectedRole as UserOnboardingData['role'],
      organization: organizationField.value,
      goals: selectedGoals,
      experience: experienceField.value as UserOnboardingData['experience'],
      interests: selectedInterests,
      notifications: notificationsField.value,
      dataSharing: dataSharingField.value,
    };
    onComplete(preferences);
  };

  const toggleGoal = (goalId: string) => {
    setSelectedGoals(prev => 
      prev.includes(goalId) 
        ? prev.filter(id => id !== goalId)
        : [...prev, goalId]
    );
  };

  const toggleInterest = (interestId: string) => {
    setSelectedInterests(prev => 
      prev.includes(interestId) 
        ? prev.filter(id => id !== interestId)
        : [...prev, interestId]
    );
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1: // Role step
        return selectedRole !== '';
      case 2: // Goals step
        return selectedGoals.length > 0;
      default:
        return true;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={cn('w-full max-w-2xl', className)}
      >
        <Card className="shadow-2xl">
          <CardHeader className="text-center pb-6">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <Badge variant="outline" className="text-primary-600 border-primary-200">
                Getting Started
              </Badge>
            </div>
            <CardTitle className="text-h4 mb-2">
              {ONBOARDING_STEPS[currentStep].title}
            </CardTitle>
            <p className="text-body-base text-carbon-600">
              {ONBOARDING_STEPS[currentStep].description}
            </p>
            
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-carbon-500">
                  Step {currentStep + 1} of {ONBOARDING_STEPS.length}
                </span>
                <span className="text-xs text-carbon-500">
                  {Math.round(progress)}%
                </span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <AnimatePresence mode="wait">
              {currentStep === 0 && (
                <motion.div
                  key="welcome"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="text-center space-y-6"
                >
                  <div className="space-y-4">
                    <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl mx-auto flex items-center justify-center">
                      <BarChart3 className="h-10 w-10 text-white" />
                    </div>
                    <div>
                      <h3 className="text-h5 font-semibold text-carbon-900 mb-2">
                        Scientific Carbon Tracking
                      </h3>
                      <p className="text-body-base text-carbon-600 max-w-lg mx-auto">
                        EcoTrace uses peer-reviewed methodologies and authoritative data sources 
                        to provide accurate, transparent carbon footprint calculations.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-carbon-50 rounded-lg">
                      <Target className="h-6 w-6 text-primary-600 mx-auto mb-2" />
                      <h4 className="font-medium text-carbon-900">Accurate</h4>
                      <p className="text-body-sm text-carbon-600">
                        Government & peer-reviewed data
                      </p>
                    </div>
                    <div className="text-center p-4 bg-carbon-50 rounded-lg">
                      <Zap className="h-6 w-6 text-primary-600 mx-auto mb-2" />
                      <h4 className="font-medium text-carbon-900">Real-time</h4>
                      <p className="text-body-sm text-carbon-600">
                        Live calculations & updates
                      </p>
                    </div>
                    <div className="text-center p-4 bg-carbon-50 rounded-lg">
                      <BookOpen className="h-6 w-6 text-primary-600 mx-auto mb-2" />
                      <h4 className="font-medium text-carbon-900">Transparent</h4>
                      <p className="text-body-sm text-carbon-600">
                        Full methodology disclosure
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {currentStep === 1 && (
                <motion.div
                  key="role"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {ROLES.map((role) => (
                      <div
                        key={role.id}
                        className={cn(
                          'p-4 border-2 rounded-lg cursor-pointer transition-all hover:border-primary-300',
                          selectedRole === role.id
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-carbon-200 hover:bg-carbon-50'
                        )}
                        onClick={() => setSelectedRole(role.id)}
                      >
                        <div className="flex items-start space-x-3">
                          <role.icon className={cn(
                            'h-6 w-6 mt-0.5',
                            selectedRole === role.id ? 'text-primary-600' : 'text-carbon-400'
                          )} />
                          <div>
                            <h4 className="font-medium text-carbon-900">{role.title}</h4>
                            <p className="text-body-sm text-carbon-600">{role.description}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <ControlledFormInput
                    id="organization"
                    label="Organization (Optional)"
                    field={organizationField}
                    onValueChange={organizationField.setValue}
                    placeholder="e.g., Acme Corp, University of XYZ"
                    description="Help us understand your context"
                  />
                </motion.div>
              )}

              {currentStep === 2 && (
                <motion.div
                  key="goals"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {GOALS.map((goal) => (
                      <div
                        key={goal.id}
                        className={cn(
                          'p-3 border-2 rounded-lg cursor-pointer transition-all hover:border-primary-300',
                          selectedGoals.includes(goal.id)
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-carbon-200 hover:bg-carbon-50'
                        )}
                        onClick={() => toggleGoal(goal.id)}
                      >
                        <div className="flex items-center space-x-3">
                          <goal.icon className={cn(
                            'h-5 w-5',
                            selectedGoals.includes(goal.id) ? 'text-primary-600' : 'text-carbon-400'
                          )} />
                          <span className="font-medium text-carbon-900">{goal.label}</span>
                          {selectedGoals.includes(goal.id) && (
                            <Check className="h-4 w-4 text-primary-600 ml-auto" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-4 bg-primary-50 rounded-lg">
                    <p className="text-body-sm text-primary-700">
                      💡 Select multiple goals to get personalized recommendations and features.
                    </p>
                  </div>
                </motion.div>
              )}

              {currentStep === 3 && (
                <motion.div
                  key="preferences"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="space-y-4">
                    <FormField>
                      <FormLabel>Experience Level</FormLabel>
                      <FormControl>
                        <Select value={experienceField.value} onValueChange={experienceField.setValue}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="beginner">Beginner - New to carbon tracking</SelectItem>
                            <SelectItem value="intermediate">Intermediate - Some experience</SelectItem>
                            <SelectItem value="advanced">Advanced - Experienced user</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormDescription>
                        This helps us show the right level of detail
                      </FormDescription>
                    </FormField>

                    <div>
                      <FormLabel className="mb-3 block">Areas of Interest (Optional)</FormLabel>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {INTERESTS.map((interest) => (
                          <Badge
                            key={interest.id}
                            variant={selectedInterests.includes(interest.id) ? 'default' : 'outline'}
                            className="cursor-pointer hover:bg-primary-100 justify-center py-2"
                            onClick={() => toggleInterest(interest.id)}
                          >
                            {interest.label}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h4 className="font-medium text-carbon-900">Notifications & Privacy</h4>
                    <div className="space-y-3">
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notificationsField.value}
                          onChange={(e) => notificationsField.setValue(e.target.checked)}
                          className="rounded border-carbon-300"
                        />
                        <div>
                          <p className="text-body-sm font-medium text-carbon-900">
                            Email notifications
                          </p>
                          <p className="text-body-sm text-carbon-600">
                            Weekly reports and important updates
                          </p>
                        </div>
                      </label>
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={dataSharingField.value}
                          onChange={(e) => dataSharingField.setValue(e.target.checked)}
                          className="rounded border-carbon-300"
                        />
                        <div>
                          <p className="text-body-sm font-medium text-carbon-900">
                            Share anonymous usage data
                          </p>
                          <p className="text-body-sm text-carbon-600">
                            Help improve EcoTrace for everyone
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>
                </motion.div>
              )}

              {currentStep === 4 && (
                <motion.div
                  key="complete"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="text-center space-y-6"
                >
                  <div className="space-y-4">
                    <div className="w-20 h-20 bg-gradient-to-br from-success-500 to-success-600 rounded-2xl mx-auto flex items-center justify-center">
                      <Check className="h-10 w-10 text-white" />
                    </div>
                    <div>
                      <h3 className="text-h5 font-semibold text-carbon-900 mb-2">
                        Welcome aboard!
                      </h3>
                      <p className="text-body-base text-carbon-600 max-w-lg mx-auto">
                        Your account is set up and ready to go. Let's start tracking your carbon footprint 
                        with scientific precision.
                      </p>
                    </div>
                  </div>

                  <div className="bg-primary-50 rounded-lg p-4">
                    <h4 className="font-medium text-primary-900 mb-2">What's next?</h4>
                    <div className="text-left space-y-2">
                      <div className="flex items-center space-x-2">
                        <Play className="h-4 w-4 text-primary-600" />
                        <span className="text-body-sm text-primary-700">
                          Take the guided tour to learn key features
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Target className="h-4 w-4 text-primary-600" />
                        <span className="text-body-sm text-primary-700">
                          Set your first carbon reduction goal
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <BarChart3 className="h-4 w-4 text-primary-600" />
                        <span className="text-body-sm text-primary-700">
                          Start your first carbon calculation
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-center justify-between pt-6 border-t border-carbon-100">
              <div className="flex items-center space-x-3">
                {currentStep > 0 && (
                  <Button
                    variant="ghost"
                    onClick={previousStep}
                    className="flex items-center space-x-1"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Back</span>
                  </Button>
                )}
                
                {onSkip && currentStep < ONBOARDING_STEPS.length - 1 && (
                  <Button
                    variant="ghost"
                    onClick={onSkip}
                    className="text-carbon-500"
                  >
                    Skip setup
                  </Button>
                )}
              </div>

              <Button
                onClick={nextStep}
                disabled={!canProceed()}
                className="flex items-center space-x-1"
              >
                {isLastStep ? (
                  <>
                    <span>Get Started</span>
                    <Sparkles className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    <span>Continue</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};