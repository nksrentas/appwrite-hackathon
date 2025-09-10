import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertTriangle, Info, AlertCircle, Bell, Volume2, VolumeX } from 'lucide-react';
import { useEffect, useState, createContext, useContext, useCallback } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { cn } from '../utils/cn';

type NotificationType = 'success' | 'warning' | 'error' | 'info';
type NotificationPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number; // in ms, 0 for persistent
  action?: {
    label: string;
    onClick: () => void;
  };
  timestamp: Date;
}

interface NotificationContextValue {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => string;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  isSoundEnabled: boolean;
  toggleSound: () => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

interface NotificationProviderProps {
  children: React.ReactNode;
  position?: NotificationPosition;
  maxNotifications?: number;
}

export const NotificationProvider = ({ 
  children, 
  position = 'top-right',
  maxNotifications = 5 
}: NotificationProviderProps) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newNotification: Notification = {
      ...notification,
      id,
      timestamp: new Date(),
      duration: notification.duration ?? 5000,
    };

    setNotifications(prev => {
      const updated = [newNotification, ...prev];
      if (updated.length > maxNotifications) {
        return updated.slice(0, maxNotifications);
      }
      return updated;
    });

    if (isSoundEnabled && notification.type !== 'info') {
      playNotificationSound(notification.type);
    }

    if (newNotification.duration && newNotification.duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, newNotification.duration);
    }

    return id;
  }, [isSoundEnabled, maxNotifications]);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const toggleSound = useCallback(() => {
    setIsSoundEnabled(prev => !prev);
  }, []);

  const playNotificationSound = (type: NotificationType) => {
    if (typeof window !== 'undefined' && 'AudioContext' in window) {
      try {
        const audioContext = new AudioContext();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        const frequencies = {
          success: 523.25,
          warning: 440.00,
          error: 349.23,
          info: 523.25
        };
        
        oscillator.frequency.value = frequencies[type];
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
      } catch (error) {
        console.warn('Failed to play notification sound:', error);
      }
    }
  };

  const value: NotificationContextValue = {
    notifications,
    addNotification,
    removeNotification,
    clearAll,
    isSoundEnabled,
    toggleSound,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <NotificationContainer position={position} />
    </NotificationContext.Provider>
  );
};

interface NotificationContainerProps {
  position: NotificationPosition;
}

const NotificationContainer = ({ position }: NotificationContainerProps) => {
  const { notifications, removeNotification, clearAll, isSoundEnabled, toggleSound } = useNotifications();

  const getPositionClasses = (position: NotificationPosition) => {
    switch (position) {
      case 'top-right':
        return 'top-4 right-4';
      case 'top-left':
        return 'top-4 left-4';
      case 'bottom-right':
        return 'bottom-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      case 'top-center':
        return 'top-4 left-1/2 transform -translate-x-1/2';
      default:
        return 'top-4 right-4';
    }
  };

  if (notifications.length === 0) return null;

  return (
    <div className={cn('fixed z-50 pointer-events-none space-y-3', getPositionClasses(position))}>
      {notifications.length > 1 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="pointer-events-auto flex items-center justify-end space-x-2 mb-2"
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSound}
            className="bg-white/90 backdrop-blur-sm border border-carbon-200 hover:bg-white/95"
            title={isSoundEnabled ? 'Disable sounds' : 'Enable sounds'}
          >
            {isSoundEnabled ? (
              <Volume2 className="h-4 w-4" />
            ) : (
              <VolumeX className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="bg-white/90 backdrop-blur-sm border border-carbon-200 hover:bg-white/95"
          >
            Clear All
          </Button>
        </motion.div>
      )}

      <AnimatePresence mode="popLayout">
        {notifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onRemove={removeNotification}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

interface NotificationItemProps {
  notification: Notification;
  onRemove: (id: string) => void;
}

const NotificationItem = ({ notification, onRemove }: NotificationItemProps) => {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (notification.duration && notification.duration > 0) {
      const interval = setInterval(() => {
        setProgress(prev => {
          const elapsed = Date.now() - notification.timestamp.getTime();
          const remaining = Math.max(0, 100 - (elapsed / notification.duration!) * 100);
          return remaining;
        });
      }, 50);

      return () => clearInterval(interval);
    }
  }, [notification.duration, notification.timestamp]);

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-success-600" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-warning-600" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-danger-600" />;
      case 'info':
        return <Info className="h-5 w-5 text-primary-600" />;
    }
  };

  const getBorderColor = (type: NotificationType) => {
    switch (type) {
      case 'success':
        return 'border-l-success-500';
      case 'warning':
        return 'border-l-warning-500';
      case 'error':
        return 'border-l-danger-500';
      case 'info':
        return 'border-l-primary-500';
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -50, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -50, scale: 0.8 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className={cn(
        'pointer-events-auto relative max-w-sm w-full bg-white rounded-lg shadow-lg border border-carbon-200 border-l-4 overflow-hidden',
        getBorderColor(notification.type)
      )}
    >
      {notification.duration && notification.duration > 0 && (
        <div className="absolute top-0 left-0 w-full h-1 bg-carbon-100">
          <motion.div
            className={cn(
              'h-full transition-all duration-75',
              notification.type === 'success' ? 'bg-success-500' :
              notification.type === 'warning' ? 'bg-warning-500' :
              notification.type === 'error' ? 'bg-danger-500' : 'bg-primary-500'
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 pt-0.5">
            {getIcon(notification.type)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h4 className="text-body-base font-semibold text-carbon-900 truncate">
                {notification.title}
              </h4>
              <button
                onClick={() => onRemove(notification.id)}
                className="flex-shrink-0 ml-2 p-1 rounded-full hover:bg-carbon-100 transition-colors"
                aria-label="Dismiss notification"
              >
                <X className="h-4 w-4 text-carbon-400 hover:text-carbon-600" />
              </button>
            </div>
            
            {notification.message && (
              <p className="mt-1 text-body-sm text-carbon-600">
                {notification.message}
              </p>
            )}

            {notification.action && (
              <div className="mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    notification.action!.onClick();
                    onRemove(notification.id);
                  }}
                  className="h-8 px-3 text-caption"
                >
                  {notification.action.label}
                </Button>
              </div>
            )}

            <div className="mt-2 flex items-center justify-between">
              <span className="text-caption text-carbon-400">
                {notification.timestamp.toLocaleTimeString()}
              </span>
              {notification.duration === 0 && (
                <Badge variant="secondary" className="text-caption">
                  Persistent
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

export const notificationUtils = {
  success: (title: string, message?: string, options?: Partial<Notification>) => ({
    type: 'success' as const,
    title,
    message,
    ...options,
  }),
  
  warning: (title: string, message?: string, options?: Partial<Notification>) => ({
    type: 'warning' as const,
    title,
    message,
    duration: 7000,
    ...options,
  }),
  
  error: (title: string, message?: string, options?: Partial<Notification>) => ({
    type: 'error' as const,
    title,
    message,
    duration: 0,
    ...options,
  }),
  
  info: (title: string, message?: string, options?: Partial<Notification>) => ({
    type: 'info' as const,
    title,
    message,
    ...options,
  }),
};

interface NotificationBellProps {
  className?: string;
  onClick?: () => void;
}

export const NotificationBell = ({ className, onClick }: NotificationBellProps) => {
  const { notifications } = useNotifications();
  const unreadCount = notifications.length;

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className={cn('relative', className)}
      aria-label={`Notifications (${unreadCount} unread)`}
    >
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-1 -right-1 h-5 w-5 bg-danger-500 text-white text-caption font-semibold rounded-full flex items-center justify-center"
        >
          {unreadCount > 9 ? '9+' : unreadCount}
        </motion.div>
      )}
    </Button>
  );
};