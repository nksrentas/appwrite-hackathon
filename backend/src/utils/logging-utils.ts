/**
 * Production-ready logging utility for EcoTrace backend
 * Provides structured logging with different levels and contexts
 */

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

export interface LogContext {
  userId?: string;
  activityId?: string;
  functionName?: string;
  requestId?: string;
  githubEvent?: string;
  carbonCalculation?: {
    type: string;
    confidence: string;
    carbon_kg: number;
  };
  performance?: {
    duration_ms: number;
    memory_mb: number;
  };
  error?: {
    code: string;
    message: string;
    stack?: string;
  };
  metadata?: Record<string, any>;
}

class Logger {
  private level: LogLevel;
  private isProduction: boolean;

  constructor() {
    this.level = this.getLogLevel();
    this.isProduction = process.env.NODE_ENV === 'production';
  }

  private getLogLevel(): LogLevel {
    const envLevel = process.env.LOG_LEVEL?.toUpperCase();
    switch (envLevel) {
      case 'ERROR': return LogLevel.ERROR;
      case 'WARN': return LogLevel.WARN;
      case 'INFO': return LogLevel.INFO;
      case 'DEBUG': return LogLevel.DEBUG;
      default: return this.isProduction ? LogLevel.INFO : LogLevel.DEBUG;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.level;
  }

  private formatMessage(level: string, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const baseLog = {
      timestamp,
      level,
      message,
      ...context
    };

    // In production, use JSON format for log aggregation
    if (this.isProduction) {
      return JSON.stringify(baseLog);
    }

    // In development, use human-readable format
    let formatted = `[${timestamp}] ${level}: ${message}`;
    if (context) {
      formatted += ` | ${JSON.stringify(context, null, 2)}`;
    }
    return formatted;
  }

  error(message: string, context?: LogContext): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;
    
    const logMessage = this.formatMessage('ERROR', message, context);
    console.error(logMessage);
  }

  warn(message: string, context?: LogContext): void {
    if (!this.shouldLog(LogLevel.WARN)) return;
    
    const logMessage = this.formatMessage('WARN', message, context);
    console.warn(logMessage);
  }

  info(message: string, context?: LogContext): void {
    if (!this.shouldLog(LogLevel.INFO)) return;
    
    const logMessage = this.formatMessage('INFO', message, context);
    console.log(logMessage);
  }

  debug(message: string, context?: LogContext): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    
    const logMessage = this.formatMessage('DEBUG', message, context);
    console.log(logMessage);
  }

  // Specialized logging methods for EcoTrace operations
  carbonCalculation(
    message: string, 
    calculation: { type: string; confidence: string; carbon_kg: number },
    additionalContext?: LogContext
  ): void {
    this.info(message, {
      ...additionalContext,
      carbonCalculation: calculation
    });
  }

  githubWebhook(
    message: string,
    event: string,
    payload: { repository?: string; user?: string; [key: string]: any }
  ): void {
    this.info(message, {
      githubEvent: event,
      metadata: payload
    });
  }

  performance(
    message: string,
    metrics: { duration_ms: number; memory_mb?: number },
    context?: LogContext
  ): void {
    this.info(message, {
      ...context,
      performance: metrics
    });
  }

  appwriteOperation(
    operation: string,
    collection?: string,
    documentId?: string,
    success: boolean = true,
    error?: Error
  ): void {
    const context: LogContext = {
      functionName: operation,
      metadata: { collection, documentId }
    };

    if (success) {
      this.info(`Appwrite operation completed: ${operation}`, context);
    } else {
      this.error(`Appwrite operation failed: ${operation}`, {
        ...context,
        error: error ? {
          code: 'APPWRITE_ERROR',
          message: error.message,
          stack: error.stack
        } : undefined
      });
    }
  }

  externalApiCall(
    api: string,
    endpoint: string,
    success: boolean,
    responseTime: number,
    error?: Error
  ): void {
    const context: LogContext = {
      functionName: `external_api_${api}`,
      performance: { duration_ms: responseTime },
      metadata: { endpoint }
    };

    if (success) {
      this.info(`External API call successful: ${api}`, context);
    } else {
      this.error(`External API call failed: ${api}`, {
        ...context,
        error: error ? {
          code: 'EXTERNAL_API_ERROR',
          message: error.message,
          stack: error.stack
        } : undefined
      });
    }
  }

  realtimeEvent(
    event: string,
    channel: string,
    dataSize?: number,
    subscribersCount?: number
  ): void {
    this.debug(`Realtime event broadcasted: ${event}`, {
      functionName: 'realtime_broadcast',
      metadata: {
        channel,
        dataSize,
        subscribersCount
      }
    });
  }
}

// Global logger instance
export const logger = new Logger();

/**
 * Performance monitoring decorator for functions
 */
export function withPerformanceLogging<T extends (...args: any[]) => any>(
  fn: T,
  functionName?: string
): T {
  return ((...args: any[]) => {
    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed;
    
    try {
      const result = fn(...args);
      
      // Handle async functions
      if (result instanceof Promise) {
        return result
          .then((value) => {
            const duration = Date.now() - startTime;
            const memoryUsed = (process.memoryUsage().heapUsed - startMemory) / 1024 / 1024;
            
            logger.performance(
              `Function completed: ${functionName || fn.name}`,
              { duration_ms: duration, memory_mb: memoryUsed }
            );
            
            return value;
          })
          .catch((error) => {
            const duration = Date.now() - startTime;
            logger.error(`Function failed: ${functionName || fn.name}`, {
              performance: { duration_ms: duration },
              error: {
                code: 'FUNCTION_ERROR',
                message: error.message,
                stack: error.stack
              }
            });
            throw error;
          });
      }
      
      // Handle sync functions
      const duration = Date.now() - startTime;
      const memoryUsed = (process.memoryUsage().heapUsed - startMemory) / 1024 / 1024;
      
      logger.performance(
        `Function completed: ${functionName || fn.name}`,
        { duration_ms: duration, memory_mb: memoryUsed }
      );
      
      return result;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error(`Function failed: ${functionName || fn.name}`, {
        performance: { duration_ms: duration },
        error: {
          code: 'FUNCTION_ERROR',
          message: error.message,
          stack: error.stack
        }
      });
      throw error;
    }
  }) as T;
}

/**
 * Request tracing utility for debugging complex flows
 */
export class RequestTracer {
  private requestId: string;
  private startTime: number;
  private steps: Array<{ step: string; timestamp: number; duration: number }> = [];

  constructor(requestId?: string) {
    this.requestId = requestId || this.generateRequestId();
    this.startTime = Date.now();
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  step(stepName: string): void {
    const now = Date.now();
    const duration = now - this.startTime;
    
    this.steps.push({
      step: stepName,
      timestamp: now,
      duration
    });
    
    logger.debug(`Request step: ${stepName}`, {
      requestId: this.requestId,
      performance: { duration_ms: duration }
    });
  }

  complete(message?: string): void {
    const totalDuration = Date.now() - this.startTime;
    
    logger.info(message || 'Request completed', {
      requestId: this.requestId,
      performance: { duration_ms: totalDuration },
      metadata: { steps: this.steps }
    });
  }

  getRequestId(): string {
    return this.requestId;
  }
}