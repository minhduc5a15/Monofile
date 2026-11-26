export type OutputFormat = '.txt' | '.md' | '.xml' | '.json';

export interface ConversionSettings {
  outputFormat: OutputFormat;
  includeFilePaths: boolean;
  includeDirectoryStructure: boolean;
  excludeBinaryFiles: boolean;
  useGitignore: boolean;
  customExcludePatterns: string;
}

export interface RepoFileEntry {
  path: string;
  size: number;
  sha?: string;
  content?: string;
}

export interface RepoMetadata {
  owner: string;
  name: string;
  branch: string;
  branches: string[];
  isPrivate: boolean;
  description?: string;
  htmlUrl: string;
  stars?: number;
  isDemo?: boolean;
}

export interface FileTreeNode {
  id: string;
  name: string;
  path: string;
  type: 'folder' | 'file';
  size: number;
  children: FileTreeNode[];
  isBinary: boolean;
}

export interface ParsedGitHubUrl {
  owner: string;
  repo: string;
  branch?: string;
}

export interface FileWithContent {
  path: string;
  content: string;
  size: number;
}

export interface FormattedOutput {
  content: string;
  totalLines: number;
  byteSize: number;
  fileCount: number;
  estimatedTokens: number;
}

const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.ico', '.tiff', '.avif',
  '.mp3', '.wav', '.ogg', '.flac', '.aac', '.m4a',
  '.mp4', '.webm', '.mov', '.avi', '.mkv', '.flv',
  '.zip', '.tar', '.gz', '.bz2', '.xz', '.7z', '.rar',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.woff', '.woff2', '.ttf', '.otf', '.eot',
  '.exe', '.dll', '.so', '.dylib', '.bin', '.dat', '.wasm', '.pyc', '.class',
  '.o', '.a', '.lib', '.sqlite', '.db', '.psd', '.ai', '.sketch', '.fig',
  '.jar', '.apk', '.ipa', '.dmg', '.iso',
]);

export function parseGitHubUrl(rawInput: string): { ok: true; value: ParsedGitHubUrl } | { ok: false; error: string } {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    return { ok: false, error: 'Please enter a GitHub repository URL or owner/repo.' };
  }

  // Allow shorthand "owner/repo"
  if (/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(trimmed)) {
    const [owner, repo] = trimmed.split('/');
    return {
      ok: true,
      value: {
        owner,
        repo: repo.replace(/\.git$/i, ''),
      },
    };
  }

  let normalized = trimmed;
  if (!/^https?:\/\//i.test(normalized)) {
    if (/^github\.com\//i.test(normalized)) {
      normalized = `https://${normalized}`;
    } else {
      return { ok: false, error: 'Enter a valid GitHub URL like https://github.com/owner/repo' };
    }
  }

  try {
    const url = new URL(normalized);
    if (!/^(www\.)?github\.com$/i.test(url.hostname)) {
      return { ok: false, error: 'Only public github.com repository URLs are supported.' };
    }
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length < 2) {
      return { ok: false, error: 'URL must include both repository owner and name (e.g. /owner/repo).' };
    }
    const owner = parts[0];
    const repo = parts[1].replace(/\.git$/i, '');
    if (!owner || !repo) {
      return { ok: false, error: 'URL must include both repository owner and name.' };
    }
    let branch: string | undefined;
    if (parts[2] === 'tree' && parts[3]) {
      branch = parts.slice(3).join('/');
    }
    return { ok: true, value: { owner, repo, branch } };
  } catch {
    return { ok: false, error: 'Enter a valid GitHub URL like https://github.com/owner/repo' };
  }
}

export function isBinaryFile(filePath: string): boolean {
  const lower = filePath.toLowerCase();
  const lastSlash = lower.lastIndexOf('/');
  const filename = lastSlash >= 0 ? lower.slice(lastSlash + 1) : lower;
  const dotIdx = filename.lastIndexOf('.');
  if (dotIdx <= 0) {
    return false;
  }
  const ext = filename.slice(dotIdx);
  return BINARY_EXTENSIONS.has(ext);
}

function globToRegExp(glob: string): RegExp {
  let pattern = glob.trim();
  // Remove leading slash
  if (pattern.startsWith('/')) {
    pattern = pattern.slice(1);
  }
  // Directory suffix: "node_modules/" -> matches anything inside
  const isDirOnly = pattern.endsWith('/');
  if (isDirOnly) {
    pattern = `${pattern}**`;
  }

  // If pattern doesn't contain a slash, match against basename or any segment
  const hasSlash = pattern.includes('/');

  let regexStr = '';
  for (let i = 0; i < pattern.length; i++) {
    const char = pattern[i];
    if (char === '*') {
      if (pattern[i + 1] === '*') {
        if (pattern[i + 2] === '/') {
          regexStr += '(?:.*/)?';
          i += 2;
        } else {
          regexStr += '.*';
          i += 1;
        }
      } else {
        regexStr += '[^/]*';
      }
    } else if (char === '?') {
      regexStr += '[^/]';
    } else if (/[.+^${}()|[\]\\]/.test(char)) {
      regexStr += `\\${char}`;
    } else {
      regexStr += char;
    }
  }

  if (!hasSlash) {
    return new RegExp(`(^|/)${regexStr}(/.*)?$`, 'i');
  }
  return new RegExp(`^${regexStr}(/.*)?$`, 'i');
}

export function parsePatternList(rawPatterns: string): string[] {
  return rawPatterns
    .split(/[\n,]+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));
}

export function parseGitignore(gitignoreText: string): string[] {
  return gitignoreText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));
}

export function matchesAnyExcludePattern(filePath: string, patterns: string[]): boolean {
  let excluded = false;
  const normalizedPath = filePath.replace(/^\/+/, '');
  for (const rawPattern of patterns) {
    const isNegation = rawPattern.startsWith('!');
    const pattern = isNegation ? rawPattern.slice(1).trim() : rawPattern.trim();
    if (!pattern) continue;
    const regex = globToRegExp(pattern);
    if (regex.test(normalizedPath)) {
      excluded = !isNegation;
    }
  }
  return excluded;
}

export function filterFilesBySettings(
  files: RepoFileEntry[],
  settings: ConversionSettings,
  gitignoreContent = ''
): RepoFileEntry[] {
  const customPatterns = parsePatternList(settings.customExcludePatterns);
  const gitignorePatterns = settings.useGitignore ? parseGitignore(gitignoreContent) : [];

  return files.filter((file) => {
    if (settings.excludeBinaryFiles && isBinaryFile(file.path)) {
      return false;
    }
    if (gitignorePatterns.length > 0 && matchesAnyExcludePattern(file.path, gitignorePatterns)) {
      return false;
    }
    if (customPatterns.length > 0 && matchesAnyExcludePattern(file.path, customPatterns)) {
      return false;
    }
    return true;
  });
}

export function buildFileTree(files: RepoFileEntry[]): FileTreeNode[] {
  const root: FileTreeNode[] = [];
  const folderMap = new Map<string, FileTreeNode>();

  for (const file of files) {
    const parts = file.path.split('/').filter(Boolean);
    let currentLevel = root;
    let currentPath = '';

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      const isLast = i === parts.length - 1;

      if (isLast) {
        currentLevel.push({
          id: currentPath,
          name: part,
          path: currentPath,
          type: 'file',
          size: file.size,
          children: [],
          isBinary: isBinaryFile(currentPath),
        });
      } else {
        let folder = folderMap.get(currentPath);
        if (!folder) {
          folder = {
            id: currentPath,
            name: part,
            path: currentPath,
            type: 'folder',
            size: 0,
            children: [],
            isBinary: false,
          };
          folderMap.set(currentPath, folder);
          currentLevel.push(folder);
        }
        currentLevel = folder.children;
      }
    }
  }

  const sortAndComputeSize = (nodes: FileTreeNode[]): number => {
    let total = 0;
    nodes.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'folder' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
    for (const node of nodes) {
      if (node.type === 'folder') {
        node.size = sortAndComputeSize(node.children);
      }
      total += node.size;
    }
    return total;
  };

  sortAndComputeSize(root);
  return root;
}

export function collectDescendantFilePaths(node: FileTreeNode): string[] {
  if (node.type === 'file') {
    return [node.path];
  }
  const paths: string[] = [];
  for (const child of node.children) {
    paths.push(...collectDescendantFilePaths(child));
  }
  return paths;
}

export function generateAsciiTree(paths: string[], repoName: string): string {
  const entries = paths.map((p) => ({ path: p, size: 0 }));
  const tree = buildFileTree(entries);
  const lines: string[] = [`${repoName}/`];

  const walk = (nodes: FileTreeNode[], prefix: string) => {
    nodes.forEach((node, idx) => {
      const isLast = idx === nodes.length - 1;
      const connector = isLast ? '└── ' : '├── ';
      const suffix = node.type === 'folder' ? '/' : '';
      lines.push(`${prefix}${connector}${node.name}${suffix}`);
      if (node.type === 'folder' && node.children.length > 0) {
        const nextPrefix = prefix + (isLast ? '    ' : '│   ');
        walk(node.children, nextPrefix);
      }
    });
  };

  walk(tree, '');
  return lines.join('\n');
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function getLanguageHint(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    ts: 'typescript',
    tsx: 'tsx',
    js: 'javascript',
    jsx: 'jsx',
    json: 'json',
    md: 'markdown',
    css: 'css',
    html: 'html',
    yml: 'yaml',
    yaml: 'yaml',
    py: 'python',
    rs: 'rust',
    go: 'go',
    sh: 'bash',
  };
  return map[ext] ?? '';
}

function countFileLines(content: string): number {
  if (!content) return 0;
  return content.split(/\r?\n/).length;
}

function formatLineLabel(lines: number): string {
  return `${lines.toLocaleString('en-US')} ${lines === 1 ? 'line' : 'lines'}`;
}

function getSafeTxtDivider(files: FileWithContent[]): string {
  const base = '='.repeat(80);
  const allContent = files.map((f) => f.content).join('\n');
  if (!allContent.includes(base) && !allContent.includes('END OF FILE [')) {
    return base;
  }
  let attempt = 1;
  let candidate = `${base} [MONOFILE-BOUNDARY]`;
  while (allContent.includes(candidate)) {
    attempt += 1;
    candidate = `${base} [MONOFILE-BOUNDARY-${attempt}]`;
  }
  return candidate;
}

function getSafeMarkdownFence(content: string): string {
  const matches = content.match(/`+/g);
  let maxLen = 2;
  if (matches) {
    for (const run of matches) {
      if (run.length > maxLen) {
        maxLen = run.length;
      }
    }
  }
  return '`'.repeat(maxLen + 1);
}

export function formatOutputDocument(
  repo: Pick<RepoMetadata, 'owner' | 'name' | 'branch'>,
  files: FileWithContent[],
  settings: ConversionSettings
): FormattedOutput {
  const sortedFiles = [...files].sort((a, b) => a.path.localeCompare(b.path));
  const totalFiles = sortedFiles.length;
  const repoSlug = `${repo.owner}/${repo.name}`;
  const treeText = settings.includeDirectoryStructure
    ? generateAsciiTree(
        sortedFiles.map((f) => f.path),
        repo.name
      )
    : '';
  const encoder = new TextEncoder();

  const fileMetrics = sortedFiles.map((f, idx) => {
    const lines = countFileLines(f.content);
    const bytes = f.size > 0 ? f.size : encoder.encode(f.content).length;
    return {
      file: f,
      index: idx + 1,
      total: totalFiles,
      lines,
      bytes,
      sizeLabel: formatBytes(bytes),
      lineLabel: formatLineLabel(lines),
    };
  });

  let content = '';

  if (settings.outputFormat === '.json') {
    const payload: Record<string, unknown> = {
      repository: repoSlug,
      branch: repo.branch,
      fileCount: totalFiles,
    };
    if (settings.includeDirectoryStructure) {
      payload.directoryStructure = treeText;
    }
    payload.files = fileMetrics.map((m) =>
      settings.includeFilePaths
        ? {
            index: m.index,
            total: m.total,
            path: m.file.path,
            lines: m.lines,
            size: m.bytes,
            sizeFormatted: m.sizeLabel,
            content: m.file.content,
          }
        : {
            index: m.index,
            total: m.total,
            lines: m.lines,
            size: m.bytes,
            sizeFormatted: m.sizeLabel,
            content: m.file.content,
          }
    );
    content = JSON.stringify(payload, null, 2);
  } else if (settings.outputFormat === '.xml') {
    const parts: string[] = [
      `<repository name="${escapeXml(repoSlug)}" branch="${escapeXml(repo.branch)}" fileCount="${totalFiles}">`,
    ];
    if (settings.includeDirectoryStructure) {
      parts.push(`  <directory_structure>\n${escapeXml(treeText)}\n  </directory_structure>`);
    }
    parts.push('  <files>');
    for (const m of fileMetrics) {
      const pathAttr = settings.includeFilePaths ? ` path="${escapeXml(m.file.path)}"` : '';
      parts.push(
        `    <file index="${m.index}" total="${m.total}"${pathAttr} lines="${m.lines}" size="${m.bytes}" sizeFormatted="${escapeXml(m.sizeLabel)}">`
      );
      parts.push(escapeXml(m.file.content));
      parts.push('    </file>');
    }
    parts.push('  </files>');
    parts.push('</repository>');
    content = parts.join('\n');
  } else if (settings.outputFormat === '.md') {
    const sections: string[] = [
      `# ${repoSlug} (${repo.branch})`,
      '',
      `Exported ${totalFiles} files via Monofile.`,
    ];
    if (settings.includeDirectoryStructure) {
      const treeFence = getSafeMarkdownFence(treeText);
      sections.push('', '## Directory Structure', '', `${treeFence}text`, treeText, treeFence);
    }
    sections.push('', '## Files');
    for (const m of fileMetrics) {
      const headerLabel = settings.includeFilePaths
        ? `### [${m.index}/${m.total}] \`${m.file.path}\` (${m.lineLabel}, ${m.sizeLabel})`
        : `### [${m.index}/${m.total}] (${m.lineLabel}, ${m.sizeLabel})`;
      const lang = getLanguageHint(m.file.path);
      const fence = getSafeMarkdownFence(m.file.content);
      sections.push('', headerLabel, '', `${fence}${lang}`, m.file.content, fence);
    }
    content = sections.join('\n');
  } else {
    // .txt default with numbered headers, line/size metadata, closing boundaries, and collision-safe dividers
    const divider = getSafeTxtDivider(sortedFiles);
    const sections: string[] = [
      divider,
      `Repository: ${repoSlug} (branch: ${repo.branch})`,
      `Files exported: ${totalFiles}`,
      divider,
    ];
    if (settings.includeDirectoryStructure) {
      sections.push('', 'DIRECTORY STRUCTURE', '-------------------', treeText);
    }
    for (const m of fileMetrics) {
      const startHeader = settings.includeFilePaths
        ? `[${m.index}/${m.total}] FILE: ${m.file.path} (${m.lineLabel}, ${m.sizeLabel})`
        : `[${m.index}/${m.total}] (${m.lineLabel}, ${m.sizeLabel})`;
      const endFooter = settings.includeFilePaths
        ? `END OF FILE [${m.index}/${m.total}]: ${m.file.path}`
        : `END OF FILE [${m.index}/${m.total}]`;

      sections.push('');
      sections.push(divider);
      sections.push(startHeader);
      sections.push(divider);
      sections.push(m.file.content);
      sections.push(divider);
      sections.push(endFooter);
      sections.push(divider);
    }
    content = sections.join('\n');
  }

  const totalLines = content ? content.split('\n').length : 0;
  const byteSize = encoder.encode(content).length;
  const estimatedTokens = Math.ceil(content.length / 4);

  return {
    content,
    totalLines,
    byteSize,
    fileCount: totalFiles,
    estimatedTokens,
  };
}

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function formatCompactNumber(num: number): string {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`;
  }
  if (num >= 10_000) {
    return `${(num / 1_000).toFixed(1)}K`;
  }
  return num.toLocaleString('en-US');
}
