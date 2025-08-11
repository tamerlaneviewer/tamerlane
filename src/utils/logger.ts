// src/utils/logger.ts
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  data?: any[];
}

interface Logger {
  debug: (message: string, ...args: any[]) => void;
  info: (message: string, ...args: any[]) => void;
  warn: (message: string, ...args: any[]) => void;
  error: (message: string, ...args: any[]) => void;
}

class ProductionLogger implements Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private errorReportingService?: (error: LogEntry) => void;

  constructor(errorReportingService?: (error: LogEntry) => void) {
    this.errorReportingService = errorReportingService;
  }

  private createLogEntry(level: LogLevel, message: string, ...args: any[]): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      data: args.length > 0 ? args : undefined
    };
  }

  private shouldLog(level: LogLevel): boolean {
    if (this.isDevelopment) return true;
    // In production, only log warnings and errors
    return level === 'warn' || level === 'error';
  }

  private formatMessage(entry: LogEntry): string {
    const prefix = `[${entry.level.toUpperCase()}] ${entry.timestamp}`;
    return `${prefix} ${entry.message}`;
  }

  debug(message: string, ...args: any[]): void {
    const entry = this.createLogEntry('debug', message, ...args);
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage(entry), ...(entry.data || []));
    }
  }

  info(message: string, ...args: any[]): void {
    const entry = this.createLogEntry('info', message, ...args);
    if (this.shouldLog('info')) {
      console.info(this.formatMessage(entry), ...(entry.data || []));
    }
  }

  warn(message: string, ...args: any[]): void {
    const entry = this.createLogEntry('warn', message, ...args);
    console.warn(this.formatMessage(entry), ...(entry.data || []));
    
    // In production, send to error reporting service
    if (!this.isDevelopment && this.errorReportingService) {
      this.errorReportingService(entry);
    }
  }

  error(message: string, ...args: any[]): void {
    const entry = this.createLogEntry('error', message, ...args);
    console.error(this.formatMessage(entry), ...(entry.data || []));
    
    // In production, send to error reporting service
    if (!this.isDevelopment && this.errorReportingService) {
      this.errorReportingService(entry);
    }
  }
}

// Create singleton logger instance
export const logger = new ProductionLogger();

// Helper function for backward compatibility with existing console.log calls
export const logDebug = logger.debug.bind(logger);
export const logInfo = logger.info.bind(logger);
export const logWarn = logger.warn.bind(logger);
export const logError = logger.error.bind(logger);
