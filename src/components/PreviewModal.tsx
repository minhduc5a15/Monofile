import { useEffect } from 'react';
import { X, Copy, Check, Download, FileText } from 'lucide-react';
import { formatBytes, formatCompactNumber, type FormattedOutput, type OutputFormat } from '../utils/repoLogic';

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  output: FormattedOutput | null;
  filename: string;
  outputFormat: OutputFormat;
  copied: boolean;
  onCopy: () => void;
  onDownload: () => void;
}

export function PreviewModal({
  isOpen,
  onClose,
  output,
  filename,
  outputFormat,
  copied,
  onCopy,
  onDownload,
}: PreviewModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen || !output) return null;

  const maxPreviewChars = 120_000;
  const isTruncated = output.content.length > maxPreviewChars;
  const displayedContent = isTruncated
    ? `${output.content.slice(0, maxPreviewChars)}\n\n... [Preview truncated at 120,000 characters. Download the full ${outputFormat} file to view all contents.]`
    : output.content;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="preview-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
    >
      <div className="flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-[#2C2C40] bg-[#13131C] shadow-2xl">
        {/* Modal Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#222232] px-5 py-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <FileText className="h-4.5 w-4.5 shrink-0 text-[#A78BFA]" aria-hidden="true" />
            <h2 id="preview-modal-title" className="font-mono text-sm font-semibold text-white truncate">
              {filename}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCopy}
              className="inline-flex h-8.5 items-center gap-1.5 rounded-lg border border-[#2E2E42] bg-[#1A1A26] px-3 text-xs font-medium text-slate-200 transition-colors hover:border-[#444460] hover:text-white whitespace-nowrap shrink-0"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                  <span className="text-emerald-300">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Copy All</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onDownload}
              className="inline-flex h-8.5 items-center gap-1.5 rounded-lg bg-[#8B5CF6] px-3.5 text-xs font-semibold text-white transition-colors hover:bg-[#7C3AED] whitespace-nowrap shrink-0"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Download {outputFormat}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close output preview"
              className="flex h-8.5 w-8.5 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
            >
              <X className="h-4.5 w-4.5" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Stats strip */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-b border-[#1E1E2C] bg-[#0F0F16] px-5 py-2.5 font-mono text-xs tabular-nums text-slate-400">
          <span>{output.fileCount.toLocaleString()} files</span>
          <span aria-hidden="true">·</span>
          <span>{output.totalLines.toLocaleString()} lines</span>
          <span aria-hidden="true">·</span>
          <span>{formatBytes(output.byteSize)}</span>
          <span aria-hidden="true">·</span>
          <span>~{formatCompactNumber(output.estimatedTokens)} tokens</span>
        </div>

        {/* Code content */}
        <pre className="flex-1 overflow-auto bg-[#09090E] p-5 font-mono text-xs leading-relaxed text-slate-200 repo-scrollbar">
          {displayedContent}
        </pre>
      </div>
    </div>
  );
}
