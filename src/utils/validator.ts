import { Logger } from './logger';

export interface FileData {
  path: string;
  content: string;
}

/**
 * Validates files uploaded from the local system on the server-side.
 * Enforces size limits and allowed extensions.
 */
export function validateLocalFiles(files: any[]): FileData[] {
  const validExtensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.go', '.rs', '.java', '.c', '.cpp', '.h', '.md', '.html', '.css'];
  
  let validCount = 0;
  let skippedCount = 0;

  const validFiles = files.filter((f: any) => {
    if (!f.path || typeof f.content !== 'string') {
      skippedCount++;
      return false;
    }
    
    // Strictly skip anything over 200KB characters on the server
    if (f.content.length > 200 * 1024) {
      skippedCount++;
      return false;
    }
    
    const isValidExt = validExtensions.some(ext => f.path.endsWith(ext));
    if (!isValidExt) {
      skippedCount++;
      return false;
    }

    validCount++;
    return true;
  });

  Logger.info(`Local files validated. Valid: ${validCount}, Skipped: ${skippedCount}`);
  return validFiles;
}
