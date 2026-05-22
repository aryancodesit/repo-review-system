import { Logger } from './logger';

export interface FileData {
  path: string;
  content: string;
}

export const VALID_EXTENSIONS = ['.js', '.ts', '.jsx', '.tsx', '.py', '.go', '.rs', '.java', '.c', '.cpp', '.h', '.md', '.html', '.css'];
export const MAX_FILE_SIZE_BYTES = 200 * 1024; // 200KB

export function isValidFilePath(path: string): boolean {
  if (path.includes('node_modules/') || path.includes('.git/') || path.includes('.next/') || path.includes('dist/') || path.includes('build/')) {
    return false;
  }
  return VALID_EXTENSIONS.some(ext => path.endsWith(ext));
}

/**
 * Validates files uploaded from the local system on the server-side.
 * Enforces size limits and allowed extensions.
 */
export function validateLocalFiles(files: any[]): FileData[] {
  let validCount = 0;
  let skippedCount = 0;

  const validFiles = files.filter((f: any) => {
    if (!f.path || typeof f.content !== 'string') {
      skippedCount++;
      return false;
    }
    
    if (!isValidFilePath(f.path)) {
      skippedCount++;
      return false;
    }
    
    // Strictly skip anything over MAX_FILE_SIZE_BYTES characters on the server
    if (f.content.length > MAX_FILE_SIZE_BYTES) {
      skippedCount++;
      return false;
    }

    validCount++;
    return true;
  });

  Logger.info(`Local files validated. Valid: ${validCount}, Skipped: ${skippedCount}`);
  return validFiles;
}
