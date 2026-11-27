import {
  Zap,
  FileText,
  Code2,
  Database,
  X,
  CheckCircle2,
  Download,
  Eye,
  Copy,
  Check,
  AlertTriangle,
  Info,
  Play,
} from 'lucide-react';
import { formatBytes, formatCompactNumber, type OutputFormat } from '../utils/repoLogic';

export type ConversionPhase = 'ready' | 'converting' | 'completed' | 'error' | 'cancelled';

interface ConversionStatusCardProps {
  phase: ConversionPhase;
  progressPercent: number;
  processedFiles: number;
  totalSelectedFiles: number;
  rawSelectedCount: number;
  maxExportFiles: number;
  isCapped: boolean;
  isTreeTruncated?: boolean;
  linesOfCode: number;
  outputSizeBytes: number;
  outputFormat: OutputFormat;
  errorMessage: string | null;
  copied: boolean;
  onStartConvert: () => void;
  onCancel: () => void;
  onDownload: () => void;
  onPreview: () => void;
  onCopy: () => void;
}

export function ConversionStatusCard({
  phase,
  progressPercent,
  processedFiles,
  totalSelectedFiles,
  rawSelectedCount,
  maxExportFiles,
  isCapped,
  isTreeTruncated = false,
  linesOfCode,
  outputSizeBytes,
  outputFormat,
  errorMessage,
  copied,
  onStartConvert,
  onCancel,
  onDownload,
  onPreview,
  onCopy,
}: ConversionStatusCardProps) {
  const clampedProgress = Math.max(0, Math.min(100, Math.round(progressPercent)));

  return (
    <section
      aria-label="Conversion status"
      className="rounded-xl border border-[#242434] bg-[#13131C] p-5"
    >
      {/* Top status bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 min-w-0">
          {phase === 'converting' && (
            <>
              <Zap className="h-4.5 w-4.5 shrink-0 fill-slate-200 text-slate-200" aria-hidden="true" />
              <h2 className="font-display text-base font-semibold text-white truncate">
                Converting Repository...
              </h2>
            </>
          )}
          {phase === 'completed' && (
            <>
              <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-emerald-400" aria-hidden="true" />
              <h2 className="font-display text-base font-semibold text-white truncate">
                Conversion Complete
              </h2>
            </>
          )}
          {phase === 'error' && (
            <>
              <AlertTriangle className="h-4.5 w-4.5 shrink-0 text-rose-400" aria-hidden="true" />
              <h2 className="font-display text-base font-semibold text-white truncate">
                Conversion Failed
              </h2>
            </>
          )}
          {(phase === 'ready' || phase === 'cancelled') && (
            <>
              <Zap className="h-4.5 w-4.5 shrink-0 text-[#A78BFA]" aria-hidden="true" />
              <h2 className="font-display text-base font-semibold text-white truncate">
                {phase === 'cancelled' ? 'Conversion Cancelled' : 'Ready to Export'}
              </h2>
            </>
          )}
        </div>

        <span className="font-mono text-base font-bold tabular-nums text-[#A78BFA] shrink-0">
          {phase === 'completed' ? '100%' : phase === 'converting' ? `${clampedProgress}%` : outputFormat}
        </span>
      </div>

      {/* Progress track */}
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={phase === 'completed' ? 100 : clampedProgress}
        className="mt-3.5 h-2.5 w-full overflow-hidden rounded-full bg-[#222233]"
      >
        <div
          className={`h-full rounded-full transition-all duration-200 ${
            phase === 'error'
              ? 'bg-rose-500'
              : phase === 'completed'
                ? 'bg-gradient-to-r from-[#8B5CF6] to-emerald-400'
                : 'bg-gradient-to-r from-[#7C3AED] via-[#9353F6] to-[#B07CFF]'
          }`}
          style={{
            width: `${phase === 'completed' ? 100 : phase === 'ready' || phase === 'cancelled' ? (totalSelectedFiles > 0 ? 100 : 0) : clampedProgress}%`,
            opacity: phase === 'ready' || phase === 'cancelled' ? 0.3 : 1,
          }}
        />
      </div>

      {phase === 'error' && errorMessage && (
        <p className="mt-3 text-xs text-rose-400">{errorMessage}</p>
      )}

      {/* Metrics + Action controls */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-6 sm:gap-8">
          <div className="flex items-start gap-2.5">
            <FileText className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
            <div>
              <div className="font-mono text-sm font-semibold tabular-nums text-white">
                {phase === 'converting' || phase === 'completed'
                  ? `${processedFiles.toLocaleString()} / ${totalSelectedFiles.toLocaleString()}`
                  : `${totalSelectedFiles.toLocaleString()} selected`}
              </div>
              <div className="text-xs text-slate-400">
                {phase === 'converting' || phase === 'completed' ? 'files processed' : 'files queued'}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <Code2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
            <div>
              <div className="font-mono text-sm font-semibold tabular-nums text-white">
                {phase === 'completed' ? formatCompactNumber(linesOfCode) : `~ ${formatCompactNumber(linesOfCode)}`}
              </div>
              <div className="text-xs text-slate-400">lines of code</div>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <Database className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
            <div>
              <div className="font-mono text-sm font-semibold tabular-nums text-white">
                {phase === 'completed' ? formatBytes(outputSizeBytes) : `~ ${formatBytes(outputSizeBytes)}`}
              </div>
              <div className="text-xs text-slate-400">output size</div>
            </div>
          </div>
        </div>

        {/* Right action buttons */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {phase === 'converting' && (
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#2F2F45] bg-[#181824] px-4 text-sm font-medium text-slate-200 transition-colors hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-white whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
            >
              <X className="h-4 w-4" aria-hidden="true" />
              <span>Cancel</span>
            </button>
          )}

          {(phase === 'ready' || phase === 'cancelled' || phase === 'error') && (
            <button
              type="button"
              onClick={onStartConvert}
              disabled={totalSelectedFiles === 0}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-gradient-to-r from-[#9353F6] to-[#7C3AED] px-4 text-sm font-semibold text-white transition-all hover:from-[#A166FF] hover:to-[#8B4CF6] disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
            >
              <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
              <span>Export {outputFormat}</span>
            </button>
          )}

          {phase === 'completed' && (
            <>
              <button
                type="button"
                onClick={onPreview}
                className="inline-flex h-9.5 items-center gap-1.5 rounded-lg border border-[#2E2E42] bg-[#181824] px-3.5 text-xs font-medium text-slate-200 transition-colors hover:border-[#42425D] hover:text-white whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
              >
                <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Preview</span>
              </button>

              <button
                type="button"
                onClick={onCopy}
                className="inline-flex h-9.5 items-center gap-1.5 rounded-lg border border-[#2E2E42] bg-[#181824] px-3.5 text-xs font-medium text-slate-200 transition-colors hover:border-[#42425D] hover:text-white whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                    <span className="text-emerald-300">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Copy</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onDownload}
                className="inline-flex h-9.5 items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#9353F6] to-[#7C3AED] px-4 text-xs font-semibold text-white transition-all hover:from-[#A166FF] hover:to-[#8B4CF6] whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Download {outputFormat}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {(isCapped || isTreeTruncated) && (
        <div
          role="status"
          className="mt-3.5 flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-200"
        >
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" aria-hidden="true" />
          <p className="leading-relaxed">
            {isCapped && (
              <span>
                Capped at <strong className="font-mono font-semibold">{maxExportFiles.toLocaleString()}</strong> files per export
                {' '}({rawSelectedCount.toLocaleString()} selected). Deselect folders or add exclude patterns to narrow down your export.
              </span>
            )}
            {isCapped && isTreeTruncated && ' '}
            {isTreeTruncated && (
              <span>
                GitHub truncated the full repository tree because it exceeds the API size limit.
              </span>
            )}
          </p>
        </div>
      )}
    </section>
  );
}
