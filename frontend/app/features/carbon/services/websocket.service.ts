import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';

export interface WebSocketEvent {
  type: 'carbon_updated' | 'data_source_update' | 'emission_factor_update' | 'health_status_change' | 'validation_complete';
  timestamp: string;
  data: any;
}

export interface CarbonUpdateEvent {
  userId: string;
  activityId: string;
  carbonKg: number;
  confidence: 'high' | 'medium' | 'low';
  methodology: string;
}

export interface DataSourceUpdateEvent {
  sourceId: string;
  sourceName: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastUpdate: string;
  responseTime: number;
}

export interface EmissionFactorUpdateEvent {
  region: string;
  factor: number;
  unit: string;
  source: string;
  lastUpdated: string;
}

export interface HealthStatusEvent {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  uptime: number;
}

export interface ValidationCompleteEvent {
  calculationId: string;
  validationResults: any[];
  overallAgreement: number;
  consensusRange: { lower: number; upper: number };
}

type EventCallback = (data: any) => void;
type ConnectionCallback = () => void;

class WebSocketService {
  private socket: Socket | null = null;
  private eventListeners: Map<string, EventCallback[]> = new Map();
  private connectionListeners: ConnectionCallback[] = [];
  private disconnectionListeners: ConnectionCallback[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private baseUrl: string;
  private isConnecting = false;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_WS_BASE_URL || 'http://localhost:3001';
  }

  connect(userId?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket && this.socket.connected) {
        resolve();
        return;
      }

      if (this.isConnecting) {
        resolve();
        return;
      }

      this.isConnecting = true;

      try {
        this.socket = io(this.baseUrl, {
          transports: ['websocket', 'polling'],
          timeout: 10000,
          autoConnect: true,
          query: userId ? { userId } : undefined
        });

        this.socket.on('connect', () => {
          console.log('WebSocket connected');
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.connectionListeners.forEach(callback => callback());
          resolve();
        });

        this.socket.on('disconnect', (reason) => {
          console.log('WebSocket disconnected:', reason);
          this.disconnectionListeners.forEach(callback => callback());
          
          if (reason === 'io server disconnect') {
            this.attemptReconnection();
          }
        });

        this.socket.on('connect_error', (error) => {
          console.error('WebSocket connection error:', error);
          this.isConnecting = false;
          this.attemptReconnection();
          reject(error);
        });

        this.socket.on('carbon_updated', (data: CarbonUpdateEvent) => {
          this.emitToListeners('carbon_updated', data);
        });

        this.socket.on('data_source_update', (data: DataSourceUpdateEvent) => {
          this.emitToListeners('data_source_update', data);
        });

        this.socket.on('emission_factor_update', (data: EmissionFactorUpdateEvent) => {
          this.emitToListeners('emission_factor_update', data);
        });

        this.socket.on('health_status_change', (data: HealthStatusEvent) => {
          this.emitToListeners('health_status_change', data);
        });

        this.socket.on('validation_complete', (data: ValidationCompleteEvent) => {
          this.emitToListeners('validation_complete', data);
        });

        this.socket.on('message', (event: WebSocketEvent) => {
          this.emitToListeners(event.type, event.data);
        });

      } catch (error) {
        console.error('Failed to create WebSocket connection:', error);
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.eventListeners.clear();
    this.connectionListeners.length = 0;
    this.disconnectionListeners.length = 0;
    this.reconnectAttempts = 0;
    this.isConnecting = false;
  }

  on(eventType: string, callback: EventCallback): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType)!.push(callback);
  }

  off(eventType: string, callback: EventCallback): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  onConnection(callback: ConnectionCallback): void {
    this.connectionListeners.push(callback);
  }

  onDisconnection(callback: ConnectionCallback): void {
    this.disconnectionListeners.push(callback);
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getConnectionState(): 'connected' | 'connecting' | 'disconnected' {
    if (this.socket?.connected) return 'connected';
    if (this.isConnecting) return 'connecting';
    return 'disconnected';
  }

  private attemptReconnection(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(() => {
      this.connect().catch(error => {
        console.error('Reconnection attempt failed:', error);
        this.attemptReconnection();
      });
    }, delay);
  }

  private emitToListeners(eventType: string, data: any): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in WebSocket event listener for ${eventType}:`, error);
        }
      });
    }
  }

  subscribeToDataSourceUpdates(callback: (data: DataSourceUpdateEvent) => void): void {
    this.on('data_source_update', callback);
  }

  subscribeToEmissionFactorUpdates(callback: (data: EmissionFactorUpdateEvent) => void): void {
    this.on('emission_factor_update', callback);
  }

  subscribeToHealthStatusChanges(callback: (data: HealthStatusEvent) => void): void {
    this.on('health_status_change', callback);
  }

  subscribeToCarbonUpdates(callback: (data: CarbonUpdateEvent) => void): void {
    this.on('carbon_updated', callback);
  }

  subscribeToValidationComplete(callback: (data: ValidationCompleteEvent) => void): void {
    this.on('validation_complete', callback);
  }

  send(eventType: string, data: any): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit(eventType, data);
    } else {
      console.warn('WebSocket not connected, cannot send message:', eventType);
    }
  }

  requestDataRefresh(dataType: 'carbon' | 'sources' | 'factors' | 'health'): void {
    this.send('request_refresh', { dataType, timestamp: new Date().toISOString() });
  }

  joinRoom(roomId: string): void {
    this.send('join_room', { roomId });
  }

  leaveRoom(roomId: string): void {
    this.send('leave_room', { roomId });
  }

  getStats(): {
    connected: boolean;
    reconnectAttempts: number;
    eventListenerCount: number;
    connectionListenerCount: number;
  } {
    return {
      connected: this.isConnected(),
      reconnectAttempts: this.reconnectAttempts,
      eventListenerCount: Array.from(this.eventListeners.values()).reduce((sum, listeners) => sum + listeners.length, 0),
      connectionListenerCount: this.connectionListeners.length
    };
  }
}

export const webSocketService = new WebSocketService();

export const useWebSocket = (userId?: string) => {
  const [connectionState, setConnectionState] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected');

  useEffect(() => {
    const updateConnectionState = () => {
      setConnectionState(webSocketService.getConnectionState());
    };

    webSocketService.onConnection(updateConnectionState);
    webSocketService.onDisconnection(updateConnectionState);

    webSocketService.connect(userId).catch(error => {
      console.error('WebSocket connection failed:', error);
      setConnectionState('disconnected');
    });

    updateConnectionState();

    return () => {
      webSocketService.off('connection', updateConnectionState);
      webSocketService.off('disconnection', updateConnectionState);
    };
  }, [userId]);

  return {
    connectionState,
    isConnected: connectionState === 'connected',
    subscribe: webSocketService.on.bind(webSocketService),
    unsubscribe: webSocketService.off.bind(webSocketService),
    send: webSocketService.send.bind(webSocketService),
    requestRefresh: webSocketService.requestDataRefresh.bind(webSocketService),
    subscribeToDataSourceUpdates: webSocketService.subscribeToDataSourceUpdates.bind(webSocketService),
    subscribeToEmissionFactorUpdates: webSocketService.subscribeToEmissionFactorUpdates.bind(webSocketService),
    subscribeToHealthStatusChanges: webSocketService.subscribeToHealthStatusChanges.bind(webSocketService),
    subscribeToCarbonUpdates: webSocketService.subscribeToCarbonUpdates.bind(webSocketService),
    subscribeToValidationComplete: webSocketService.subscribeToValidationComplete.bind(webSocketService)
  };
};