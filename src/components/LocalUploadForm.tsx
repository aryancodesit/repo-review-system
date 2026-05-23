import React, { useState } from 'react';
import { Upload, FileCode } from 'lucide-react';
import styles from '../app/page.module.css';

// Proper type augmentation for non-standard but widely supported folder-picker attributes.
declare module 'react' {
  interface InputHTMLAttributes<T> extends HTMLAttributes<T> {
    webkitdirectory?: string;
    directory?: string;
  }
}

interface LocalUploadFormProps {
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function LocalUploadForm({ onUpload }: LocalUploadFormProps) {
  const [fileCount, setFileCount] = useState<number | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const count = e.target.files?.length ?? 0;
    setFileCount(count > 0 ? count : null);
    onUpload(e);
  };

  return (
    <div className={styles.inputGroup}>
      <label className={styles.fileUpload}>
        <input
          type="file"
          className={styles.fileInput}
          webkitdirectory=""
          directory=""
          multiple={true}
          onChange={handleChange}
        />
        <Upload className={styles.uploadIcon} />
        <div>
          <h3 style={{ color: '#fff', marginBottom: '0.5rem' }}>Drop your folder here</h3>
          <p style={{ color: '#a1a1aa', fontSize: '0.875rem' }}>Or click to browse from your computer</p>
        </div>
      </label>

      {fileCount !== null && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.75rem 1rem',
          background: 'rgba(59, 130, 246, 0.08)',
          border: '1px solid rgba(59, 130, 246, 0.2)',
          borderRadius: '8px',
          color: '#93c5fd',
          fontSize: '0.875rem',
        }}>
          <FileCode size={16} />
          <span>
            <strong>{fileCount}</strong> file{fileCount !== 1 ? 's' : ''} detected — valid source files will be filtered and analyzed.
          </span>
        </div>
      )}
    </div>
  );
}
