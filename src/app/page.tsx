'use client';

import { useState } from 'react';
import { GitBranch, FolderDown, AlertCircle } from 'lucide-react';
import styles from './page.module.css';

import { GithubForm } from '../components/GithubForm';
import { LocalUploadForm } from '../components/LocalUploadForm';
import dynamic from 'next/dynamic';
import { isValidFilePath, MAX_FILE_SIZE_BYTES } from '../utils/validator';
import { MAX_FILES_FOR_ANALYSIS } from '../utils/constants';
import { reportClientError } from '../utils/reportError';

const ReportViewer = dynamic(
  () => import('../components/ReportViewer').then((mod) => mod.ReportViewer),
  {
    loading: () => <div className={styles.loadingState}>Loading Markdown Viewer...</div>,
    ssr: false,
  },
);

interface UploadedFileData {
  path: string;
  content: string;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<'github' | 'local'>('github');
  const [githubUrl, setGithubUrl] = useState('');
  const [githubToken, setGithubToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [warning, setWarning] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /** Streams the AI response from the given fetch Response into `result` state. */
  async function streamResponse(response: Response) {
    const reader = response.body?.getReader();
    if (!reader) throw new Error('Stream not available');

    const decoder = new TextDecoder();
    let streamedResult = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      streamedResult += decoder.decode(value, { stream: true });
      setResult(streamedResult);
    }
  }

  /** Reads the error body from a non-ok Response. */
  async function extractErrorMessage(response: Response, fallback: string): Promise<string> {
    try {
      const data = await response.json();
      return data.error || fallback;
    } catch {
      const text = await response.text();
      return text || fallback;
    }
  }

  const handleAnalyzeGithub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!githubUrl) return;

    setLoading(true);
    setError(null);
    setWarning(null);
    setResult(null);
    setStatus('Connecting to GitHub...');

    try {
      setStatus('Fetching repository tree...');
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'github', url: githubUrl, githubToken }),
      });

      if (!response.ok) {
        throw new Error(await extractErrorMessage(response, 'Failed to analyze repository'));
      }

      setStatus('Downloading file contents...');
      // Brief pause so the status is visible before streaming takes over
      await new Promise((r) => setTimeout(r, 400));
      setStatus('Analyzing code with AI...');

      await streamResponse(response);
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      reportClientError(error, { component: 'handleAnalyzeGithub', url: githubUrl });
      setError(error.message);
    } finally {
      setLoading(false);
      setStatus('');
    }
  };

  const handleLocalUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setLoading(true);
    setError(null);
    setWarning(null);
    setResult(null);
    setStatus('Reading local files...');

    try {
      let skippedCount = 0;
      const maxFileSizeKb = Math.round(MAX_FILE_SIZE_BYTES / 1024);

      const fileArray: File[] = Array.from(files);
      const validFiles = fileArray.filter((file: File) => {
        const path = file.webkitRelativePath || file.name;

        if (!isValidFilePath(path)) {
          skippedCount++;
          return false;
        }

        if (file.size > MAX_FILE_SIZE_BYTES) {
          skippedCount++;
          return false;
        }

        return true;
      });

      if (skippedCount > 0) {
        setWarning(
          `Skipped ${skippedCount} file(s): unsupported extension, over ${maxFileSizeKb} KB, or in an excluded folder (node_modules, .git, dist, build).`,
        );
      }

      const filesToProcess = validFiles.slice(0, MAX_FILES_FOR_ANALYSIS);
      setStatus(`Parsing ${filesToProcess.length} of ${validFiles.length} valid file(s)...`);

      const fileContents: UploadedFileData[] = await Promise.all(
        filesToProcess.map(async (file: File) => {
          const text = await file.text();
          return {
            path: file.webkitRelativePath || file.name,
            content: text,
          };
        }),
      );

      setStatus('Sending files to AI...');
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'local', files: fileContents }),
      });

      if (!response.ok) {
        throw new Error(await extractErrorMessage(response, 'Failed to analyze local folder'));
      }

      setStatus('Analyzing code with AI...');
      await streamResponse(response);
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      reportClientError(error, { component: 'handleLocalUpload' });
      setError(error.message);
    } finally {
      setLoading(false);
      setStatus('');
      e.target.value = '';
    }
  };

  return (
    <main className={styles.main}>
      <div className={styles.content}>

        {!result && !loading && (
          <>
            <div className={styles.hero}>
              <h1 className={styles.title}>Repo Review System</h1>
              <p className={styles.subtitle}>
                Upload a repository and let our AI agent analyze your codebase, architectures, and
                patterns to generate a comprehensive, structured markdown review.
              </p>
            </div>

            <div className={styles.card}>
              <div className={styles.tabs}>
                <button
                  className={`${styles.tab} ${activeTab === 'github' ? styles.activeTab : ''}`}
                  onClick={() => setActiveTab('github')}
                >
                  <GitBranch size={18} />
                  GitHub URL
                </button>
                <button
                  className={`${styles.tab} ${activeTab === 'local' ? styles.activeTab : ''}`}
                  onClick={() => setActiveTab('local')}
                >
                  <FolderDown size={18} />
                  Local Folder
                </button>
              </div>

              {activeTab === 'github' && (
                <GithubForm
                  githubUrl={githubUrl}
                  setGithubUrl={setGithubUrl}
                  githubToken={githubToken}
                  setGithubToken={setGithubToken}
                  onSubmit={handleAnalyzeGithub}
                />
              )}

              {activeTab === 'local' && (
                <LocalUploadForm onUpload={handleLocalUpload} />
              )}

              {error && (
                <div className={styles.error}>
                  <AlertCircle size={18} />
                  {error}
                </div>
              )}

              {warning && !loading && !error && (
                <div className={styles.warning}>
                  <AlertCircle size={18} />
                  {warning}
                </div>
              )}
            </div>
          </>
        )}

        {loading && !result && (
          <div className={styles.loadingState}>
            <div className={`${styles.spinner} animate-spin`}></div>
            <div className={`${styles.statusText} animate-pulse-glow`}>
              {status}
            </div>
            {warning && (
              <div style={{ marginTop: '1rem', color: '#facc15', fontSize: '0.875rem', textAlign: 'center', maxWidth: '500px' }}>
                {warning}
              </div>
            )}
          </div>
        )}

        {result && (
          <ReportViewer
            result={result}
            onReset={() => {
              setResult(null);
              setGithubUrl('');
              setWarning(null);
              setError(null);
            }}
          />
        )}

      </div>
    </main>
  );
}
