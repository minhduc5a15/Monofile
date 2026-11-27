import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { ConversionSettingsCard } from './components/ConversionSettingsCard';
import { AboutCard } from './components/AboutCard';
import { RepoTreeCard } from './components/RepoTreeCard';
import { ConversionStatusCard, type ConversionPhase } from './components/ConversionStatusCard';
import { PreviewModal } from './components/PreviewModal';
import {
  buildFileTree,
  filterFilesBySettings,
  formatOutputDocument,
  parseGitHubUrl,
  type ConversionSettings,
  type FileWithContent,
  type FormattedOutput,
  type RepoFileEntry,
  type RepoMetadata,
} from './utils/repoLogic';
import {
  SAMPLE_GITIGNORE,
  SAMPLE_REPO_FILES,
  SAMPLE_REPO_METADATA,
} from './data/sampleRepo';
import {
  fetchRepoFilesBatch,
  loadRepositoryFromApiOrDirect,
} from './utils/githubClient';

const DEFAULT_SETTINGS: ConversionSettings = {
  outputFormat: '.txt',
  includeFilePaths: true,
  includeDirectoryStructure: true,
  excludeBinaryFiles: true,
  useGitignore: false,
  customExcludePatterns: '',
};

const MAX_LIVE_FETCH_FILES = 180;

export default function App() {
  const [repoUrl, setRepoUrl] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const [settings, setSettings] = useState<ConversionSettings>(DEFAULT_SETTINGS);
  const [metadata, setMetadata] = useState<RepoMetadata>(SAMPLE_REPO_METADATA);
  const [rawFiles, setRawFiles] = useState<RepoFileEntry[]>(SAMPLE_REPO_FILES);
  const [gitignoreContent, setGitignoreContent] = useState<string>(SAMPLE_GITIGNORE);

  const [isFetchingRepo, setIsFetchingRepo] = useState(false);
  const [isTreeTruncated, setIsTreeTruncated] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(() => new Set(['.github']));
  const [deselectedPaths, setDeselectedPaths] = useState<Set<string>>(() => new Set());

  const [phase, setPhase] = useState<ConversionPhase>('ready');
  const [progressPercent, setProgressPercent] = useState(0);
  const [processedFilesCount, setProcessedFilesCount] = useState(0);
  const [conversionError, setConversionError] = useState<string | null>(null);

  const [cachedFilesContent, setCachedFilesContent] = useState<FileWithContent[] | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const copyTimerRef = useRef<number | null>(null);

  // Filtered files according to current Conversion Settings
  const filteredFiles = useMemo(
    () => filterFilesBySettings(rawFiles, settings, gitignoreContent),
    [rawFiles, settings, gitignoreContent]
  );

  // Build hierarchical file tree
  const fileTree = useMemo(() => buildFileTree(filteredFiles), [filteredFiles]);

  // Currently selected files (filtered minus manually unchecked)
  const selectedFiles = useMemo(
    () => filteredFiles.filter((f) => !deselectedPaths.has(f.path)),
    [filteredFiles, deselectedPaths]
  );

  const selectedPathsSet = useMemo(
    () => new Set(selectedFiles.map((f) => f.path)),
    [selectedFiles]
  );

  const selectedSizeBytes = useMemo(
    () => selectedFiles.reduce((acc, f) => acc + f.size, 0),
    [selectedFiles]
  );

  const estimatedLines = useMemo(() => {
    if (cachedFilesContent && phase === 'completed') {
      return cachedFilesContent.reduce((sum, f) => sum + f.content.split('\n').length, 0);
    }
    return Math.max(selectedFiles.length, Math.round(selectedSizeBytes / 34));
  }, [cachedFilesContent, phase, selectedFiles.length, selectedSizeBytes]);

  // Formatted output computed when conversion completes (updates live if settings change!)
  const formattedOutput: FormattedOutput | null = useMemo(() => {
    if (!cachedFilesContent || phase !== 'completed') return null;
    const activeFiles = cachedFilesContent.filter((f) => selectedPathsSet.has(f.path));
    return formatOutputDocument(metadata, activeFiles, settings);
  }, [cachedFilesContent, phase, selectedPathsSet, metadata, settings]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
    };
  }, []);

  const handleToggleExpand = useCallback((folderPath: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderPath)) next.delete(folderPath);
      else next.add(folderPath);
      return next;
    });
  }, []);

  const handleTogglePaths = useCallback((paths: string[], nextChecked: boolean) => {
    setDeselectedPaths((prev) => {
      const next = new Set(prev);
      for (const p of paths) {
        if (nextChecked) next.delete(p);
        else next.add(p);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setDeselectedPaths(new Set());
  }, []);

  const handleClearAll = useCallback(() => {
    setDeselectedPaths(new Set(filteredFiles.map((f) => f.path)));
  }, [filteredFiles]);

  const runConversion = useCallback(
    async (
      targetMeta: RepoMetadata,
      filesToConvert: RepoFileEntry[],
      signal: AbortSignal
    ) => {
      if (filesToConvert.length === 0) {
        setPhase('error');
        setConversionError('Select at least one file in the repository tree to export.');
        return;
      }

      setPhase('converting');
      setConversionError(null);
      setProgressPercent(4);
      setProcessedFilesCount(0);

      try {
        const collected: FileWithContent[] = [];

        if (targetMeta.isDemo) {
          // Process built-in sample files smoothly in small chunks so progress & cancel work genuinely
          const chunkSize = 4;
          for (let i = 0; i < filesToConvert.length; i += chunkSize) {
            if (signal.aborted) return;
            const chunk = filesToConvert.slice(i, i + chunkSize);
            for (const entry of chunk) {
              collected.push({
                path: entry.path,
                content:
                  entry.content ??
                  `// Sample placeholder content for ${entry.path}\nexport const filePath = ${JSON.stringify(entry.path)};`,
                size: entry.size,
              });
            }
            const done = Math.min(i + chunk.length, filesToConvert.length);
            setProcessedFilesCount(done);
            setProgressPercent(Math.round((done / filesToConvert.length) * 100));
            await new Promise((r) => setTimeout(r, 90));
          }
        } else {
          const capped = filesToConvert.slice(0, MAX_LIVE_FETCH_FILES);
          const batchSize = 25;

          for (let i = 0; i < capped.length; i += batchSize) {
            if (signal.aborted) return;
            const batch = capped.slice(i, i + batchSize);
            const batchFiles = await fetchRepoFilesBatch(
              targetMeta.owner,
              targetMeta.name,
              targetMeta.branch,
              batch.map((b) => b.path),
              signal
            );
            collected.push(...batchFiles);

            const done = Math.min(i + batch.length, capped.length);
            setProcessedFilesCount(done);
            setProgressPercent(Math.round((done / capped.length) * 100));
          }
        }

        if (signal.aborted) return;
        setCachedFilesContent(collected);
        setProcessedFilesCount(collected.length);
        setProgressPercent(100);
        setPhase('completed');
      } catch (err) {
        if (signal.aborted) return;
        setPhase('error');
        setConversionError(
          err instanceof Error ? err.message : 'An unexpected error occurred during conversion.'
        );
      }
    },
    []
  );

  const loadSampleWorkspace = useCallback(
    (autoConvert: boolean) => {
      abortRef.current?.abort();
      setValidationError(null);
      setMetadata(SAMPLE_REPO_METADATA);
      setRawFiles(SAMPLE_REPO_FILES);
      setGitignoreContent(SAMPLE_GITIGNORE);
      setIsTreeTruncated(false);
      setExpandedFolders(new Set(['.github']));
      setDeselectedPaths(new Set());
      setCachedFilesContent(null);
      setPhase('ready');
      setProgressPercent(0);
      setProcessedFilesCount(0);

      if (autoConvert) {
        const controller = new AbortController();
        abortRef.current = controller;
        const filtered = filterFilesBySettings(SAMPLE_REPO_FILES, settings, SAMPLE_GITIGNORE);
        void runConversion(SAMPLE_REPO_METADATA, filtered, controller.signal);
      }
    },
    [runConversion, settings]
  );

  const fetchAndLoadRepository = useCallback(
    async (urlInput: string, branchOverride?: string, autoConvert = true) => {
      const parsed = parseGitHubUrl(urlInput);
      if (!parsed.ok) {
        setValidationError(parsed.error);
        return;
      }

      // Special fast preview for microsoft/vscode example button when clicked directly
      if (
        !branchOverride &&
        parsed.value.owner.toLowerCase() === 'microsoft' &&
        parsed.value.repo.toLowerCase() === 'vscode' &&
        urlInput.trim() === 'https://github.com/microsoft/vscode'
      ) {
        loadSampleWorkspace(autoConvert);
        return;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setValidationError(null);
      setConversionError(null);
      setIsFetchingRepo(true);
      setCachedFilesContent(null);
      setPhase('ready');

      try {
        const payload = await loadRepositoryFromApiOrDirect(
          urlInput,
          branchOverride,
          controller.signal
        );

        setMetadata(payload.metadata);
        setRawFiles(payload.files);
        setGitignoreContent(payload.gitignore ?? '');
        setIsTreeTruncated(Boolean(payload.truncated));
        setDeselectedPaths(new Set());

        // Auto-expand first top-level folder
        const tree = buildFileTree(
          filterFilesBySettings(payload.files, settings, payload.gitignore ?? '')
        );
        const firstFolder = tree.find((n) => n.type === 'folder');
        setExpandedFolders(firstFolder ? new Set([firstFolder.path]) : new Set());
        setIsFetchingRepo(false);

        if (autoConvert) {
          const filtered = filterFilesBySettings(
            payload.files,
            settings,
            payload.gitignore ?? ''
          );
          await runConversion(payload.metadata, filtered, controller.signal);
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        setIsFetchingRepo(false);
        const msg = err instanceof Error ? err.message : 'Unable to fetch repository.';
        setValidationError(msg);
      }
    },
    [loadSampleWorkspace, runConversion, settings]
  );

  const handleHeroSubmit = (urlOverride?: string) => {
    const targetUrl = urlOverride !== undefined ? urlOverride : repoUrl;
    void fetchAndLoadRepository(targetUrl, undefined, true);
  };

  const handleBranchChange = (nextBranch: string) => {
    if (metadata.isDemo) {
      setMetadata((prev) => ({ ...prev, branch: nextBranch }));
      setPhase('ready');
      setCachedFilesContent(null);
      return;
    }
    const targetUrl = repoUrl.trim() || metadata.htmlUrl;
    void fetchAndLoadRepository(targetUrl, nextBranch, false);
  };

  const handleStartConvertCurrent = () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    void runConversion(metadata, selectedFiles, controller.signal);
  };

  const handleCancelConversion = () => {
    abortRef.current?.abort();
    setPhase('cancelled');
  };

  const exportFilename = `${metadata.owner}-${metadata.name}-${metadata.branch.replace(/\//g, '_')}${settings.outputFormat}`;

  const handleDownload = () => {
    if (!formattedOutput) return;
    const mimeTypes: Record<string, string> = {
      '.txt': 'text/plain;charset=utf-8',
      '.md': 'text/markdown;charset=utf-8',
      '.xml': 'application/xml;charset=utf-8',
      '.json': 'application/json;charset=utf-8',
    };
    const blob = new Blob([formattedOutput.content], {
      type: mimeTypes[settings.outputFormat] ?? 'text/plain;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = exportFilename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleCopy = async () => {
    if (!formattedOutput) return;
    try {
      await navigator.clipboard.writeText(formattedOutput.content);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = formattedOutput.content;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      textarea.remove();
    }
    setCopied(true);
    if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
    copyTimerRef.current = window.setTimeout(() => setCopied(false), 2000);
  };

  const isExportCapped = !metadata.isDemo && selectedFiles.length > MAX_LIVE_FETCH_FILES;

  const displayedTotalFiles = isExportCapped
    ? MAX_LIVE_FETCH_FILES
    : selectedFiles.length;

  const displayedOutputSize =
    formattedOutput && phase === 'completed' ? formattedOutput.byteSize : selectedSizeBytes;

  return (
    <div className="min-h-screen bg-[#0B0B10] text-slate-100 flex flex-col">
      <Navbar onHomeClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} />

      <main className="flex-1 pb-14">
          <HeroSection
            repoUrl={repoUrl}
            onRepoUrlChange={(val) => {
              setRepoUrl(val);
              if (validationError) setValidationError(null);
            }}
            onSubmit={handleHeroSubmit}
            isLoading={isFetchingRepo}
            validationError={validationError}
          />

          {/* Main 2-column workspace matching screenshot */}
          <div className="mx-auto mt-5 max-w-[1220px] px-4 sm:px-6">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-start">
              {/* Left Sidebar: Conversion Settings + About */}
              <div className="space-y-4 lg:col-span-4">
                <ConversionSettingsCard settings={settings} onChange={setSettings} />
                <AboutCard />
              </div>

              {/* Right Panel: File Tree + Conversion Status */}
              <div className="space-y-4 lg:col-span-8">
                <RepoTreeCard
                  metadata={metadata}
                  tree={fileTree}
                  totalFilteredCount={filteredFiles.length}
                  selectedPaths={selectedPathsSet}
                  selectedSizeBytes={selectedSizeBytes}
                  expandedFolders={expandedFolders}
                  onToggleExpand={handleToggleExpand}
                  onTogglePaths={handleTogglePaths}
                  onSelectAll={handleSelectAll}
                  onClearAll={handleClearAll}
                  onBranchChange={handleBranchChange}
                  isFetchingTree={isFetchingRepo}
                />

                <ConversionStatusCard
                  phase={phase}
                  progressPercent={progressPercent}
                  processedFiles={processedFilesCount}
                  totalSelectedFiles={displayedTotalFiles}
                  rawSelectedCount={selectedFiles.length}
                  maxExportFiles={MAX_LIVE_FETCH_FILES}
                  isCapped={isExportCapped}
                  isTreeTruncated={isTreeTruncated}
                  linesOfCode={formattedOutput?.totalLines ?? estimatedLines}
                  outputSizeBytes={displayedOutputSize}
                  outputFormat={settings.outputFormat}
                  errorMessage={conversionError}
                  copied={copied}
                  onStartConvert={handleStartConvertCurrent}
                  onCancel={handleCancelConversion}
                  onDownload={handleDownload}
                  onPreview={() => setIsPreviewOpen(true)}
                  onCopy={handleCopy}
                />
              </div>
            </div>
          </div>
        </main>

      <PreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        output={formattedOutput}
        filename={exportFilename}
        outputFormat={settings.outputFormat}
        copied={copied}
        onCopy={handleCopy}
        onDownload={handleDownload}
      />
    </div>
  );
}
