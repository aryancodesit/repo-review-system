/**
 * Client-side error tracking utility.
 * In a production application, this would integrate with a service like Sentry or Bugsnag.
 */
export function reportClientError(error: Error | string, context?: Record<string, any>) {
  if (process.env.NODE_ENV === 'production') {
    // Mock integration with Sentry/Bugsnag
    console.error('[Production Error Tracker]', error, context);
    
    // Example: Sentry.captureException(error, { extra: context });
  } else {
    console.error('[Dev Error]', error, context);
  }
}
