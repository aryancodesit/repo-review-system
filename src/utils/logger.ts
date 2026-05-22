/**
 * A simple structured logger for the application.
 * In a production enterprise app, this could wrap Winston or Pino.
 */
export class Logger {
  static info(message: string, context?: any, requestId?: string) {
    console.log(JSON.stringify({ level: 'INFO', message, context, requestId, timestamp: new Date().toISOString() }));
  }

  static warn(message: string, context?: any, requestId?: string) {
    console.warn(JSON.stringify({ level: 'WARN', message, context, requestId, timestamp: new Date().toISOString() }));
  }

  static error(message: string, error?: any, requestId?: string) {
    console.error(JSON.stringify({ 
      level: 'ERROR', 
      message, 
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      requestId,
      timestamp: new Date().toISOString() 
    }));
  }
}
