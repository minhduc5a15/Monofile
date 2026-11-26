import { parseGitHubUrl, type FileWithContent, type RepoFileEntry, type RepoMetadata } from './repoLogic';

export interface LoadedRepoPayload {
  metadata: RepoMetadata;
  files: RepoFileEntry[];
  gitignore: string;
  truncated?: boolean;
}

async function tryParseJson<T>(res: Response): Promise<{ ok: true; data: T } | { ok: false }> {
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('application/json')) {
    return { ok: false };
  }
  try {
    const data = (await res.json()) as T;
    return { ok: true, data };
  } catch {
    return { ok: false };
  }
}

async function fetchDirectFromGitHub(
  urlInput: string,
  branchOverride: string | undefined,
  signal: AbortSignal
): Promise<LoadedRepoPayload> {
  const parsed = parseGitHubUrl(urlInput);
  if (!parsed.ok) {
    throw new Error(parsed.error);
  }

  const { owner, repo, branch: urlBranch } = parsed.value;
  const headers = { Accept: 'application/vnd.github+json' };

  const repoRes = await fetch(
    `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
    { headers, signal }
  );

  if (!repoRes.ok) {
    if (repoRes.status === 404) {
      throw new Error('Repository not found on GitHub (or it may be private).');
    }
    if (repoRes.status === 403 || repoRes.status === 429) {
      throw new Error('GitHub API rate limit reached. Please wait a moment and try again.');
    }
    throw new Error(`GitHub API returned status ${repoRes.status}.`);
  }

  const repoData = (await repoRes.json()) as {
    name: string;
    private: boolean;
    description: string | null;
    html_url: string;
    default_branch: string;
    stargazers_count: number;
    owner: { login: string };
  };

  const activeBranch = branchOverride || urlBranch || repoData.default_branch || 'main';

  const [branchesRes, treeRes] = await Promise.all([
    fetch(
      `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/branches?per_page=30`,
      { headers, signal }
    ),
    fetch(
      `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${encodeURIComponent(activeBranch)}?recursive=1`,
      { headers, signal }
    ),
  ]);

  if (!treeRes.ok) {
    if (treeRes.status === 404) {
      throw new Error(`Branch "${activeBranch}" was not found in ${owner}/${repo}.`);
    }
    if (treeRes.status === 403 || treeRes.status === 429) {
      throw new Error('GitHub API rate limit reached. Please wait a moment and try again.');
    }
    throw new Error(`Could not load repository file tree (status ${treeRes.status}).`);
  }

  const branchesJson = branchesRes.ok
    ? ((await branchesRes.json()) as Array<{ name: string }>)
    : [];
  const branches = branchesJson.map((b) => b.name);
  if (!branches.includes(activeBranch)) {
    branches.unshift(activeBranch);
  }

  const treeJson = (await treeRes.json()) as {
    truncated: boolean;
    tree: Array<{ path: string; type: string; size?: number; sha: string }>;
  };

  const files: RepoFileEntry[] = treeJson.tree
    .filter((item) => item.type === 'blob')
    .map((item) => ({
      path: item.path,
      size: item.size ?? 0,
      sha: item.sha,
    }));

  let gitignore = '';
  if (files.some((f) => f.path === '.gitignore')) {
    try {
      const giRes = await fetch(
        `https://raw.githubusercontent.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${encodeURIComponent(activeBranch)}/.gitignore`,
        { signal }
      );
      if (giRes.ok) {
        gitignore = await giRes.text();
      }
    } catch {
      // Ignore optional .gitignore failure
    }
  }

  return {
    metadata: {
      owner: repoData.owner.login,
      name: repoData.name,
      branch: activeBranch,
      branches,
      isPrivate: repoData.private,
      description: repoData.description ?? undefined,
      htmlUrl: repoData.html_url,
      stars: repoData.stargazers_count,
      isDemo: false,
    },
    files,
    gitignore,
    truncated: treeJson.truncated,
  };
}

export async function loadRepositoryFromApiOrDirect(
  urlInput: string,
  branchOverride: string | undefined,
  signal: AbortSignal
): Promise<LoadedRepoPayload> {
  const params = new URLSearchParams({ url: urlInput.trim() });
  if (branchOverride) params.set('branch', branchOverride);

  try {
    const res = await fetch(`/api/github/repo?${params.toString()}`, { signal });
    const parsedJson = await tryParseJson<LoadedRepoPayload & { error?: string }>(res);

    if (parsedJson.ok) {
      if (!res.ok || !parsedJson.data.metadata || !parsedJson.data.files) {
        throw new Error(parsedJson.data.error || 'Could not load repository from GitHub.');
      }
      return parsedJson.data;
    }
    // Non-JSON response (e.g. Vercel static 404 HTML/text) -> fall back to direct GitHub API
  } catch (err) {
    if (signal.aborted) throw err;
    // If the error came from a parsed JSON backend error response, rethrow it
    if (err instanceof Error && !err.message.includes('Failed to fetch')) {
      throw err;
    }
  }

  return fetchDirectFromGitHub(urlInput, branchOverride, signal);
}

async function fetchFilesDirectFromRaw(
  owner: string,
  repo: string,
  branch: string,
  paths: string[],
  signal: AbortSignal
): Promise<FileWithContent[]> {
  const concurrency = 6;
  const results: FileWithContent[] = [];
  const decoder = new TextDecoder('utf-8');

  for (let i = 0; i < paths.length; i += concurrency) {
    if (signal.aborted) break;
    const chunk = paths.slice(i, i + concurrency);
    const chunkResults = await Promise.all(
      chunk.map(async (filePath) => {
        const encodedPath = filePath
          .split('/')
          .map((seg) => encodeURIComponent(seg))
          .join('/');
        const rawUrl = `https://raw.githubusercontent.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${encodeURIComponent(branch)}/${encodedPath}`;
        try {
          const response = await fetch(rawUrl, { signal });
          if (!response.ok) {
            return { path: filePath, content: '', size: 0 };
          }
          const buffer = await response.arrayBuffer();
          const bytes = new Uint8Array(buffer);
          if (bytes.length > 1_500_000 || bytes.includes(0)) {
            return {
              path: filePath,
              content: `[Skipped binary or oversized file: ${filePath}]`,
              size: bytes.length,
            };
          }
          return {
            path: filePath,
            content: decoder.decode(bytes),
            size: bytes.length,
          };
        } catch (err) {
          if (signal.aborted) throw err;
          return { path: filePath, content: '', size: 0 };
        }
      })
    );
    results.push(...chunkResults);
  }

  return results;
}

export async function fetchRepoFilesBatch(
  owner: string,
  repo: string,
  branch: string,
  paths: string[],
  signal: AbortSignal
): Promise<FileWithContent[]> {
  try {
    const res = await fetch('/api/github/files', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ owner, repo, branch, paths }),
      signal,
    });
    const parsedJson = await tryParseJson<{ files?: FileWithContent[]; error?: string }>(res);
    if (parsedJson.ok) {
      if (!res.ok || !parsedJson.data.files) {
        throw new Error(parsedJson.data.error || 'Failed to download repository files.');
      }
      return parsedJson.data.files;
    }
    // Non-JSON response (static hosting / missing API route) -> fall back to direct raw GitHub fetch
  } catch (err) {
    if (signal.aborted) throw err;
    if (err instanceof Error && !err.message.includes('Failed to fetch')) {
      throw err;
    }
  }

  return fetchFilesDirectFromRaw(owner, repo, branch, paths, signal);
}
