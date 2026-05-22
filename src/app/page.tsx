'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  GitBranch, 
  FolderDown, 
  Upload, 
  Search, 
  TerminalSquare, 
  Download,
  AlertCircle
} from 'lucide-react';
import styles from './page.module.css';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'github' | 'local'>('github');
  const [githubUrl, setGithubUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyzeGithub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!githubUrl) return;
    
    setLoading(true);
    setError(null);
    setResult(null);
    setStatus('Cloning repository...');
    
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'github', url: githubUrl })
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
    setResult(null);
    setStatus('Reading local files...');
    
    try {
      // Filter text files and read them client-side to save bandwidth
      // We'll skip large folders like node_modules, .git, etc.
      const validFiles = Array.from(files).filter(file => {
        const path = file.webkitRelativePath || file.name;
        if (path.includes('node_modules/') || path.includes('.git/')) return false;
        // Simple heuristic: avoid images, binaries, etc based on size or type
        if (file.size > 500 * 1024) return false; // Skip files > 500KB
        return true;
      });

      setStatus(`Parsing ${validFiles.length} files...`);
      
      const fileContents = await Promise.all(
        validFiles.slice(0, 50).map(async (file) => { // limit to 50 files for now
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
      // Reset input
      e.target.value = '';
    }
  };

  const downloadReport = () => {
    if (!result) return;
    const blob = new Blob([result], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'REPO_REVIEW.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
                <form onSubmit={handleAnalyzeGithub} className={styles.inputGroup}>
                  <div>
                    <label className={styles.label}>
                      Repository URL
                    </label>
                    <input 
                      type="url" 
                      className={styles.input}
                      placeholder="https://github.com/username/repository"
                      value={githubUrl}
                      onChange={(e) => setGithubUrl(e.target.value)}
                      required
                    />
                  </div>
                  <button type="submit" className={styles.button}>
                    <Search size={20} />
                    Analyze Repository
                  </button>
                </form>
              )}

              {activeTab === 'local' && (
                <div className={styles.inputGroup}>
                  <label className={styles.fileUpload}>
                    <input 
                      type="file" 
                      className={styles.fileInput}
                      // @ts-ignore
                      webkitdirectory="true"
                      directory="true"
                      onChange={handleLocalUpload}
                    />
                    <Upload className={styles.uploadIcon} />
                    <div>
                      <h3 style={{ color: '#fff', marginBottom: '0.5rem' }}>Drop your folder here</h3>
                      <p style={{ color: '#a1a1aa', fontSize: '0.875rem' }}>Or click to browse from your computer</p>
                    </div>
                  </label>
                </div>
              )}

              {error && (
                <div className={styles.error}>
                  <AlertCircle size={18} />
                  {error}
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
          </div>
        )}

        {result && !loading && (
          <div className={styles.resultsCard}>
            <div className={styles.resultsHeader}>
              <div className={styles.resultsTitle}>
                <TerminalSquare className={styles.accent} size={24} color="#3b82f6" />
                Analysis Complete
              </div>
              <button className={styles.downloadBtn} onClick={downloadReport}>
                <Download size={16} />
                Download .md
              </button>
            </div>
            <div className={styles.resultsContent}>
              <div className="markdown-body">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {result}
                </ReactMarkdown>
              </div>
            </div>
            <div style={{ padding: '0 2rem 2rem' }}>
              <button 
                className={styles.button}
                onClick={() => {
                  setResult(null);
                  setGithubUrl('');
                }}
                style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', boxShadow: 'none' }}
              >
                Analyze Another Repository
              </button>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
