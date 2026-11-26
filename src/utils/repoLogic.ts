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

export function formatOutputDocument(
  repo: Pick<RepoMetadata, 'owner' | 'name' | 'branch'>,
  files: FileWithContent[],
  settings: ConversionSettings
): FormattedOutput {
  const sortedFiles = [...files].sort((a, b) => a.path.localeCompare(b.path));
  const repoSlug = `${repo.owner}/${repo.name}`;
  const treeText = settings.includeDirectoryStructure
    ? generateAsciiTree(
        sortedFiles.map((f) => f.path),
        repo.name
      )
    : '';

  let content = '';

  if (settings.outputFormat === '.json') {
    const payload: Record<string, unknown> = {
      repository: repoSlug,
      branch: repo.branch,
      fileCount: sortedFiles.length,
    };
    if (settings.includeDirectoryStructure) {
      payload.directoryStructure = treeText;
    }
    payload.files = sortedFiles.map((f) =>
      settings.includeFilePaths ? { path: f.path, content: f.content } : { content: f.content }
    );
    content = JSON.stringify(payload, null, 2);
  } else if (settings.outputFormat === '.xml') {
    const parts: string[] = [
      `<repository name="${escapeXml(repoSlug)}" branch="${escapeXml(repo.branch)}">`,
    ];
    if (settings.includeDirectoryStructure) {
      parts.push(`  <directory_structure>\n${escapeXml(treeText)}\n  </directory_structure>`);
    }
    parts.push('  <files>');
    for (const file of sortedFiles) {
      const pathAttr = settings.includeFilePaths ? ` path="${escapeXml(file.path)}"` : '';
      parts.push(`    <file${pathAttr}>`);
      parts.push(escapeXml(file.content));
      parts.push('    </file>');
    }
    parts.push('  </files>');
    parts.push('</repository>');
    content = parts.join('\n');
  } else if (settings.outputFormat === '.md') {
    const sections: string[] = [
      `# ${repoSlug} (${repo.branch})`,
      '',
      `Exported ${sortedFiles.length} files via Monofile.`,
    ];
    if (settings.includeDirectoryStructure) {
      sections.push('', '## Directory Structure', '', '```text', treeText, '```');
    }
    sections.push('', '## Files');
    for (const file of sortedFiles) {
      if (settings.includeFilePaths) {
        sections.push('', `### \`${file.path}\``);
      }
      const lang = getLanguageHint(file.path);
      sections.push('', `\`\`\`${lang}`, file.content, '```');
    }
    content = sections.join('\n');
  } else {
    // .txt default
    const sections: string[] = [
      '================================================================================',
      `Repository: ${repoSlug} (branch: ${repo.branch})`,
      `Files exported: ${sortedFiles.length}`,
      '================================================================================',
    ];
    if (settings.includeDirectoryStructure) {
      sections.push('', 'DIRECTORY STRUCTURE', '-------------------', treeText);
    }
    for (const file of sortedFiles) {
      sections.push('');
      if (settings.includeFilePaths) {
        sections.push('================================================================================');
        sections.push(`FILE: ${file.path}`);
        sections.push('================================================================================');
      } else {
        sections.push('--------------------------------------------------------------------------------');
      }
      sections.push(file.content);
    }
    content = sections.join('\n');
  }

  const totalLines = content ? content.split('\n').length : 0;
  const byteSize = new TextEncoder().encode(content).length;
  const estimatedTokens = Math.ceil(content.length / 4);

  return {
    content,
    totalLines,
    byteSize,
    fileCount: sortedFiles.length,
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
