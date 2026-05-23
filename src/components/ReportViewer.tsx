import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { TerminalSquare, Download } from 'lucide-react';
import styles from '../app/page.module.css';
import { MAX_FILES_FOR_ANALYSIS, MAX_FILE_SIZE_BYTES } from '../utils/constants';

interface ReportViewerProps {
  result: string;
  onReset: () => void;
}

export function ReportViewer({ result, onReset }: ReportViewerProps) {
  const downloadReport = () => {
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

  const maxFileSizeKb = Math.round(MAX_FILE_SIZE_BYTES / 1024);

  return (
    <div className={styles.resultsCard}>
      <div className={styles.resultsHeader}>
        <div className={styles.resultsTitle}>
          <TerminalSquare size={24} color="#3b82f6" />
          Analysis Complete
        </div>
        <button className={styles.downloadBtn} onClick={downloadReport}>
          <Download size={16} />
          Download .md
        </button>
      </div>
      <div style={{
        padding: '0 2rem',
        marginTop: '-0.5rem',
        marginBottom: '1rem',
        color: '#a1a1aa',
        fontSize: '0.85rem',
        fontStyle: 'italic',
      }}>
        * To ensure optimal performance, this analysis covers up to{' '}
        <strong style={{ color: '#71717a' }}>{MAX_FILES_FOR_ANALYSIS} files</strong> (each up to{' '}
        <strong style={{ color: '#71717a' }}>{maxFileSizeKb} KB</strong>).
        Extremely large repositories may be partially reviewed.
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
          onClick={onReset}
          style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', boxShadow: 'none' }}
        >
          Analyze Another Repository
        </button>
      </div>
    </div>
  );
}
