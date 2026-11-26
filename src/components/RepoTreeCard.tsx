import { useMemo, useState } from 'react';
import {
  GitBranch,
  FileCode2,
  Database,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Folder,
  FileText,
  Check,
  Minus,
  Search,
} from 'lucide-react';
import { GitHubMark } from './Navbar';
import {
  collectDescendantFilePaths,
  formatBytes,
  type FileTreeNode,
  type RepoMetadata,
} from '../utils/repoLogic';

interface RepoTreeCardProps {
  metadata: RepoMetadata;
  tree: FileTreeNode[];
  totalFilteredCount: number;
  selectedPaths: Set<string>;
  selectedSizeBytes: number;
  expandedFolders: Set<string>;
  onToggleExpand: (folderPath: string) => void;
  onTogglePaths: (paths: string[], nextChecked: boolean) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  onBranchChange: (branch: string) => void;
  isFetchingTree: boolean;
}

function getFolderSelectionState(
  node: FileTreeNode,
  selectedPaths: Set<string>
): 'checked' | 'indeterminate' | 'unchecked' {
  const descendants = collectDescendantFilePaths(node);
  if (descendants.length === 0) return 'unchecked';
  let selectedCount = 0;
  for (const p of descendants) {
    if (selectedPaths.has(p)) selectedCount++;
  }
  if (selectedCount === 0) return 'unchecked';
  if (selectedCount === descendants.length) return 'checked';
  return 'indeterminate';
}

function filterTreeByQuery(nodes: FileTreeNode[], query: string): FileTreeNode[] {
  if (!query) return nodes;
  const q = query.toLowerCase();
  const result: FileTreeNode[] = [];

  for (const node of nodes) {
    if (node.type === 'file') {
      if (node.path.toLowerCase().includes(q)) {
        result.push(node);
      }
    } else {
      const matchingChildren = filterTreeByQuery(node.children, query);
      if (matchingChildren.length > 0 || node.name.toLowerCase().includes(q)) {
        result.push({
          ...node,
          children: matchingChildren.length > 0 ? matchingChildren : node.children,
        });
      }
    }
  }
  return result;
}

interface TreeRowProps {
  node: FileTreeNode;
  depth: number;
  selectedPaths: Set<string>;
  expandedFolders: Set<string>;
  forceExpand: boolean;
  onToggleExpand: (folderPath: string) => void;
  onTogglePaths: (paths: string[], nextChecked: boolean) => void;
}

function TreeRow({
  node,
  depth,
  selectedPaths,
  expandedFolders,
  forceExpand,
  onToggleExpand,
  onTogglePaths,
}: TreeRowProps) {
  const isFolder = node.type === 'folder';
  const isExpanded = forceExpand || expandedFolders.has(node.path);

  const selectionState = isFolder
    ? getFolderSelectionState(node, selectedPaths)
    : selectedPaths.has(node.path)
      ? 'checked'
      : 'unchecked';

  const handleToggleCheck = () => {
    const targetPaths = isFolder ? collectDescendantFilePaths(node) : [node.path];
    const nextChecked = selectionState !== 'checked';
    onTogglePaths(targetPaths, nextChecked);
  };

  return (
    <div>
      <div
        className="group flex items-center justify-between gap-2 rounded-md py-1 pr-2 text-sm transition-colors hover:bg-white/[0.04]"
        style={{ paddingLeft: `${depth * 20 + 6}px` }}
      >
        <div className="flex min-w-0 items-center gap-2">
          {/* Checkbox */}
          <button
            type="button"
            role="checkbox"
            aria-checked={
              selectionState === 'indeterminate' ? 'mixed' : selectionState === 'checked'
            }
            aria-label={`Toggle ${node.path}`}
            onClick={handleToggleCheck}
            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 ${
              selectionState !== 'unchecked'
                ? 'border-[#8B5CF6] bg-[#8B5CF6] text-white'
                : 'border-[#3E3E56] bg-[#13131C] hover:border-[#5D5D7C]'
            }`}
          >
            {selectionState === 'checked' && <Check className="h-3 w-3 stroke-[3]" />}
            {selectionState === 'indeterminate' && <Minus className="h-3 w-3 stroke-[3]" />}
          </button>

          {/* Expand chevron for folders */}
          {isFolder ? (
            <button
              type="button"
              onClick={() => onToggleExpand(node.path)}
              aria-expanded={isExpanded}
              aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${node.name} folder`}
              className="flex min-w-0 items-center gap-1.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 rounded"
            >
              {isExpanded ? (
                <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
              )}
              <Folder className="h-4 w-4 shrink-0 fill-[#8B5CF6]/80 text-[#A78BFA]" aria-hidden="true" />
              <span className="truncate font-mono text-[13px] font-medium text-slate-200">
                {node.name}/
              </span>
            </button>
          ) : (
            <div className="flex min-w-0 items-center gap-2 pl-5">
              <FileText className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
              <span className="truncate font-mono text-[13px] text-slate-300">{node.name}</span>
            </div>
          )}
        </div>

        <span className="shrink-0 font-mono text-[11px] tabular-nums text-slate-500 opacity-0 transition-opacity group-hover:opacity-100">
          {formatBytes(node.size)}
        </span>
      </div>

      {isFolder && isExpanded && node.children.length > 0 && (
        <div>
          {node.children.map((child) => (
            <TreeRow
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedPaths={selectedPaths}
              expandedFolders={expandedFolders}
              forceExpand={forceExpand}
              onToggleExpand={onToggleExpand}
              onTogglePaths={onTogglePaths}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function RepoTreeCard({
  metadata,
  tree,
  totalFilteredCount,
  selectedPaths,
  selectedSizeBytes,
  expandedFolders,
  onToggleExpand,
  onTogglePaths,
  onSelectAll,
  onClearAll,
  onBranchChange,
  isFetchingTree,
}: RepoTreeCardProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const displayedTree = useMemo(
    () => filterTreeByQuery(tree, searchQuery.trim()),
    [tree, searchQuery]
  );

  return (
    <section
      aria-labelledby="repo-explorer-heading"
      className="rounded-xl border border-[#242434] bg-[#13131C] p-4.5"
    >
      {/* Top header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 min-w-0">
          <GitHubMark className="h-6 w-6 shrink-0 text-slate-200" />
          <h2
            id="repo-explorer-heading"
            className="font-display text-lg font-bold tracking-tight text-white truncate"
          >
            <span className="text-slate-200">{metadata.owner}</span>
            <span className="mx-1.5 text-slate-500">/</span>
            <span className="text-[#60A5FA]">{metadata.name}</span>
          </h2>
          <span className="text-xs font-medium text-slate-400">
            · {metadata.isPrivate ? 'Private' : 'Public'}
            {metadata.isDemo ? ' · Sample preview' : ''}
          </span>
        </div>

        <a
          href={metadata.htmlUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#A78BFA] transition-colors hover:text-[#C4B5FD] whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 rounded"
        >
          <span>View on GitHub</span>
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      </div>

      {/* Sub-metadata + toolbar */}
      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300">
          {/* Branch selector */}
          <div className="relative flex items-center">
            <GitBranch
              className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-slate-400"
              aria-hidden="true"
            />
            <select
              aria-label="Repository branch"
              value={metadata.branch}
              disabled={isFetchingTree}
              onChange={(e) => onBranchChange(e.target.value)}
              className="h-7.5 appearance-none rounded-md border border-[#2B2B3E] bg-[#191926] pl-7 pr-7 font-mono text-xs font-medium text-slate-200 transition-colors hover:border-[#3E3E58] focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/30 disabled:opacity-60"
            >
              {metadata.branches.map((branch) => (
                <option key={branch} value={branch} className="bg-[#13131C]">
                  {branch}
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-2 h-3.5 w-3.5 text-slate-400"
              aria-hidden="true"
            />
          </div>

          <span className="inline-flex items-center gap-1.5 font-mono tabular-nums text-slate-300">
            <FileCode2 className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
            <span>
              {selectedPaths.size.toLocaleString()} / {totalFilteredCount.toLocaleString()} files
            </span>
          </span>

          <span className="inline-flex items-center gap-1.5 font-mono tabular-nums text-slate-300">
            <Database className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
            <span>~ {formatBytes(selectedSizeBytes)}</span>
          </span>
        </div>

        {/* Filter & bulk selection controls */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter files..."
              aria-label="Filter repository files"
              className="h-7.5 w-36 sm:w-44 rounded-md border border-[#272738] bg-[#0B0B10] pl-8 pr-2.5 text-xs text-slate-200 placeholder-slate-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500/40"
            />
          </div>
          <button
            type="button"
            onClick={onSelectAll}
            className="h-7.5 rounded-md border border-[#272738] bg-[#181824] px-2.5 text-xs font-medium text-slate-300 transition-colors hover:border-[#3A3A52] hover:text-white whitespace-nowrap shrink-0"
          >
            All
          </button>
          <button
            type="button"
            onClick={onClearAll}
            className="h-7.5 rounded-md border border-[#272738] bg-[#181824] px-2.5 text-xs font-medium text-slate-300 transition-colors hover:border-[#3A3A52] hover:text-white whitespace-nowrap shrink-0"
          >
            None
          </button>
        </div>
      </div>

      {/* Scrollable tree container */}
      <div
        data-testid="repo-file-tree"
        className="mt-3 h-[238px] overflow-y-auto rounded-lg border border-[#222232] bg-[#0B0B10] p-2.5 repo-scrollbar"
      >
        {isFetchingTree ? (
          <div className="space-y-2.5 p-2" aria-busy="true" aria-label="Loading repository tree">
            {Array.from({ length: 7 }).map((_, idx) => (
              <div
                key={idx}
                className="h-6 animate-pulse rounded bg-[#181824]"
                style={{ width: `${65 + ((idx * 17) % 30)}%` }}
              />
            ))}
          </div>
        ) : displayedTree.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center px-4">
            <p className="text-sm font-medium text-slate-300">No files match the current filters</p>
            <p className="mt-1 text-xs text-slate-500">
              Try clearing the search box or adjusting your exclude patterns.
            </p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {displayedTree.map((node) => (
              <TreeRow
                key={node.id}
                node={node}
                depth={0}
                selectedPaths={selectedPaths}
                expandedFolders={expandedFolders}
                forceExpand={searchQuery.trim().length > 0}
                onToggleExpand={onToggleExpand}
                onTogglePaths={onTogglePaths}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
