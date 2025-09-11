import * as React from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  Wifi,
  WifiOff,
  Server,
  RefreshCw,
  ArrowLeft,
  Home,
  Search,
  Bug,
  Shield,
  Clock,
  Database,
  Zap,
  ExternalLink,
  RotateCcw,
  HelpCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/components/ui/card';
import { Button } from '@shared/components/ui/button';
import { Badge } from '@shared/components/ui/badge';
import { cn } from '@shared/utils/cn';

interface BaseErrorStateProps {
  className?: string;
  title?: string;
  description?: string;
  children?: React.ReactNode;
}

interface ErrorStateProps extends BaseErrorStateProps {
  variant?: 'network' | 'server' | 'notFound' | 'forbidden' | 'timeout' | 'generic';
  onRetry?: () => void;
  onGoBack?: () => void;
  onGoHome?: () => void;
  showRetry?: boolean;
  showGoBack?: boolean;
  showGoHome?: boolean;
  retryLabel?: string;
  isRetrying?: boolean;
}

const ERROR_CONFIGS = {
  network: {
    icon: WifiOff,
    color: 'warning',
    title: 'Connection Problem',
    description: 'Unable to connect to our servers. Please check your internet connection.',
    suggestions: [
      'Check your internet connection',
      'Try refreshing the page',
      'Disable VPN or proxy if using one',
    ],
  },
  server: {
    icon: Server,
    color: 'danger',
    title: 'Server Error',
    description: 'Our servers are experiencing issues. Please try again in a few moments.',
    suggestions: [
      'Try again in a few minutes',
      'Check our status page for updates',
      'Contact support if the problem persists',
    ],
  },
  notFound: {
    icon: Search,
    color: 'neutral',
    title: 'Page Not Found',
    description: 'The page you\'re looking for doesn\'t exist or has been moved.',
    suggestions: [
      'Check the URL for typos',
      'Use the navigation menu',
      'Search for what you need',
    ],
  },
  forbidden: {
    icon: Shield,
    color: 'danger',
    title: 'Access Denied',
    description: 'You don\'t have permission to access this resource.',
    suggestions: [
      'Sign in with the correct account',
      'Request access from your administrator',
      'Contact support for help',
    ],
  },
  timeout: {
    icon: Clock,
    color: 'warning',
    title: 'Request Timeout',
    description: 'The request took too long to complete. Please try again.',
    suggestions: [
      'Try again with a smaller request',
      'Check your internet connection',
      'Wait a moment and retry',
    ],
  },
  generic: {
    icon: AlertTriangle,
    color: 'danger',
    title: 'Something Went Wrong',
    description: 'An unexpected error occurred. Please try again.',
    suggestions: [
      'Refresh the page',
      'Try again later',
      'Contact support if needed',
    ],
  },
} as const;

export const ErrorState: React.FC<ErrorStateProps> = ({
  variant = 'generic',
  className,
  title,
  description,
  onRetry,
  onGoBack,
  onGoHome,
  showRetry = true,
  showGoBack = false,
  showGoHome = true,
  retryLabel = 'Try Again',
  isRetrying = false,
  children,
}) => {
  const config = ERROR_CONFIGS[variant];
  const IconComponent = config.icon;

  return (
    <div className={cn('flex items-center justify-center min-h-[400px] p-6', className)}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md text-center"
      >
        <Card className="shadow-lg">
          <CardHeader className="pb-6">
            <div className="flex justify-center mb-4">
              <div className={cn(
                'w-16 h-16 rounded-full flex items-center justify-center',
                config.color === 'danger' ? 'bg-danger-100' :
                config.color === 'warning' ? 'bg-warning-100' :
                'bg-carbon-100'
              )}>
                <IconComponent className={cn(
                  'h-8 w-8',
                  config.color === 'danger' ? 'text-danger-600' :
                  config.color === 'warning' ? 'text-warning-600' :
                  'text-carbon-600'
                )} />
              </div>
            </div>
            
            <CardTitle className="text-h5 text-carbon-900 mb-2">
              {title || config.title}
            </CardTitle>
            
            <p className="text-body-base text-carbon-600 leading-relaxed">
              {description || config.description}
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="text-left">
              <h4 className="text-body-sm font-medium text-carbon-900 mb-3">
                Try these steps:
              </h4>
              <ul className="space-y-2">
                {config.suggestions.map((suggestion, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <div className="w-1.5 h-1.5 bg-primary-600 rounded-full mt-2 flex-shrink-0" />
                    <span className="text-body-sm text-carbon-600">{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>

            {children}

            <div className="flex flex-col space-y-3">
              {showRetry && onRetry && (
                <Button
                  onClick={onRetry}
                  disabled={isRetrying}
                  className="w-full flex items-center justify-center space-x-2"
                >
                  {isRetrying ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Retrying...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4" />
                      <span>{retryLabel}</span>
                    </>
                  )}
                </Button>
              )}
              
              <div className="flex space-x-3">
                {showGoBack && onGoBack && (
                  <Button
                    variant="outline"
                    onClick={onGoBack}
                    className="flex-1 flex items-center justify-center space-x-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Go Back</span>
                  </Button>
                )}
                
                {showGoHome && onGoHome && (
                  <Button
                    variant="outline"
                    onClick={onGoHome}
                    className="flex-1 flex items-center justify-center space-x-2"
                  >
                    <Home className="h-4 w-4" />
                    <span>Home</span>
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export const NetworkError: React.FC<Omit<ErrorStateProps, 'variant'>> = (props) => (
  <ErrorState variant="network" {...props} />
);

export const ServerError: React.FC<Omit<ErrorStateProps, 'variant'>> = (props) => (
  <ErrorState variant="server" {...props} />
);

export const NotFoundError: React.FC<Omit<ErrorStateProps, 'variant'>> = (props) => (
  <ErrorState variant="notFound" showRetry={false} {...props} />
);

export const ForbiddenError: React.FC<Omit<ErrorStateProps, 'variant'>> = (props) => (
  <ErrorState variant="forbidden" showRetry={false} {...props} />
);

export const TimeoutError: React.FC<Omit<ErrorStateProps, 'variant'>> = (props) => (
  <ErrorState variant="timeout" {...props} />
);

interface DataErrorStateProps extends BaseErrorStateProps {
  onRetry?: () => void;
  onGoBack?: () => void;
  isRetrying?: boolean;
  errorCode?: string;
  timestamp?: Date;
}

export const DataLoadError: React.FC<DataErrorStateProps> = ({
  className,
  title = 'Failed to Load Data',
  description = 'We couldn\'t load your carbon footprint data. This might be a temporary issue.',
  onRetry,
  onGoBack,
  isRetrying = false,
  errorCode,
  timestamp,
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
              <Database className="h-6 w-6 text-warning-600" />
            </div>
          </div>
          
          <div>
            <h3 className="text-h6 font-semibold text-carbon-900 mb-2">{title}</h3>
            <p className="text-body-sm text-carbon-600">{description}</p>
          </div>

          {(errorCode || timestamp) && (
            <div className="p-3 bg-carbon-50 rounded-lg text-left">
              {errorCode && (
                <p className="text-body-sm text-carbon-600">
                  Error Code: <code className="text-carbon-900 font-mono">{errorCode}</code>
                </p>
              )}
              {timestamp && (
                <p className="text-body-sm text-carbon-600">
                  Time: {timestamp.toLocaleString()}
                </p>
              )}
            </div>
          )}

          {children}

          <div className="flex space-x-3">
            {onRetry && (
              <Button
                onClick={onRetry}
                disabled={isRetrying}
                className="flex-1 flex items-center justify-center space-x-2"
              >
                {isRetrying ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Loading...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    <span>Retry</span>
                  </>
                )}
              </Button>
            )}
            
            {onGoBack && (
              <Button
                variant="outline"
                onClick={onGoBack}
                className="flex-1 flex items-center justify-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back</span>
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export const CalculationError: React.FC<DataErrorStateProps> = ({
  className,
  title = 'Calculation Failed',
  description = 'We couldn\'t complete your carbon footprint calculation. Please check your inputs and try again.',
  onRetry,
  isRetrying = false,
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
            <div className="w-12 h-12 rounded-full bg-danger-100 flex items-center justify-center">
              <Zap className="h-6 w-6 text-danger-600" />
            </div>
          </div>
          
          <div>
            <h3 className="text-h6 font-semibold text-carbon-900 mb-2">{title}</h3>
            <p className="text-body-sm text-carbon-600">{description}</p>
          </div>

          <div className="text-left">
            <h4 className="text-body-sm font-medium text-carbon-900 mb-3">
              Common issues:
            </h4>
            <ul className="space-y-2">
              <li className="flex items-start space-x-2">
                <div className="w-1.5 h-1.5 bg-danger-600 rounded-full mt-2 flex-shrink-0" />
                <span className="text-body-sm text-carbon-600">Invalid or missing input values</span>
              </li>
              <li className="flex items-start space-x-2">
                <div className="w-1.5 h-1.5 bg-danger-600 rounded-full mt-2 flex-shrink-0" />
                <span className="text-body-sm text-carbon-600">Network connectivity issues</span>
              </li>
              <li className="flex items-start space-x-2">
                <div className="w-1.5 h-1.5 bg-danger-600 rounded-full mt-2 flex-shrink-0" />
                <span className="text-body-sm text-carbon-600">Temporary server problems</span>
              </li>
            </ul>
          </div>

          {children}

          {onRetry && (
            <Button
              onClick={onRetry}
              disabled={isRetrying}
              className="w-full flex items-center justify-center space-x-2"
            >
              {isRetrying ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Calculating...</span>
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4" />
                  <span>Try Calculation Again</span>
                </>
              )}
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

interface InlineErrorProps {
  message: string;
  onRetry?: () => void;
  isRetrying?: boolean;
  className?: string;
}

export const InlineError: React.FC<InlineErrorProps> = ({
  message,
  onRetry,
  isRetrying = false,
  className,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn('flex items-center justify-between p-3 bg-danger-50 border border-danger-200 rounded-lg', className)}
    >
      <div className="flex items-center space-x-2">
        <AlertTriangle className="h-4 w-4 text-danger-600 flex-shrink-0" />
        <span className="text-body-sm text-danger-700">{message}</span>
      </div>
      
      {onRetry && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onRetry}
          disabled={isRetrying}
          className="text-danger-600 hover:text-danger-700 hover:bg-danger-100"
        >
          {isRetrying ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
        </Button>
      )}
    </motion.div>
  );
};

interface FieldErrorProps {
  error: string;
  suggestions?: string[];
  onClear?: () => void;
  className?: string;
}

export const FieldError: React.FC<FieldErrorProps> = ({
  error,
  suggestions = [],
  onClear,
  className,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className={cn('space-y-2', className)}
    >
      <div className="flex items-start space-x-2">
        <AlertTriangle className="h-4 w-4 text-danger-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-body-sm text-danger-700">{error}</p>
          
          {suggestions.length > 0 && (
            <div className="mt-2">
              <p className="text-body-sm font-medium text-danger-800 mb-1">Suggestions:</p>
              <ul className="space-y-1">
                {suggestions.map((suggestion, index) => (
                  <li key={index} className="text-body-sm text-danger-600">
                    • {suggestion}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        
        {onClear && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="h-6 w-6 p-0 text-danger-600 hover:text-danger-700 hover:bg-danger-100"
          >
            <RotateCcw className="h-3 w-3" />
          </Button>
        )}
      </div>
    </motion.div>
  );
};