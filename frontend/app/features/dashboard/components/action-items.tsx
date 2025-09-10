import { motion } from 'framer-motion';
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Lightbulb, 
  Target,
  Zap,
  Settings,
  GitBranch,
  ExternalLink,
  ArrowRight,
  TrendingDown
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/components/ui/card';
import { Badge } from '@shared/components/ui/badge';
import { Button } from '@shared/components/ui/button';
import { Progress } from '@shared/components/ui/progress';
import { cn } from '@shared/utils/cn';

type ActionPriority = 'high' | 'medium' | 'low';
type ActionStatus = 'pending' | 'in_progress' | 'completed';
type ActionCategory = 'optimization' | 'workflow' | 'infrastructure' | 'awareness';

interface ActionItem {
  id: string;
  title: string;
  description: string;
  category: ActionCategory;
  priority: ActionPriority;
  status: ActionStatus;
  estimatedImpact: number; // Estimated carbon reduction in grams
  timeToImplement: string;
  difficulty: 'easy' | 'medium' | 'hard';
  steps?: string[];
  resources?: Array<{
    title: string;
    url: string;
    type: 'documentation' | 'tool' | 'guide';
  }>;
}

interface ActionItemsProps {
  actions?: ActionItem[];
  onActionComplete?: (actionId: string) => void;
  onActionStart?: (actionId: string) => void;
  className?: string;
}

const defaultActions: ActionItem[] = [
  {
    id: '1',
    title: 'Optimize CI/CD Pipeline',
    description: 'Reduce build times by caching dependencies and using smaller Docker images',
    category: 'optimization',
    priority: 'high',
    status: 'pending',
    estimatedImpact: 45,
    timeToImplement: '2-4 hours',
    difficulty: 'medium',
    steps: [
      'Audit current build process',
      'Implement Docker layer caching',
      'Use multi-stage builds',
      'Optimize dependency installation'
    ],
    resources: [
      { title: 'Docker Best Practices', url: 'https://docs.docker.com/develop/best-practices/', type: 'documentation' },
      { title: 'CI/CD Optimization Guide', url: '#', type: 'guide' }
    ]
  },
  {
    id: '2',
    title: 'Set Up Branch Protection',
    description: 'Prevent unnecessary CI runs by requiring reviews and status checks',
    category: 'workflow',
    priority: 'medium',
    status: 'in_progress',
    estimatedImpact: 23,
    timeToImplement: '30 minutes',
    difficulty: 'easy',
    steps: [
      'Navigate to repository settings',
      'Add branch protection rules',
      'Require pull request reviews',
      'Enable status checks'
    ],
    resources: [
      { title: 'Branch Protection Setup', url: 'https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/defining-the-mergeability-of-pull-requests/managing-a-branch-protection-rule', type: 'documentation' }
    ]
  },
  {
    id: '3',
    title: 'Use Carbon-Aware Scheduling',
    description: 'Schedule heavy workloads during low-carbon intensity periods',
    category: 'infrastructure',
    priority: 'low',
    status: 'pending',
    estimatedImpact: 67,
    timeToImplement: '4-6 hours',
    difficulty: 'hard',
    steps: [
      'Research carbon intensity APIs',
      'Implement scheduling logic',
      'Update CI/CD workflows',
      'Monitor and adjust'
    ],
    resources: [
      { title: 'Carbon Aware SDK', url: 'https://github.com/Green-Software-Foundation/carbon-aware-sdk', type: 'tool' },
      { title: 'WattTime API', url: 'https://www.watttime.org/', type: 'tool' }
    ]
  },
  {
    id: '4',
    title: 'Enable Team Carbon Awareness',
    description: 'Share carbon metrics with your team to increase awareness',
    category: 'awareness',
    priority: 'medium',
    status: 'completed',
    estimatedImpact: 34,
    timeToImplement: '1 hour',
    difficulty: 'easy',
    steps: [
      'Set up team dashboard',
      'Configure notifications',
      'Create weekly reports',
      'Schedule team discussions'
    ]
  }
];

export const ActionItems = ({ 
  actions = defaultActions, 
  onActionComplete,
  onActionStart,
  className 
}: ActionItemsProps) => {
  const getPriorityColor = (priority: ActionPriority) => {
    switch (priority) {
      case 'high': return 'bg-danger-100 text-danger-800 border-danger-200';
      case 'medium': return 'bg-warning-100 text-warning-800 border-warning-200';
      case 'low': return 'bg-primary-100 text-primary-800 border-primary-200';
    }
  };

  const getCategoryIcon = (category: ActionCategory) => {
    switch (category) {
      case 'optimization': return Zap;
      case 'workflow': return GitBranch;
      case 'infrastructure': return Settings;
      case 'awareness': return Lightbulb;
    }
  };

  const getStatusIcon = (status: ActionStatus) => {
    switch (status) {
      case 'completed': return CheckCircle2;
      case 'in_progress': return Clock;
      case 'pending': return Target;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-success-600';
      case 'medium': return 'text-warning-600';
      case 'hard': return 'text-danger-600';
      default: return 'text-carbon-600';
    }
  };

  const totalPotentialReduction = actions.reduce((sum, action) => 
    action.status !== 'completed' ? sum + action.estimatedImpact : sum, 0
  );

  const completedActions = actions.filter(action => action.status === 'completed').length;
  const completionPercentage = (completedActions / actions.length) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn('space-y-6', className)}
    >
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center space-x-2">
                <Target className="h-5 w-5 text-primary-600" />
                <span>Carbon Reduction Actions</span>
              </CardTitle>
              <p className="text-body-sm text-carbon-600">
                Potential reduction: <span className="font-semibold text-primary-600">
                  {totalPotentialReduction}g CO₂e
                </span>
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-carbon-900">
                {completedActions}/{actions.length}
              </div>
              <p className="text-body-sm text-carbon-500">completed</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-body-sm">
              <span className="text-carbon-600">Overall Progress</span>
              <span className="font-medium text-carbon-900">{Math.round(completionPercentage)}%</span>
            </div>
            <Progress value={completionPercentage} className="h-2" />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {actions.map((action, index) => {
          const CategoryIcon = getCategoryIcon(action.category);
          const StatusIcon = getStatusIcon(action.status);
          
          return (
            <motion.div
              key={action.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className={cn(
                'transition-all duration-200 hover:shadow-md',
                action.status === 'completed' && 'bg-success-50 border-success-200'
              )}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start space-x-3">
                        <div className="flex items-center space-x-2 mt-1">
                          <CategoryIcon className="h-4 w-4 text-primary-600" />
                          <StatusIcon className={cn(
                            'h-4 w-4',
                            action.status === 'completed' ? 'text-success-600' :
                            action.status === 'in_progress' ? 'text-warning-600' : 'text-carbon-400'
                          )} />
                        </div>
                        
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center space-x-2 flex-wrap">
                            <h3 className="text-body-base font-semibold text-carbon-900">
                              {action.title}
                            </h3>
                            <Badge className={getPriorityColor(action.priority)}>
                              {action.priority} priority
                            </Badge>
                            {action.status !== 'completed' && (
                              <Badge variant="outline" className="text-primary-600 border-primary-300">
                                <TrendingDown className="h-3 w-3 mr-1" />
                                -{action.estimatedImpact}g
                              </Badge>
                            )}
                          </div>
                          <p className="text-body-sm text-carbon-600">
                            {action.description}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-body-sm">
                        <div className="flex items-center space-x-2">
                          <Clock className="h-3 w-3 text-carbon-400" />
                          <span className="text-carbon-600">
                            <span className="font-medium">Time:</span> {action.timeToImplement}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <AlertTriangle className="h-3 w-3 text-carbon-400" />
                          <span className="text-carbon-600">
                            <span className="font-medium">Difficulty:</span> 
                            <span className={getDifficultyColor(action.difficulty)}>
                              {' '}{action.difficulty}
                            </span>
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Target className="h-3 w-3 text-carbon-400" />
                          <span className="text-carbon-600">
                            <span className="font-medium">Impact:</span> {action.estimatedImpact}g CO₂e
                          </span>
                        </div>
                      </div>

                      {action.steps && action.status !== 'completed' && (
                        <div className="bg-carbon-50 rounded-lg p-3 space-y-2">
                          <h4 className="text-body-sm font-medium text-carbon-900">Implementation Steps:</h4>
                          <ol className="space-y-1">
                            {action.steps.map((step, stepIndex) => (
                              <li key={stepIndex} className="flex items-start space-x-2 text-caption text-carbon-600">
                                <span className="text-primary-600 font-medium">{stepIndex + 1}.</span>
                                <span>{step}</span>
                              </li>
                            ))}
                          </ol>
                        </div>
                      )}

                      {action.resources && action.resources.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {action.resources.map((resource, resourceIndex) => (
                            <Button
                              key={resourceIndex}
                              variant="outline"
                              size="sm"
                              asChild
                              className="h-7 px-2 text-caption"
                            >
                              <a
                                href={resource.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center space-x-1"
                              >
                                <span>{resource.title}</span>
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col space-y-2 ml-4">
                      {action.status === 'pending' && (
                        <Button
                          size="sm"
                          onClick={() => onActionStart?.(action.id)}
                          className="flex items-center space-x-1"
                        >
                          <span>Start</span>
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                      )}
                      {action.status === 'in_progress' && (
                        <Button
                          size="sm"
                          onClick={() => onActionComplete?.(action.id)}
                          className="flex items-center space-x-1"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Complete</span>
                        </Button>
                      )}
                      {action.status === 'completed' && (
                        <Badge className="bg-success-100 text-success-800 border-success-200">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Completed
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {actions.some(action => action.difficulty === 'easy' && action.status === 'pending') && (
        <Card className="bg-primary-50 border-primary-200">
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <Lightbulb className="h-5 w-5 text-primary-600 mt-0.5" />
              <div>
                <h4 className="text-body-base font-medium text-primary-900 mb-1">
                  Quick Wins Available
                </h4>
                <p className="text-body-sm text-primary-700">
                  You have {actions.filter(a => a.difficulty === 'easy' && a.status === 'pending').length} easy 
                  actions that can be completed quickly. Starting with these can provide immediate carbon reductions.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
};