import { useState, useEffect, useCallback } from 'react';
import { toast } from '@shared/hooks/use-toast';

export interface OfflineState {
  isOnline: boolean;
  isOffline: boolean;
  wasOffline: boolean;
  lastOnlineTime: Date | null;
  connectionType: string | null;
}

export interface OfflineStorageItem {
  id: string;
  data: any;
  timestamp: Date;
  type: string;
  retryCount: number;
  maxRetries: number;
}

export function useOffline() {
  const [state, setState] = useState<OfflineState>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isOffline: typeof navigator !== 'undefined' ? !navigator.onLine : false,
    wasOffline: false,
    lastOnlineTime: null,
    connectionType: null,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateConnectionStatus = () => {
      const isOnline = navigator.onLine;
      const wasOffline = !isOnline && state.isOnline;
      
      setState(prev => ({
        ...prev,
        isOnline,
        isOffline: !isOnline,
        wasOffline: wasOffline || prev.wasOffline,
        lastOnlineTime: isOnline ? new Date() : prev.lastOnlineTime,
      }));

      if (wasOffline) {
        toast.warning({
          title: 'Connection Lost',
          description: 'You\'re now offline. Some features may be limited.',
        });
      } else if (!isOnline && state.wasOffline) {
        toast.success({
          title: 'Connection Restored',
          description: 'You\'re back online. Syncing data...',
        });
      }
    };

    const updateConnectionType = () => {
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        setState(prev => ({
          ...prev,
          connectionType: connection?.effectiveType || null,
        }));
      }
    };

    window.addEventListener('online', updateConnectionStatus);
    window.addEventListener('offline', updateConnectionStatus);
    
    if ('connection' in navigator) {
      (navigator as any).connection?.addEventListener('change', updateConnectionType);
    }

    updateConnectionStatus();
    updateConnectionType();

    return () => {
      window.removeEventListener('online', updateConnectionStatus);
      window.removeEventListener('offline', updateConnectionStatus);
      
      if ('connection' in navigator) {
        (navigator as any).connection?.removeEventListener('change', updateConnectionType);
      }
    };
  }, [state.isOnline, state.wasOffline]);

  return state;
}

export function useOfflineStorage(key: string = 'offline_data') {
  const [pendingItems, setPendingItems] = useState<OfflineStorageItem[]>([]);
  const { isOnline } = useOffline();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const items = JSON.parse(stored).map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp),
        }));
        setPendingItems(items);
      }
    } catch (error) {
      console.error('Failed to load offline data:', error);
    }
  }, [key]);

  const savePendingItems = useCallback((items: OfflineStorageItem[]) => {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(key, JSON.stringify(items));
      setPendingItems(items);
    } catch (error) {
      console.error('Failed to save offline data:', error);
    }
  }, [key]);

  const addOfflineItem = useCallback((
    data: any,
    type: string,
    maxRetries: number = 3
  ) => {
    const item: OfflineStorageItem = {
      id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      data,
      timestamp: new Date(),
      type,
      retryCount: 0,
      maxRetries,
    };

    const updatedItems = [...pendingItems, item];
    savePendingItems(updatedItems);
    
    toast.info({
      title: 'Saved Offline',
      description: 'Your data will be synced when connection is restored.',
    });

    return item.id;
  }, [pendingItems, savePendingItems]);

  const removeOfflineItem = useCallback((id: string) => {
    const updatedItems = pendingItems.filter(item => item.id !== id);
    savePendingItems(updatedItems);
  }, [pendingItems, savePendingItems]);

  const incrementRetryCount = useCallback((id: string) => {
    const updatedItems = pendingItems.map(item =>
      item.id === id ? { ...item, retryCount: item.retryCount + 1 } : item
    );
    savePendingItems(updatedItems);
  }, [pendingItems, savePendingItems]);

  const syncPendingItems = useCallback(async (
    syncFunction: (item: OfflineStorageItem) => Promise<boolean>
  ) => {
    if (!isOnline || pendingItems.length === 0) return;

    const itemsToSync = [...pendingItems];
    let syncedCount = 0;
    let failedCount = 0;

    for (const item of itemsToSync) {
      try {
        const success = await syncFunction(item);
        
        if (success) {
          removeOfflineItem(item.id);
          syncedCount++;
        } else {
          if (item.retryCount >= item.maxRetries) {
            removeOfflineItem(item.id);
            failedCount++;
          } else {
            incrementRetryCount(item.id);
          }
        }
      } catch (error) {
        console.error(`Failed to sync item ${item.id}:`, error);
        
        if (item.retryCount >= item.maxRetries) {
          removeOfflineItem(item.id);
          failedCount++;
        } else {
          incrementRetryCount(item.id);
        }
      }
    }

    if (syncedCount > 0) {
      toast.success({
        title: 'Data Synced',
        description: `${syncedCount} item${syncedCount !== 1 ? 's' : ''} synced successfully.`,
      });
    }

    if (failedCount > 0) {
      toast.error({
        title: 'Sync Failed',
        description: `${failedCount} item${failedCount !== 1 ? 's' : ''} failed to sync after maximum retries.`,
      });
    }
  }, [isOnline, pendingItems, removeOfflineItem, incrementRetryCount]);

  const clearOfflineData = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(key);
      setPendingItems([]);
    }
  }, [key]);

  return {
    pendingItems,
    addOfflineItem,
    removeOfflineItem,
    syncPendingItems,
    clearOfflineData,
    hasPendingItems: pendingItems.length > 0,
  };
}

export function useConnectionQuality() {
  const [quality, setQuality] = useState<'fast' | 'slow' | 'offline' | 'unknown'>('unknown');
  const { isOnline, connectionType } = useOffline();

  useEffect(() => {
    if (!isOnline) {
      setQuality('offline');
      return;
    }

    const slowConnections = ['slow-2g', '2g', '3g'];
    const fastConnections = ['4g', '5g'];

    if (connectionType) {
      if (slowConnections.includes(connectionType)) {
        setQuality('slow');
      } else if (fastConnections.includes(connectionType)) {
        setQuality('fast');
      } else {
        setQuality('unknown');
      }
    } else {
      const measureConnectionSpeed = async () => {
        try {
          const startTime = Date.now();
          const response = await fetch('/favicon.ico?_=' + Date.now(), {
            method: 'HEAD',
            cache: 'no-cache',
          });
          const endTime = Date.now();
          const duration = endTime - startTime;

          if (response.ok) {
            setQuality(duration > 1000 ? 'slow' : 'fast');
          }
        } catch (error) {
          setQuality('slow');
        }
      };

      measureConnectionSpeed();
    }
  }, [isOnline, connectionType]);

  return {
    quality,
    isSlow: quality === 'slow',
    isFast: quality === 'fast',
    isOffline: quality === 'offline',
  };
}

export function useRetryWithBackoff() {
  const { isOnline } = useOffline();

  const retry = useCallback(async <T>(
    fn: () => Promise<T>,
    maxAttempts: number = 3,
    baseDelay: number = 1000
  ): Promise<T> => {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        if (!isOnline && attempt > 1) {
          throw new Error('Offline - skipping retry');
        }

        return await fn();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxAttempts) {
          break;
        }

        const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }, [isOnline]);

  return { retry };
}

export function useOptimisticUpdate<T>() {
  const [optimisticData, setOptimisticData] = useState<T | null>(null);
  const [isOptimistic, setIsOptimistic] = useState(false);

  const applyOptimisticUpdate = useCallback((data: T) => {
    setOptimisticData(data);
    setIsOptimistic(true);
  }, []);

  const confirmUpdate = useCallback(() => {
    setIsOptimistic(false);
    setOptimisticData(null);
  }, []);

  const rollbackUpdate = useCallback(() => {
    setIsOptimistic(false);
    setOptimisticData(null);
  }, []);

  return {
    optimisticData,
    isOptimistic,
    applyOptimisticUpdate,
    confirmUpdate,
    rollbackUpdate,
  };
}

export function useServiceWorker() {
  const [isRegistered, setIsRegistered] = useState(false);
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        setIsRegistered(true);

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setIsUpdateAvailable(true);
              }
            });
          }
        });
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    };

    registerSW();
  }, []);

  const updateServiceWorker = useCallback(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((registration) => {
        if (registration?.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          window.location.reload();
        }
      });
    }
  }, []);

  return {
    isRegistered,
    isUpdateAvailable,
    updateServiceWorker,
  };
}