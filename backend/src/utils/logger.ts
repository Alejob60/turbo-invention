/**
 * Simple Logger Utility
 * Structured logging for production monitoring
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  [key: string]: any;
}

class Logger {
 private logLevel: LogLevel;

 constructor(logLevel: LogLevel = 'debug') {
   this.logLevel = logLevel;
  }

 private shouldLog(level: LogLevel): boolean {
   const levels: Record<LogLevel, number> = {
     debug: 0,
     info: 1,
      warn: 2,
      error: 3
    };
    
  return levels[level] >= levels[this.logLevel];
  }

 private formatEntry(entry: LogEntry): string {
  return JSON.stringify(entry);
  }

 private log(level: LogLevel, message: string, data: any = {}): void {
    if (!this.shouldLog(level)) return;

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
     level,
    message,
     ...data
    };

  const formatted = this.formatEntry(entry);

    switch (level) {
    case 'error':
      console.error(formatted);
        break;
    case 'warn':
      console.warn(formatted);
        break;
    default:
      console.log(formatted);
    }
  }

  debug(message: string, data?: any): void {
   this.log('debug', message, data);
  }

  info(message: string, data?: any): void {
   this.log('info', message, data);
  }

  warn(message: string, data?: any): void {
   this.log('warn', message, data);
  }

  error(message: string, data?: any): void {
   this.log('error', message, data);
  }
}

// Export singleton instance
export const logger= new Logger(process.env.LOG_LEVEL as LogLevel || 'info');
