/**
 * Centralized constants for file processing limits.
 * All limits are defined here to ensure consistency across client and server.
 */

/** Maximum number of files to send for AI analysis (applies to both GitHub and local uploads). */
export const MAX_FILES_FOR_ANALYSIS = 40;

/** Maximum file size in bytes for a single file (200 KB). */
export const MAX_FILE_SIZE_BYTES = 200 * 1024;

/** Cache TTL for GitHub repository data (10 minutes). */
export const REPO_CACHE_TTL_MS = 10 * 60 * 1000;

/** Supported file extensions for code analysis. */
export const VALID_EXTENSIONS = [
  '.js', '.ts', '.jsx', '.tsx',
  '.py', '.go', '.rs', '.java',
  '.c', '.cpp', '.h',
  '.md', '.json', '.html', '.css',
];

/** Paths/patterns to exclude from analysis. */
export const EXCLUDED_PATH_PATTERNS = [
  'node_modules/',
  '.git/',
  '.next/',
  'dist/',
  'build/',
  'package-lock.json',
];
