import React, { useState } from 'react';
import { Search, AlertCircle } from 'lucide-react';
import styles from '../app/page.module.css';

interface GithubFormProps {
  githubUrl: string;
  setGithubUrl: (url: string) => void;
  githubToken: string;
  setGithubToken: (token: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

const GITHUB_URL_REGEX = /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+(\.git)?$/;

export function GithubForm({
  githubUrl,
  setGithubUrl,
  githubToken,
  setGithubToken,
  onSubmit,
}: GithubFormProps) {
  const [urlError, setUrlError] = useState<string | null>(null);

  const handleUrlChange = (value: string) => {
    setGithubUrl(value);
    if (value && !GITHUB_URL_REGEX.test(value.trim())) {
      setUrlError('Please enter a valid GitHub repository URL (e.g. https://github.com/user/repo)');
    } else {
      setUrlError(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (urlError || !githubUrl.trim()) return;
    onSubmit(e);
  };

  return (
    <form onSubmit={handleSubmit} className={styles.inputGroup}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label className={styles.label}>Repository URL</label>
          <input
            type="url"
            className={styles.input}
            style={urlError ? { borderColor: 'var(--danger)' } : {}}
            placeholder="https://github.com/username/repository"
            value={githubUrl}
            onChange={(e) => handleUrlChange(e.target.value)}
            required
          />
          {urlError && (
            <p style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--danger)', marginTop: '0.4rem' }}>
              <AlertCircle size={13} />
              {urlError}
            </p>
          )}
        </div>
        <div>
          <label className={styles.label}>GitHub Token (Optional — for private repos or rate limits)</label>
          <input
            type="password"
            className={styles.input}
            placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
            value={githubToken}
            onChange={(e) => setGithubToken(e.target.value)}
          />
          <p style={{ fontSize: '0.75rem', color: '#a1a1aa', marginTop: '0.5rem' }}>
            * Tokens are used server-side only and secured in transit via TLS/HTTPS.
            This is a &quot;Bring Your Own Key&quot; (BYOK) model — we never store your token.
          </p>
        </div>
      </div>
      <button
        type="submit"
        className={styles.button}
        style={{ marginTop: '1rem' }}
        disabled={!!urlError || !githubUrl.trim()}
      >
        <Search size={20} />
        Analyze Repository
      </button>
    </form>
  );
}
