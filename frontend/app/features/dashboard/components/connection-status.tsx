import { motion } from 'framer-motion';
import { Wifi, WifiOff, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { cn } from '~/shared/utils/cn';

interface ConnectionStatusProps {
  isConnected: boolean;
  isLoading?: boolean;
  lastUpdated?: string;
  errorMessage?: string;
  subscriptionCount?: number;
  className?: string;
  onReconnect?: () => void;
}

export const ConnectionStatus = ({
  isConnected,
  isLoading = false,
  lastUpdated,
  errorMessage,
  subscriptionCount = 0,
  className,
  onReconnect,
}: ConnectionStatusProps) => {
  const getStatusIcon = () => {
    if (isLoading) {
      return <Loader2 className="h-4 w-4 animate-spin" />;
    } else if (errorMessage) {
      return <AlertCircle className="h-4 w-4" />;
    } else if (isConnected) {
      return <CheckCircle className="h-4 w-4" />;
    } else {
      return <WifiOff className="h-4 w-4" />;
    }
  };

  const getStatusColor = () => {
    if (isLoading) {
      return 'text-scientific-500 bg-scientific-50 border-scientific-200';
    } else if (errorMessage) {
      return 'text-danger bg-danger-50 border-danger-200';
    } else if (isConnected) {
      return 'text-primary-600 bg-primary-50 border-primary-200';
    } else {
      return 'text-carbon-500 bg-carbon-100 border-carbon-300';
    }
  };

  const getStatusText = () => {
    if (isLoading) {
      return 'Connecting...';
    } else if (errorMessage) {
      return 'Connection Error';
    } else if (isConnected) {
      return 'Real-time Connected';
    } else {
      return 'Disconnected';
    }
  };

  return (
    <motion.div
      className={cn(
        'inline-flex items-center space-x-3 px-4 py-2 rounded-lg border text-body-sm',
        getStatusColor(),
        className
      )}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      layout
    >
      {/* Status icon with pulse animation */}
      <motion.div
        animate={
          isConnected && !isLoading
            ? {
                scale: [1, 1.1, 1],
              }
            : {}
        }
        transition={{
          repeat: isConnected && !isLoading ? Infinity : 0,
          duration: 2,
        }}
      >
        {getStatusIcon()}
      </motion.div>

      {/* Status text and details */}
      <div className="flex flex-col space-y-1">
        <div className="flex items-center space-x-2">
          <span className="font-medium">{getStatusText()}</span>

          {/* Subscription count */}
          {isConnected && subscriptionCount > 0 && (
            <motion.span
              className="text-caption opacity-75"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 0.75, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              ({subscriptionCount} channels)
            </motion.span>
          )}
        </div>

        {/* Additional status information */}
        <div className="text-caption opacity-75">
          {errorMessage ? (
            <span>{errorMessage}</span>
          ) : lastUpdated ? (
            <span>Last update: {new Date(lastUpdated).toLocaleTimeString()}</span>
          ) : isConnected ? (
            <span>Live updates active</span>
          ) : (
            <span>Real-time updates unavailable</span>
          )}
        </div>
      </div>

      {/* Reconnect button */}
      {(!isConnected || errorMessage) && onReconnect && (
        <motion.button
          className="ml-2 px-3 py-1 text-caption font-medium rounded-md bg-white/20 hover:bg-white/30 transition-colors"
          onClick={onReconnect}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          disabled={isLoading}
        >
          Retry
        </motion.button>
      )}

      {/* Connection quality indicator */}
      {isConnected && (
        <motion.div
          className="flex space-x-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {Array.from({ length: 3 }).map((_, i) => (
            <motion.div
              key={i}
              className="w-1 bg-current rounded-full"
              style={{ height: `${8 + i * 2}px` }}
              animate={{
                opacity: [0.3, 1, 0.3],
              }}
              transition={{
                repeat: Infinity,
                duration: 1.5,
                delay: i * 0.2,
              }}
            />
          ))}
        </motion.div>
      )}
    </motion.div>
  );
};
