
/**
 * Centralized logging service
 * Provides consistent logging with different severity levels
 * and environment-based filtering
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

interface LogOptions {
  module?: string;
  data?: any;
  error?: Error;
  tags?: string[];
}

class LoggingService {
  private readonly isProd: boolean;
  private readonly minLevel: LogLevel;
  
  constructor() {
    // Determine environment
    this.isProd = process.env.NODE_ENV === 'production';
    
    // Set minimum log level based on environment
    this.minLevel = this.isProd ? LogLevel.INFO : LogLevel.DEBUG;
  }
  
  /**
   * Format log message with consistent styling
   */
  private formatMessage(
    level: LogLevel,
    message: string,
    options?: LogOptions
  ): string {
    const timestamp = new Date().toISOString();
    const module = options?.module ? `[${options.module}]` : '';
    const tags = options?.tags?.length ? `[${options.tags.join(',')}]` : '';
    
    return `${timestamp} ${this.getLevelString(level)} ${module} ${tags} ${message}`;
  }
  
  /**
   * Get string representation of log level
   */
  private getLevelString(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG: return '[DEBUG]';
      case LogLevel.INFO: return '[INFO]';
      case LogLevel.WARN: return '[WARN]';
      case LogLevel.ERROR: return '[ERROR]';
      default: return '[LOG]';
    }
  }
  
  /**
   * Get console styling for log level
   */
  private getLevelStyle(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG: return 'color: #8a8a8a';
      case LogLevel.INFO: return 'color: #0066FF';
      case LogLevel.WARN: return 'color: #FF9900; font-weight: bold';
      case LogLevel.ERROR: return 'color: #FF0033; font-weight: bold';
      default: return '';
    }
  }
  
  /**
   * Core logging function
   */
  private log(
    level: LogLevel,
    message: string,
    options?: LogOptions
  ): void {
    // Skip logs below minimum level
    if (level < this.minLevel) return;
    
    const formattedMessage = this.formatMessage(level, message, options);
    const style = this.getLevelStyle(level);
    
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(`%c${formattedMessage}`, style, options?.data || '');
        break;
      case LogLevel.INFO:
        console.info(`%c${formattedMessage}`, style, options?.data || '');
        break;
      case LogLevel.WARN:
        console.warn(`%c${formattedMessage}`, style, options?.data || '');
        break;
      case LogLevel.ERROR:
        console.error(`%c${formattedMessage}`, style, options?.error || options?.data || '');
        break;
      default:
        console.log(`%c${formattedMessage}`, style, options?.data || '');
    }
  }
  
  /**
   * Log debug message
   */
  debug(message: string, options?: LogOptions): void {
    this.log(LogLevel.DEBUG, message, options);
  }
  
  /**
   * Log info message
   */
  info(message: string, options?: LogOptions): void {
    this.log(LogLevel.INFO, message, options);
  }
  
  /**
   * Log warning message
   */
  warn(message: string, options?: LogOptions): void {
    this.log(LogLevel.WARN, message, options);
  }
  
  /**
   * Log error message
   */
  error(message: string, options?: LogOptions): void {
    this.log(LogLevel.ERROR, message, options);
  }
  
  /**
   * Create a child logger with a specific module name
   */
  getLogger(module: string): Pick<LoggingService, 'debug' | 'info' | 'warn' | 'error'> {
    return {
      debug: (message: string, options?: Omit<LogOptions, 'module'>) => 
        this.debug(message, { ...options, module }),
      info: (message: string, options?: Omit<LogOptions, 'module'>) => 
        this.info(message, { ...options, module }),
      warn: (message: string, options?: Omit<LogOptions, 'module'>) => 
        this.warn(message, { ...options, module }),
      error: (message: string, options?: Omit<LogOptions, 'module'>) => 
        this.error(message, { ...options, module })
    };
  }
}

// Create singleton instance
export const logger = new LoggingService();

// Export default logger for convenience
export default logger;
