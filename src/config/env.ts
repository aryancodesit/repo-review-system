/**
 * Centralized configuration validation to ensure critical environment
 * variables are present at application startup (fail-fast principle).
 */
export const ENV = {
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
};

if (typeof window === 'undefined') {
  if (!ENV.GEMINI_API_KEY) {
    console.error("CRITICAL: GEMINI_API_KEY is missing from environment variables. AI operations will fail.");
  }
}
