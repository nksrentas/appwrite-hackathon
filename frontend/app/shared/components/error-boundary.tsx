import * as React from 'react';
import { Component, ErrorInfo, ReactNode } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  RefreshCw,
  Bug,
  ExternalLink,
  Copy,
  Check,
  Home,
  RotateCcw,
  MessageCircle,
  Shield,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/components/ui/card';
import { Button } from '@shared/components/ui/button';
import { Badge } from '@shared/components/ui/badge';
import { Separator } from '@shared/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@shared/components/ui/collapsible';
import { toast } from '@shared/hooks/use-toast';
import { cn } from '@shared/utils/cn';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showErrorDetails?: boolean;
  enableReporting?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
  retryCount: number;
  isReporting: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  private retryTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      retryCount: 0,
      isReporting: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return {
      hasError: true,
      error,
      errorId,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    console.error('Error Boundary caught an error:', error, errorInfo);
    
    this.props.onError?.(error, errorInfo);

    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
      this.reportError(error, errorInfo);
    }
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  reportError = async (error: Error, errorInfo: ErrorInfo) => {
    try {
      const errorReport = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        errorId: this.state.errorId,
      };

      console.log('Error report:', errorReport);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success({
        title: 'Error Reported',
        description: 'Thank you for helping us improve EcoTrace.',
      });
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
      toast.error({
        title: 'Reporting Failed',
        description: 'Could not send error report. Please try again.',
      });
    }
  };

  handleRetry = () => {
    const { retryCount } = this.state;
    
    if (retryCount >= 3) {
      toast.warning({
        title: 'Too Many Retries',
        description: 'Please refresh the page or contact support.',
      });
      return;
    }

    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1,
    }));

    toast.info({
      title: 'Retrying...',
      description: 'Attempting to recover from the error.',
    });
  };

  handleRefresh = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleCopyError = async () => {
    const { error, errorInfo, errorId } = this.state;
    
    const errorText = `
Error ID: ${errorId}
Message: ${error?.message || 'Unknown error'}
Stack: ${error?.stack || 'No stack trace'}
Component Stack: ${errorInfo?.componentStack || 'No component stack'}
URL: ${window.location.href}
User Agent: ${navigator.userAgent}
Timestamp: ${new Date().toISOString()}
    `.trim();

    try {
      await navigator.clipboard.writeText(errorText);
      toast.success({
        title: 'Error Details Copied',
        description: 'You can now paste this in your bug report.',
      });
    } catch (err) {
      console.error('Failed to copy error details:', err);
      toast.error({
        title: 'Copy Failed',
        description: 'Could not copy error details to clipboard.',
      });
    }
  };

  handleReportIssue = async () => {
    this.setState({ isReporting: true });
    
    try {
      await this.reportError(this.state.error!, this.state.errorInfo!);
    } finally {
      this.setState({ isReporting: false });
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return <ErrorFallback {...this.state} {...this.props} onRetry={this.handleRetry} />;
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps extends State {
  showErrorDetails?: boolean;
  enableReporting?: boolean;
  onRetry: () => void;
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  errorInfo,
  errorId,
  retryCount,
  isReporting,
  showErrorDetails = false,
  enableReporting = true,
  onRetry,
}) => {
  const [showDetails, setShowDetails] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const handleCopyError = async () => {
    const errorText = `
Error ID: ${errorId}
Message: ${error?.message || 'Unknown error'}
Stack: ${error?.stack || 'No stack trace'}
Component Stack: ${errorInfo?.componentStack || 'No component stack'}
URL: ${window.location.href}
User Agent: ${navigator.userAgent}
Timestamp: ${new Date().toISOString()}
    `.trim();

    try {
      await navigator.clipboard.writeText(errorText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success({
        title: 'Error Details Copied',
        description: 'You can now paste this in your bug report.',
      });
    } catch (err) {
      toast.error({
        title: 'Copy Failed',
        description: 'Could not copy error details to clipboard.',
      });
    }
  };

  const getErrorSeverity = () => {
    const message = error?.message?.toLowerCase() || '';
    
    if (message.includes('network') || message.includes('fetch')) {
      return { level: 'warning', type: 'Network Error' };
    }
    if (message.includes('chunk') || message.includes('loading')) {
      return { level: 'info', type: 'Loading Error' };
    }
    return { level: 'error', type: 'Application Error' };
  };

  const { level, type } = getErrorSeverity();

  return (
    <div className="min-h-[400px] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl"
      >
        <Card className="shadow-lg border-danger-200">
          <CardHeader className="text-center pb-6">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className={cn(
                'w-12 h-12 rounded-lg flex items-center justify-center',
                level === 'error' ? 'bg-danger-100' : 
                level === 'warning' ? 'bg-warning-100' : 'bg-primary-100'
              )}>
                <AlertTriangle className={cn(
                  'h-6 w-6',
                  level === 'error' ? 'text-danger-600' : 
                  level === 'warning' ? 'text-warning-600' : 'text-primary-600'
                )} />
              </div>
              <Badge variant={level === 'error' ? 'destructive' : 'secondary'}>
                {type}
              </Badge>
            </div>
            
            <CardTitle className="text-h4 text-carbon-900 mb-2">
              Oops! Something went wrong
            </CardTitle>
            
            <p className="text-body-base text-carbon-600">
              We encountered an unexpected error. Don't worry, we're here to help you get back on track.
            </p>
            
            {errorId && (
              <div className="mt-4 p-3 bg-carbon-50 rounded-lg">
                <p className="text-body-sm text-carbon-600">
                  Error ID: <code className="text-carbon-900 font-mono">{errorId}</code>
                </p>
              </div>
            )}
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Primary Actions */}
            <div className="flex flex-wrap gap-3 justify-center">
              <Button
                onClick={onRetry}
                disabled={retryCount >= 3}
                className="flex items-center space-x-2"
              >
                <RefreshCw className="h-4 w-4" />
                <span>
                  {retryCount >= 3 ? 'Max Retries Reached' : `Try Again ${retryCount > 0 ? `(${retryCount}/3)` : ''}`}
                </span>
              </Button>
              
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
                className="flex items-center space-x-2"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Refresh Page</span>
              </Button>
              
              <Button
                variant="outline"
                onClick={() => window.location.href = '/'}
                className="flex items-center space-x-2"
              >
                <Home className="h-4 w-4" />
                <span>Go Home</span>
              </Button>
            </div>

            <Separator />

            {/* Secondary Actions */}
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-h6 font-medium text-carbon-900 mb-3">
                  Need more help?
                </h3>
                <div className="flex flex-wrap gap-3 justify-center">
                  {enableReporting && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyError}
                      disabled={isReporting}
                      className="flex items-center space-x-2"
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      <span>{copied ? 'Copied!' : 'Copy Error Details'}</span>
                    </Button>
                  )}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="flex items-center space-x-2"
                  >
                    <a href="mailto:support@ecotrace.com" target="_blank" rel="noopener noreferrer">
                      <MessageCircle className="h-4 w-4" />
                      <span>Contact Support</span>
                    </a>
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="flex items-center space-x-2"
                  >
                    <a href="/help" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                      <span>Help Center</span>
                    </a>
                  </Button>
                </div>
              </div>

              {/* Error Details */}
              {(showErrorDetails || process.env.NODE_ENV === 'development') && error && (
                <Collapsible open={showDetails} onOpenChange={setShowDetails}>
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full flex items-center space-x-2"
                    >
                      <Bug className="h-4 w-4" />
                      <span>Show Technical Details</span>
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-4 p-4 bg-carbon-50 rounded-lg space-y-3">
                      <div>
                        <h4 className="text-body-sm font-medium text-carbon-900 mb-1">
                          Error Message
                        </h4>
                        <code className="block text-body-sm font-mono text-danger-700 bg-white p-2 rounded border">
                          {error.message}
                        </code>
                      </div>
                      
                      {error.stack && (
                        <div>
                          <h4 className="text-body-sm font-medium text-carbon-900 mb-1">
                            Stack Trace
                          </h4>
                          <pre className="text-xs font-mono text-carbon-700 bg-white p-2 rounded border overflow-x-auto max-h-40 overflow-y-auto">
                            {error.stack}
                          </pre>
                        </div>
                      )}
                      
                      {errorInfo?.componentStack && (
                        <div>
                          <h4 className="text-body-sm font-medium text-carbon-900 mb-1">
                            Component Stack
                          </h4>
                          <pre className="text-xs font-mono text-carbon-700 bg-white p-2 rounded border overflow-x-auto max-h-40 overflow-y-auto">
                            {errorInfo.componentStack}
                          </pre>
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Privacy Notice */}
              <div className="text-center p-3 bg-primary-50 rounded-lg">
                <div className="flex items-center justify-center space-x-2 mb-1">
                  <Shield className="h-4 w-4 text-primary-600" />
                  <span className="text-body-sm font-medium text-primary-900">
                    Privacy Protected
                  </span>
                </div>
                <p className="text-body-sm text-primary-700">
                  Error reports contain no personal data and help us improve EcoTrace.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export function useErrorHandler() {
  const handleError = React.useCallback((error: Error, context?: string) => {
    console.error(`Error in ${context || 'component'}:`, error);
    
    toast.error({
      title: 'Something went wrong',
      description: error.message || 'An unexpected error occurred.',
    });
    
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
      console.log('Async error reported:', { error, context });
    }
  }, []);

  return { handleError };
}

export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Partial<Props>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}