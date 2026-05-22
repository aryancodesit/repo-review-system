import React from 'react';
import { Search } from 'lucide-react';
import styles from '../app/page.module.css';

interface GithubFormProps {
  githubUrl: string;
  setGithubUrl: (url: string) => void;
  githubToken: string;
  setGithubToken: (token: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function GithubForm({ githubUrl, setGithubUrl, githubToken, setGithubToken, onSubmit }: GithubFormProps) {
  return (
    <form onSubmit={onSubmit} className={styles.inputGroup}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label className={styles.label}>Repository URL</label>
          <input 
            type="url" 
            className={styles.input}
            placeholder="https://github.com/username/repository"
            value={githubUrl}
            onChange={(e) => setGithubUrl(e.target.value)}
            required
          />
        </div>
        <div>
          <label className={styles.label}>GitHub Token (Optional - for private repos or rate limits)</label>
          <input 
            type="password" 
            className={styles.input}
            placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
            value={githubToken}
            onChange={(e) => setGithubToken(e.target.value)}
          />
          <p style={{ fontSize: '0.75rem', color: '#a1a1aa', marginTop: '0.5rem' }}>
            *Tokens are strictly used server-side and secured in transit via TLS/HTTPS. 
            This is a "Bring Your Own Key" (BYOK) model. We do not store your token.
          </p>
        </div>
      </div>
      <button type="submit" className={styles.button} style={{ marginTop: '1rem' }}>
        <Search size={20} />
        Analyze Repository
      </button>
    </form>
  );
}
