interface LogContext {
  [key: string]: any;
}

interface LogMessage {
  message: string;
  context?: LogContext;
  error?: {
    code?: string;
    message: string;
    stack?: string;
  };
  metadata?: LogContext;
  [key: string]: any;
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private isClient = typeof window !== 'undefined';

  private formatMessage(level: LogLevel, message: string | LogMessage, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const logMessage = typeof message === 'string' ? message : message.message;
    const logContext = typeof message === 'string' ? context : { ...message, message: undefined };
    
    let formattedMessage = `[${timestamp}] ${level.toUpperCase()}: ${logMessage}`;
    
    if (logContext && Object.keys(logContext).length > 0) {
      formattedMessage += `\nContext: ${JSON.stringify(logContext, null, 2)}`;
    }
    
    return formattedMessage;
  }

  private shouldLog(level: LogLevel): boolean {
    if (this.isDevelopment) return true;
    
    // In production, only log warnings and errors
    return level === 'warn' || level === 'error';
  }

  private logToConsole(level: LogLevel, message: string | LogMessage, context?: LogContext): void {
    if (!this.shouldLog(level)) return;

    const formattedMessage = this.formatMessage(level, message, context);
    
    switch (level) {
      case 'debug':
        console.debug(formattedMessage);
        break;
      case 'info':
        console.info(formattedMessage);
        break;
      case 'warn':
        console.warn(formattedMessage);
        break;
      case 'error':
        console.error(formattedMessage);
        break;
    }
  }

  private logToServer(level: LogLevel, message: string | LogMessage, context?: LogContext): void {
    // In a real application, you would send logs to a logging service
    // For now, we'll just store them in sessionStorage in the browser
    if (!this.isClient || !this.shouldLog(level)) return;

    try {
      const logEntry = {
        timestamp: new Date().toISOString(),
        level,
        message: typeof message === 'string' ? message : message.message,
        context: typeof message === 'string' ? context : message,
        userAgent: navigator.userAgent,
        url: window.location.href,
      };

      const existingLogs = JSON.parse(sessionStorage.getItem('app_logs') || '[]');
      existingLogs.push(logEntry);
      
      // Keep only the last 100 log entries
      if (existingLogs.length > 100) {
        existingLogs.splice(0, existingLogs.length - 100);
      }
      
      sessionStorage.setItem('app_logs', JSON.stringify(existingLogs));
    } catch (error) {
      // Silently fail if we can't log to session storage
    }
  }

  private log(level: LogLevel, message: string | LogMessage, context?: LogContext): void {
    this.logToConsole(level, message, context);
    this.logToServer(level, message, context);
  }

  debug(message: string | LogMessage, context?: LogContext): void {
    this.log('debug', message, context);
  }

  info(message: string | LogMessage, context?: LogContext): void {
    this.log('info', message, context);
  }

  warn(message: string | LogMessage, context?: LogContext): void {
    this.log('warn', message, context);
  }

  error(message: string | LogMessage, context?: LogContext): void {
    this.log('error', message, context);
  }

  // Utility method to get stored logs (useful for debugging)
  getLogs(): any[] {
    if (!this.isClient) return [];
    
    try {
      return JSON.parse(sessionStorage.getItem('app_logs') || '[]');
    } catch {
      return [];
    }
  }

  // Clear stored logs
  clearLogs(): void {
    if (this.isClient) {
      sessionStorage.removeItem('app_logs');
    }
  }
}

export const logger = new Logger();