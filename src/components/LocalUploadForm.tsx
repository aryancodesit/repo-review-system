import React from 'react';
import { Upload } from 'lucide-react';
import styles from '../app/page.module.css';

interface LocalUploadFormProps {
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function LocalUploadForm({ onUpload }: LocalUploadFormProps) {
  return (
    <div className={styles.inputGroup}>
      <label className={styles.fileUpload}>
        <input 
          type="file" 
          className={styles.fileInput}
          /* Note: webkitdirectory and directory are non-standard but widely supported by 
             modern browsers (Chrome, Edge, Firefox) for native folder selection. 
             We provide 'multiple' as a standard fallback for browsers that don't support it. */
          // @ts-ignore
          webkitdirectory="true"
          directory="true"
          multiple={true}
          onChange={onUpload}
        />
        <Upload className={styles.uploadIcon} />
        <div>
          <h3 style={{ color: '#fff', marginBottom: '0.5rem' }}>Drop your folder here</h3>
          <p style={{ color: '#a1a1aa', fontSize: '0.875rem' }}>Or click to browse from your computer</p>
        </div>
      </label>
    </div>
  );
}
