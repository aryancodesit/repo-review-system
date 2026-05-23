import { Logger } from './logger';
import { VALID_EXTENSIONS, MAX_FILE_SIZE_BYTES, EXCLUDED_PATH_PATTERNS } from './constants';

export interface FileData {
  path: string;
  content: string;
}

// Re-export for consumers that import directly from this module
export { VALID_EXTENSIONS, MAX_FILE_SIZE_BYTES } from './constants';

export function isValidFilePath(path: string): boolean {
  if (EXCLUDED_PATH_PATTERNS.some(pattern => path.includes(pattern))) {
    return false;
  }
  return VALID_EXTENSIONS.some(ext => path.endsWith(ext));
}

/**
 * Validates files uploaded from the local system on the server-side.
 * Enforces size limits and allowed extensions.
 */
export function validateLocalFiles(files: unknown[]): FileData[] {
  let validCount = 0;
  let skippedCount = 0;

  const validFiles = (files as Array<{ path?: string; content?: string }>).filter((f) => {
    if (!f.path || typeof f.content !== 'string') {
      skippedCount++;
      return false;
    }

    if (!isValidFilePath(f.path)) {
      skippedCount++;
      return false;
    }

    if (f.content.length > MAX_FILE_SIZE_BYTES) {
      skippedCount++;
      return false;
    }

    validCount++;
    return true;
  }) as FileData[];

  Logger.info(`Local files validated. Valid: ${validCount}, Skipped: ${skippedCount}`);
  return validFiles;
}
