import { Logger } from './logger';
import { FileData } from './validator';
import {
  VALID_EXTENSIONS,
  EXCLUDED_PATH_PATTERNS,
  MAX_FILES_FOR_ANALYSIS,
  REPO_CACHE_TTL_MS,
} from './constants';

export interface GithubRepoData {
  files: FileData[];
  homepage: string | null;
}

export class GithubAPIError extends Error {
  public statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'GithubAPIError';
    this.statusCode = statusCode;
  }
}

// In a production environment, if REDIS_URL is present, we would use a distributed cache.
// For single-instance or dev deployments, we fallback to an in-memory map.
const repoCache = new Map<string, { data: GithubRepoData; timestamp: number }>();

/**
 * Fetches repository metadata and codebase tree from GitHub.
 */
export async function fetchGithubRepoFiles(url: string, githubToken?: string): Promise<GithubRepoData> {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) {
    throw new GithubAPIError('Invalid GitHub URL format', 400);
  }

  const owner = match[1];
  const repo = match[2].replace('.git', '');
  const cacheKey = `${owner}/${repo}`;

  // Check Cache
  const cached = repoCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < REPO_CACHE_TTL_MS) {
    Logger.info(`Returning cached data for ${cacheKey}`);
    return cached.data;
  }

  const headers: HeadersInit = {};
  if (githubToken) {
    headers['Authorization'] = `token ${githubToken}`;
  }

  Logger.info(`Fetching repository metadata for ${owner}/${repo}`);
  const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });

  if (repoRes.status === 403 || repoRes.status === 429) {
    throw new GithubAPIError(
      'GitHub API rate limit exceeded. Please provide a GitHub Personal Access Token.',
      429,
    );
  }
  if (!repoRes.ok) {
    throw new GithubAPIError('Could not find repository or you lack permissions.', repoRes.status);
  }

  const repoData = await repoRes.json();
  const branch = repoData.default_branch;
  const homepage = repoData.homepage || null;

  Logger.info(`Fetching git tree for ${owner}/${repo} on branch ${branch}`);
  const treeRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
    { headers },
  );

  if (treeRes.status === 403 || treeRes.status === 429) {
    throw new GithubAPIError('GitHub API rate limit exceeded during tree fetch.', 429);
  }
  if (!treeRes.ok) {
    throw new GithubAPIError('Could not fetch repository tree.', treeRes.status);
  }

  const treeData = await treeRes.json();

  const filesToFetch = treeData.tree
    .filter((file: { type: string }) => file.type === 'blob')
    .filter((file: { path: string }) => VALID_EXTENSIONS.some(ext => file.path.endsWith(ext)))
    .filter((file: { path: string }) => !EXCLUDED_PATH_PATTERNS.some(p => file.path.includes(p)))
    .slice(0, MAX_FILES_FOR_ANALYSIS);

  Logger.info(`Downloading content for ${filesToFetch.length} files...`);

  const fileContents = await Promise.all(
    filesToFetch.map(async (file: { path: string }) => {
      const res = await fetch(
        `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${file.path}`,
        { headers },
      );
      if (!res.ok) {
        Logger.warn(`Failed to fetch file content: ${file.path}`);
        return null;
      }
      const content = await res.text();
      return { path: file.path, content };
    }),
  );

  const validFiles = fileContents.filter((f): f is FileData => f !== null);
  const result: GithubRepoData = { files: validFiles, homepage };

  // Save to Cache
  repoCache.set(cacheKey, { data: result, timestamp: Date.now() });

  Logger.info(`Successfully fetched ${validFiles.length} files from GitHub. Data cached.`);
  return result;
}
