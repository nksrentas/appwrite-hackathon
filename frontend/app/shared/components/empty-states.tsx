import * as React from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  Calculator,
  Target,
  Search,
  Plus,
  Upload,
  Database,
  Calendar,
  Users,
  Zap,
  Settings,
  BookOpen,
  TrendingUp,
  FileText,
  Globe,
  Clock,
  Filter,
  CheckCircle,
  AlertCircle,
  Lightbulb,
  ArrowRight,
  Play,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/components/ui/card';
import { Button } from '@shared/components/ui/button';
import { Badge } from '@shared/components/ui/badge';
import { cn } from '@shared/utils/cn';

interface BaseEmptyStateProps {
  className?: string;
  title?: string;
  description?: string;
  children?: React.ReactNode;
}

interface EmptyStateProps extends BaseEmptyStateProps {
  variant?: 'dashboard' | 'calculations' | 'search' | 'data' | 'goals' | 'reports' | 'settings' | 'generic';
  icon?: React.ComponentType<{ className?: string }>;
  primaryAction?: {
    label: string;
    onClick: () => void;
    icon?: React.ComponentType<{ className?: string }>;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
    icon?: React.ComponentType<{ className?: string }>;
  };
  suggestions?: string[];
  showQuickActions?: boolean;
}

const EMPTY_STATE_CONFIGS = {
  dashboard: {
    icon: BarChart3,
    title: 'Welcome to your Carbon Dashboard',
    description: 'Start tracking your carbon footprint to see insights and trends here.',
    suggestions: [
      'Connect your cloud services for automatic tracking',
      'Manually add your first carbon calculation',
      'Set up your carbon reduction goals',
    ],
  },
  calculations: {
    icon: Calculator,
    title: 'No Calculations Yet',
    description: 'Create your first carbon footprint calculation to get started.',
    suggestions: [
      'Use our guided calculation wizard',
      'Import data from connected services',
      'Upload a CSV file with your data',
    ],
  },
  search: {
    icon: Search,
    title: 'No Results Found',
    description: 'We couldn\'t find any results matching your search criteria.',
    suggestions: [
      'Check your spelling',
      'Try different keywords',
      'Use broader search terms',
    ],
  },
  data: {
    icon: Database,
    title: 'No Data Available',
    description: 'There\'s no data to display for the selected period or filters.',
    suggestions: [
      'Try a different date range',
      'Adjust your filters',
      'Check your data connections',
    ],
  },
  goals: {
    icon: Target,
    title: 'No Goals Set',
    description: 'Set carbon reduction goals to track your environmental impact progress.',
    suggestions: [
      'Start with a simple reduction target',
      'Use our goal templates',
      'Learn about effective carbon goals',
    ],
  },
  reports: {
    icon: FileText,
    title: 'No Reports Generated',
    description: 'Generate your first carbon footprint report to share your progress.',
    suggestions: [
      'Create a monthly summary report',
      'Export your calculation data',
      'Schedule automated reports',
    ],
  },
  settings: {
    icon: Settings,
    title: 'Default Settings Active',
    description: 'Your account is using default settings. Customize them to improve your experience.',
    suggestions: [
      'Set your preferred units',
      'Configure notifications',
      'Update your profile information',
    ],
  },
  generic: {
    icon: AlertCircle,
    title: 'Nothing Here Yet',
    description: 'This section is empty. Start by adding some content.',
    suggestions: [
      'Check back later',
      'Try refreshing the page',
      'Contact support if you need help',
    ],
  },
} as const;

export const EmptyState: React.FC<EmptyStateProps> = ({
  variant = 'generic',
  className,
  title,
  description,
  icon,
  primaryAction,
  secondaryAction,
  suggestions,
  showQuickActions = true,
  children,
}) => {
  const config = EMPTY_STATE_CONFIGS[variant];
  const IconComponent = icon || config.icon;
  const displaySuggestions = suggestions || config.suggestions;

  return (
    <div className={cn('flex items-center justify-center min-h-[400px] p-6', className)}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg text-center"
      >
        <div className="space-y-6">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-carbon-100 flex items-center justify-center">
              <IconComponent className="h-8 w-8 text-carbon-400" />
            </div>
          </div>

          <div>
            <h3 className="text-h5 font-semibold text-carbon-900 mb-2">
              {title || config.title}
            </h3>
            <p className="text-body-base text-carbon-600 leading-relaxed max-w-md mx-auto">
              {description || config.description}
            </p>
          </div>

          {showQuickActions && displaySuggestions.length > 0 && (
            <div className="text-left">
              <h4 className="text-body-sm font-medium text-carbon-900 mb-3 text-center">
                Quick tips:
              </h4>
              <ul className="space-y-2">
                {displaySuggestions.map((suggestion, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <div className="w-1.5 h-1.5 bg-primary-600 rounded-full mt-2 flex-shrink-0" />
                    <span className="text-body-sm text-carbon-600">{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {children}

          {(primaryAction || secondaryAction) && (
            <div className="flex flex-col space-y-3">
              {primaryAction && (
                <Button
                  onClick={primaryAction.onClick}
                  className="w-full flex items-center justify-center space-x-2"
                >
                  {primaryAction.icon && <primaryAction.icon className="h-4 w-4" />}
                  <span>{primaryAction.label}</span>
                </Button>
              )}
              
              {secondaryAction && (
                <Button
                  variant="outline"
                  onClick={secondaryAction.onClick}
                  className="w-full flex items-center justify-center space-x-2"
                >
                  {secondaryAction.icon && <secondaryAction.icon className="h-4 w-4" />}
                  <span>{secondaryAction.label}</span>
                </Button>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export const DashboardEmpty: React.FC<Omit<EmptyStateProps, 'variant'>> = (props) => (
  <EmptyState variant="dashboard" {...props} />
);

export const CalculationsEmpty: React.FC<Omit<EmptyStateProps, 'variant'>> = (props) => (
  <EmptyState variant="calculations" {...props} />
);

export const SearchEmpty: React.FC<Omit<EmptyStateProps, 'variant'>> = (props) => (
  <EmptyState variant="search" {...props} />
);

export const DataEmpty: React.FC<Omit<EmptyStateProps, 'variant'>> = (props) => (
  <EmptyState variant="data" {...props} />
);

export const GoalsEmpty: React.FC<Omit<EmptyStateProps, 'variant'>> = (props) => (
  <EmptyState variant="goals" {...props} />
);

export const ReportsEmpty: React.FC<Omit<EmptyStateProps, 'variant'>> = (props) => (
  <EmptyState variant="reports" {...props} />
);

interface CardEmptyStateProps extends BaseEmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>;
  action?: {
    label: string;
    onClick: () => void;
  };
  compact?: boolean;
}

export const CardEmptyState: React.FC<CardEmptyStateProps> = ({
  className,
  title = 'No Data',
  description = 'Nothing to show here yet.',
  icon: IconComponent = Database,
  action,
  compact = false,
  children,
}) => {
  return (
    <Card className={cn('text-center', className)}>
      <CardContent className={cn('py-8', compact && 'py-6')}>
        <div className="space-y-4">
          <div className="flex justify-center">
            <div className={cn(
              'rounded-full bg-carbon-100 flex items-center justify-center',
              compact ? 'w-10 h-10' : 'w-12 h-12'
            )}>
              <IconComponent className={cn(
                'text-carbon-400',
                compact ? 'h-5 w-5' : 'h-6 w-6'
              )} />
            </div>
          </div>
          
          <div>
            <h4 className={cn(
              'font-medium text-carbon-900 mb-1',
              compact ? 'text-body-base' : 'text-h6'
            )}>
              {title}
            </h4>
            <p className={cn(
              'text-carbon-600',
              compact ? 'text-body-sm' : 'text-body-base'
            )}>
              {description}
            </p>
          </div>

          {children}

          {action && (
            <Button
              variant="outline"
              size={compact ? 'sm' : 'default'}
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

interface InlineEmptyStateProps extends BaseEmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const InlineEmptyState: React.FC<InlineEmptyStateProps> = ({
  className,
  title = 'No items',
  description = 'Start by adding your first item.',
  icon: IconComponent = Plus,
  action,
  children,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn('flex flex-col items-center justify-center py-8 text-center', className)}
    >
      <div className="space-y-3">
        <div className="flex justify-center">
          <div className="w-8 h-8 rounded-full bg-carbon-100 flex items-center justify-center">
            <IconComponent className="h-4 w-4 text-carbon-400" />
          </div>
        </div>
        
        <div>
          <h4 className="text-body-base font-medium text-carbon-900 mb-1">{title}</h4>
          <p className="text-body-sm text-carbon-600">{description}</p>
        </div>

        {children}

        {action && (
          <Button
            variant="ghost"
            size="sm"
            onClick={action.onClick}
            className="text-primary-600 hover:text-primary-700"
          >
            {action.label}
          </Button>
        )}
      </div>
    </motion.div>
  );
};

interface OnboardingEmptyStateProps extends BaseEmptyStateProps {
  steps: Array<{
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    description: string;
    action?: {
      label: string;
      onClick: () => void;
    };
  }>;
  currentStep?: number;
  onStartTour?: () => void;
}

export const OnboardingEmptyState: React.FC<OnboardingEmptyStateProps> = ({
  className,
  title = 'Get Started with EcoTrace',
  description = 'Follow these steps to start tracking your carbon footprint.',
  steps,
  currentStep = 0,
  onStartTour,
  children,
}) => {
  return (
    <div className={cn('max-w-4xl mx-auto p-6', className)}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl mx-auto mb-4 flex items-center justify-center">
          <Lightbulb className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-h4 font-bold text-carbon-900 mb-2">{title}</h2>
        <p className="text-body-base text-carbon-600 max-w-2xl mx-auto">{description}</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {steps.map((step, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className={cn(
              'h-full transition-all hover:shadow-md',
              index === currentStep && 'ring-2 ring-primary-200 bg-primary-50'
            )}>
              <CardHeader className="text-center pb-4">
                <div className="flex items-center justify-between mb-3">
                  <Badge variant={index === currentStep ? 'default' : 'secondary'}>
                    Step {index + 1}
                  </Badge>
                  {index < currentStep && (
                    <CheckCircle className="h-5 w-5 text-success-600" />
                  )}
                </div>
                <div className={cn(
                  'w-12 h-12 rounded-lg mx-auto mb-3 flex items-center justify-center',
                  index === currentStep ? 'bg-primary-100' : 'bg-carbon-100'
                )}>
                  <step.icon className={cn(
                    'h-6 w-6',
                    index === currentStep ? 'text-primary-600' : 'text-carbon-400'
                  )} />
                </div>
                <CardTitle className="text-h6">{step.title}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-body-sm text-carbon-600 mb-4">{step.description}</p>
                {step.action && (
                  <Button
                    variant={index === currentStep ? 'default' : 'outline'}
                    size="sm"
                    onClick={step.action.onClick}
                    className="w-full"
                  >
                    {step.action.label}
                  </Button>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {children}

      {onStartTour && (
        <div className="text-center">
          <Button
            onClick={onStartTour}
            size="lg"
            className="flex items-center space-x-2"
          >
            <Play className="h-4 w-4" />
            <span>Take the Guided Tour</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

interface FilterEmptyStateProps extends BaseEmptyStateProps {
  filterCount: number;
  onClearFilters: () => void;
  onResetSearch?: () => void;
}

export const FilterEmptyState: React.FC<FilterEmptyStateProps> = ({
  className,
  title = 'No Results Found',
  description = 'No data matches your current filters.',
  filterCount,
  onClearFilters,
  onResetSearch,
  children,
}) => {
  return (
    <div className={cn('flex items-center justify-center min-h-[300px] p-6', className)}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md text-center"
      >
        <div className="space-y-6">
          <div className="flex justify-center">
            <div className="w-12 h-12 rounded-full bg-warning-100 flex items-center justify-center">
              <Filter className="h-6 w-6 text-warning-600" />
            </div>
          </div>
          
          <div>
            <h3 className="text-h6 font-semibold text-carbon-900 mb-2">{title}</h3>
            <p className="text-body-base text-carbon-600">{description}</p>
            {filterCount > 0 && (
              <p className="text-body-sm text-carbon-500 mt-2">
                {filterCount} active filter{filterCount !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          {children}

          <div className="flex flex-col space-y-3">
            {filterCount > 0 && (
              <Button
                onClick={onClearFilters}
                className="w-full flex items-center justify-center space-x-2"
              >
                <Filter className="h-4 w-4" />
                <span>Clear All Filters</span>
              </Button>
            )}
            
            {onResetSearch && (
              <Button
                variant="outline"
                onClick={onResetSearch}
                className="w-full flex items-center justify-center space-x-2"
              >
                <Search className="h-4 w-4" />
                <span>Reset Search</span>
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};