/**
 * Client-side error tracking utility.
 * In production, integrate with Sentry or Bugsnag here.
 */
export function reportClientError(error: Error | string, context?: Record<string, unknown>) {
  if (process.env.NODE_ENV === 'production') {
    console.error('[Production Error Tracker]', error, context);
    // Example: Sentry.captureException(error, { extra: context });
  } else {
    console.error('[Dev Error]', error, context);
  }
}
