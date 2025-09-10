import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { logger } from '@shared/utils/logger';
import { PerformanceMonitor } from '@shared/utils/performance';
import { ConnectionInfo, BroadcastMessage, SubscriptionRequest } from '@websocket/types';

export class WebSocketService {
  private io!: SocketIOServer;
  private connections: Map<string, ConnectionInfo> = new Map();
  private channelSubscriptions: Map<string, Set<string>> = new Map();
  private performanceMonitor: PerformanceMonitor;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  
  constructor() {
    this.performanceMonitor = new PerformanceMonitor();
    logger.info('WebSocket service initialized');
  }
  
  initialize(httpServer: HttpServer): void {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      },
      pingTimeout: 60000,
      pingInterval: 25000,
      maxHttpBufferSize: 1e6,
      transports: ['websocket', 'polling']
    });
    
    this.setupEventHandlers();
    this.startHeartbeat();
    
    logger.info('WebSocket server initialized', {
      cors_origin: process.env.FRONTEND_URL || "http://localhost:3000",
      ping_timeout: 60000,
      ping_interval: 25000
    });
  }
  
  private setupEventHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      const connectionId = socket.id;
      const ipAddress = socket.request.socket.remoteAddress;
      const userAgent = socket.request.headers['user-agent'];
      
      const connectionInfo: ConnectionInfo = {
        id: connectionId,
        subscriptions: new Set(),
        connectedAt: new Date(),
        lastActivity: new Date(),
        ipAddress,
        userAgent
      };
      
      this.connections.set(connectionId, connectionInfo);
      
      logger.info('WebSocket client connected', {
        connectionId,
        ipAddress,
        userAgent,
        totalConnections: this.connections.size
      });
      
      socket.on('authenticate', (data: { userId: string; token?: string }) => {
        this.handleAuthentication(socket, data);
      });
      
      socket.on('subscribe', (data: SubscriptionRequest) => {
        this.handleSubscription(socket, data);
      });
      
      socket.on('unsubscribe', (data: { channel: string }) => {
        this.handleUnsubscription(socket, data.channel);
      });
      
      socket.on('heartbeat', () => {
        this.handleHeartbeat(socket);
      });
      
      socket.on('disconnect', (reason: string) => {
        this.handleDisconnection(socket, reason);
      });
      
      socket.on('error', (error: Error) => {
        logger.error('WebSocket connection error', {
          connectionId,
          error: {
            code: 'WEBSOCKET_ERROR',
            message: error.message,
            stack: error.stack
          }
        });
      });
      
      socket.emit('connected', {
        connectionId,
        timestamp: new Date().toISOString(),
        server_info: {
          version: '1.0.0',
          features: ['real-time-carbon', 'live-activities', 'leaderboard-updates', 'challenges', 'insights']
        }
      });
      
      this.performanceMonitor.recordWebSocketConnection();
    });
  }
  
  private handleAuthentication(socket: Socket, data: { userId: string; token?: string }): void {
    const connectionInfo = this.connections.get(socket.id);
    if (!connectionInfo) return;
    
    connectionInfo.userId = data.userId;
    connectionInfo.lastActivity = new Date();
    
    logger.info('WebSocket client authenticated', {
      connectionId: socket.id,
      userId: data.userId
    });
    
    socket.emit('authenticated', {
      userId: data.userId,
      timestamp: new Date().toISOString()
    });
    
    this.autoSubscribeUserChannels(socket, data.userId);
  }
  
  private autoSubscribeUserChannels(socket: Socket, userId: string): void {
    const userChannels = [
      `user.${userId}.carbon`,
      `user.${userId}.activities`,
      `user.${userId}.insights`,
      'global.stats',
      'global.challenges'
    ];
    
    userChannels.forEach(channel => {
      this.handleSubscription(socket, { channel, userId });
    });
    
    logger.info('Auto-subscribed user to personal channels', {
      connectionId: socket.id,
      userId,
      channels: userChannels.length
    });
  }
  
  private handleSubscription(socket: Socket, data: SubscriptionRequest): void {
    const connectionInfo = this.connections.get(socket.id);
    if (!connectionInfo) return;
    
    const { channel, userId } = data;
    
    if (!this.validateSubscriptionPermissions(channel, userId, connectionInfo.userId)) {
      socket.emit('subscription_error', {
        channel,
        error: 'Permission denied',
        timestamp: new Date().toISOString()
      });
      return;
    }
    
    connectionInfo.subscriptions.add(channel);
    connectionInfo.lastActivity = new Date();
    
    if (!this.channelSubscriptions.has(channel)) {
      this.channelSubscriptions.set(channel, new Set());
    }
    this.channelSubscriptions.get(channel)!.add(socket.id);
    
    socket.join(channel);
    
    logger.info('WebSocket subscription added', {
      connectionId: socket.id,
      userId: connectionInfo.userId,
      channel,
      totalSubscriptions: connectionInfo.subscriptions.size
    });
    
    socket.emit('subscribed', {
      channel,
      timestamp: new Date().toISOString()
    });
    
    this.performanceMonitor.recordSubscription(channel);
  }
  
  private handleUnsubscription(socket: Socket, channel: string): void {
    const connectionInfo = this.connections.get(socket.id);
    if (!connectionInfo) return;
    
    connectionInfo.subscriptions.delete(channel);
    connectionInfo.lastActivity = new Date();
    
    const channelSubs = this.channelSubscriptions.get(channel);
    if (channelSubs) {
      channelSubs.delete(socket.id);
      if (channelSubs.size === 0) {
        this.channelSubscriptions.delete(channel);
      }
    }
    
    socket.leave(channel);
    
    logger.info('WebSocket subscription removed', {
      connectionId: socket.id,
      userId: connectionInfo.userId,
      channel,
      totalSubscriptions: connectionInfo.subscriptions.size
    });
    
    socket.emit('unsubscribed', {
      channel,
      timestamp: new Date().toISOString()
    });
  }
  
  private handleHeartbeat(socket: Socket): void {
    const connectionInfo = this.connections.get(socket.id);
    if (!connectionInfo) return;
    
    connectionInfo.lastActivity = new Date();
    
    socket.emit('heartbeat_ack', {
      timestamp: new Date().toISOString(),
      server_time: Date.now()
    });
  }
  
  private handleDisconnection(socket: Socket, reason: string): void {
    const connectionInfo = this.connections.get(socket.id);
    if (!connectionInfo) return;
    
    connectionInfo.subscriptions.forEach(channel => {
      const channelSubs = this.channelSubscriptions.get(channel);
      if (channelSubs) {
        channelSubs.delete(socket.id);
        if (channelSubs.size === 0) {
          this.channelSubscriptions.delete(channel);
        }
      }
    });
    
    this.connections.delete(socket.id);
    
    const sessionDuration = Date.now() - connectionInfo.connectedAt.getTime();
    
    logger.info('WebSocket client disconnected', {
      connectionId: socket.id,
      userId: connectionInfo.userId,
      reason,
      sessionDuration: `${sessionDuration}ms`,
      subscriptionsCount: connectionInfo.subscriptions.size,
      totalConnections: this.connections.size
    });
    
    this.performanceMonitor.recordWebSocketDisconnection(sessionDuration);
  }
  
  private validateSubscriptionPermissions(
    channel: string, 
    _requestedUserId?: string, 
    authenticatedUserId?: string
  ): boolean {
    if (channel.startsWith('global.') || channel.startsWith('leaderboard.')) {
      return true;
    }
    
    if (channel.startsWith('user.')) {
      if (!authenticatedUserId) {
        return false;
      }
      
      const channelUserId = channel.split('.')[1];
      return channelUserId === authenticatedUserId;
    }
    
    return false;
  }
  
  broadcast(message: BroadcastMessage): void {
    const { channel, event, data, timestamp } = message;
    
    const subscriberCount = this.channelSubscriptions.get(channel)?.size || 0;
    
    if (subscriberCount === 0) {
      logger.debug('No subscribers for channel', { channel, event });
      return;
    }
    
    try {
      this.io.to(channel).emit(event, {
        data,
        timestamp,
        channel
      });
      
      logger.info('Message broadcasted', {
        channel,
        event,
        subscriberCount,
        dataSize: JSON.stringify(data).length
      });
      
      this.performanceMonitor.recordBroadcast(channel, subscriberCount);
      
    } catch (error: any) {
      logger.error('Broadcast failed', {
        error: {
          code: 'BROADCAST_ERROR',
          message: error.message,
          stack: error.stack
        },
        metadata: { channel, event }
      });
    }
  }
  
  broadcastToChannels(channels: string[], event: string, data: any): void {
    const timestamp = new Date().toISOString();
    
    channels.forEach(channel => {
      this.broadcast({
        channel,
        event,
        data,
        timestamp
      });
    });
  }
  
  getConnectionStats(): {
    totalConnections: number;
    authenticatedConnections: number;
    totalChannels: number;
    totalSubscriptions: number;
    averageSubscriptionsPerConnection: number;
  } {
    const totalConnections = this.connections.size;
    const authenticatedConnections = Array.from(this.connections.values())
      .filter(conn => conn.userId).length;
    const totalChannels = this.channelSubscriptions.size;
    
    let totalSubscriptions = 0;
    this.connections.forEach(conn => {
      totalSubscriptions += conn.subscriptions.size;
    });
    
    const averageSubscriptionsPerConnection = totalConnections > 0 
      ? totalSubscriptions / totalConnections 
      : 0;
    
    return {
      totalConnections,
      authenticatedConnections,
      totalChannels,
      totalSubscriptions,
      averageSubscriptionsPerConnection: Math.round(averageSubscriptionsPerConnection * 100) / 100
    };
  }
  
  getActiveChannels(): string[] {
    return Array.from(this.channelSubscriptions.keys());
  }
  
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.performHeartbeatCheck();
    }, 30000);
    
    logger.info('Heartbeat monitoring started');
  }
  
  private performHeartbeatCheck(): void {
    const now = Date.now();
    const staleThreshold = 5 * 60 * 1000;
    const staleConnections: string[] = [];
    
    this.connections.forEach((connectionInfo, connectionId) => {
      const timeSinceLastActivity = now - connectionInfo.lastActivity.getTime();
      
      if (timeSinceLastActivity > staleThreshold) {
        staleConnections.push(connectionId);
      }
    });
    
    staleConnections.forEach(connectionId => {
      const socket = this.io.sockets.sockets.get(connectionId);
      if (socket) {
        socket.disconnect(true);
      }
    });
    
    if (staleConnections.length > 0) {
      logger.warn('Cleaned up stale connections', {
        count: staleConnections.length,
        connections: staleConnections
      });
    }
  }
  
  shutdown(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    if (this.io) {
      this.io.close();
    }
    
    this.connections.clear();
    this.channelSubscriptions.clear();
    
    logger.info('WebSocket service shutdown completed');
  }
  
  getPerformanceMetrics() {
    return this.performanceMonitor.getWebSocketMetrics();
  }
}

export const webSocketService = new WebSocketService();