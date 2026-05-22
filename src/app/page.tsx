'use client';

import { useState } from 'react';
import { GitBranch, FolderDown, AlertCircle } from 'lucide-react';
import styles from './page.module.css';

import { GithubForm } from '../components/GithubForm';
import { LocalUploadForm } from '../components/LocalUploadForm';
import { ReportViewer } from '../components/ReportViewer';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'github' | 'local'>('github');
  const [githubUrl, setGithubUrl] = useState('');
  const [githubToken, setGithubToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [warning, setWarning] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyzeGithub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!githubUrl) return;
    
    setLoading(true);
    setError(null);
    setWarning(null);
    setResult(null);
    setStatus('Cloning repository...');
    
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'github', url: githubUrl, githubToken })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to analyze repository');
      }
      
      setStatus('Generating report...');
      const data = await response.json();
      setResult(data.report);
    } catch (err: any) {
      setError(err.message);
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
      const validExtensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.go', '.rs', '.java', '.c', '.cpp', '.h', '.md', '.html', '.css'];
      let skippedCount = 0;
      
      const validFiles = Array.from(files).filter(file => {
        const path = file.webkitRelativePath || file.name;
        if (path.includes('node_modules/') || path.includes('.git/') || path.includes('.next/') || path.includes('dist/') || path.includes('build/')) {
          skippedCount++;
          return false;
        }
        
        const isExtensionValid = validExtensions.some(ext => path.endsWith(ext));
        if (!isExtensionValid) {
          skippedCount++;
          return false;
        }
        
        if (file.size > 100 * 1024) {
          skippedCount++;
          return false;
        } 
        
        return true;
      });

      if (skippedCount > 0) {
        setWarning(`Skipped ${skippedCount} file(s) that were unsupported, >100KB, or in excluded folders.`);
      }

      setStatus(`Parsing ${validFiles.length} files...`);
      
      const fileContents = await Promise.all(
        validFiles.slice(0, 50).map(async (file) => {
          const text = await file.text();
          return {
            path: file.webkitRelativePath || file.name,
            content: text
          };
        })
      );

      setStatus('Sending to AI...');
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'local', files: fileContents })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to analyze local folder');
      }
      
      const data = await response.json();
      setResult(data.report);
    } catch (err: any) {
      setError(err.message);
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
                Upload a repository and let our AI agent analyze your codebase, architectures, and patterns to generate a comprehensive, structured markdown review.
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
                <div className={styles.error} style={{ background: 'rgba(234, 179, 8, 0.1)', color: '#facc15', border: '1px solid rgba(234, 179, 8, 0.2)' }}>
                  <AlertCircle size={18} />
                  {warning}
                </div>
              )}
            </div>
          </>
        )}

        {loading && (
          <div className={styles.loadingState}>
            <div className={`${styles.spinner} animate-spin`}></div>
            <div className={`${styles.statusText} animate-pulse-glow`}>
              {status}
            </div>
            {warning && (
              <div style={{ marginTop: '1rem', color: '#facc15', fontSize: '0.875rem' }}>
                {warning}
              </div>
            )}
          </div>
        )}

        {result && !loading && (
          <ReportViewer 
            result={result} 
            onReset={() => {
              setResult(null);
              setGithubUrl('');
            }} 
          />
        )}

      </div>
    </main>
  );
}
