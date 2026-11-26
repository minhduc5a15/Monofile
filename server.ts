import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { parseGitHubUrl } from './src/utils/repoLogic';

const PORT = 3000;

function githubHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'Repo2TXT-WebApp/1.0',
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  return headers;
}

async function fetchGitHubJson<T>(url: string): Promise<{ ok: true; data: T } | { ok: false; status: number; error: string }> {
  try {
    const res = await fetch(url, { headers: githubHeaders() });
    if (!res.ok) {
      if (res.status === 404) {
        return { ok: false, status: 404, error: 'Repository or branch not found on GitHub.' };
      }
      if (res.status === 403 || res.status === 429) {
        return {
          ok: false,
          status: 429,
          error: 'GitHub API rate limit reached. Try again shortly or explore the sample repository.',
        };
      }
      return { ok: false, status: res.status, error: `GitHub API returned status ${res.status}.` };
    }
    const data = (await res.json()) as T;
    return { ok: true, data };
  } catch (err) {
    return {
      ok: false,
      status: 502,
      error: err instanceof Error ? err.message : 'Unable to reach GitHub API.',
    };
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/api/github/repo', async (req, res) => {
    const rawUrl = typeof req.query.url === 'string' ? req.query.url : '';
    const requestedBranch = typeof req.query.branch === 'string' ? req.query.branch.trim() : '';

    const parsed = parseGitHubUrl(rawUrl);
    if (!parsed.ok) {
      res.status(400).json({ error: parsed.error });
      return;
    }

    const { owner, repo, branch: urlBranch } = parsed.value;
    const repoResult = await fetchGitHubJson<{
      name: string;
      private: boolean;
      description: string | null;
      html_url: string;
      default_branch: string;
      stargazers_count: number;
      owner: { login: string };
    }>(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`);

    if (!repoResult.ok) {
      res.status(repoResult.status).json({ error: repoResult.error });
      return;
    }

    const activeBranch = requestedBranch || urlBranch || repoResult.data.default_branch || 'main';

    const [branchesResult, treeResult] = await Promise.all([
      fetchGitHubJson<Array<{ name: string }>>(
        `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/branches?per_page=30`
      ),
      fetchGitHubJson<{
        truncated: boolean;
        tree: Array<{ path: string; type: string; size?: number; sha: string }>;
      }>(
        `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${encodeURIComponent(activeBranch)}?recursive=1`
      ),
    ]);

    if (!treeResult.ok) {
      res.status(treeResult.status).json({ error: treeResult.error });
      return;
    }

    const branches = branchesResult.ok
      ? branchesResult.data.map((b) => b.name)
      : [activeBranch];
    if (!branches.includes(activeBranch)) {
      branches.unshift(activeBranch);
    }

    const files = treeResult.data.tree
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
          { headers: { 'User-Agent': 'Repo2TXT-WebApp/1.0' } }
        );
        if (giRes.ok) {
          gitignore = await giRes.text();
        }
      } catch {
        // Ignore optional .gitignore fetch failure
      }
    }

    res.json({
      metadata: {
        owner: repoResult.data.owner.login,
        name: repoResult.data.name,
        branch: activeBranch,
        branches,
        isPrivate: repoResult.data.private,
        description: repoResult.data.description ?? undefined,
        htmlUrl: repoResult.data.html_url,
        stars: repoResult.data.stargazers_count,
        isDemo: false,
      },
      files,
      gitignore,
      truncated: treeResult.data.truncated,
    });
  });

  app.post('/api/github/files', async (req, res) => {
    const body = req.body as {
      owner?: string;
      repo?: string;
      branch?: string;
      paths?: string[];
    };

    const owner = typeof body.owner === 'string' ? body.owner.trim() : '';
    const repo = typeof body.repo === 'string' ? body.repo.trim() : '';
    const branch = typeof body.branch === 'string' ? body.branch.trim() : 'main';
    const paths = Array.isArray(body.paths) ? body.paths.slice(0, 100) : [];

    if (!owner || !repo || paths.length === 0) {
      res.status(400).json({ error: 'Invalid file batch request.' });
      return;
    }

    const concurrency = 8;
    const results: Array<{ path: string; content: string; size: number; skipped?: boolean }> = [];

    for (let i = 0; i < paths.length; i += concurrency) {
      const chunk = paths.slice(i, i + concurrency);
      const chunkResults = await Promise.all(
        chunk.map(async (filePath) => {
          const encodedPath = filePath
            .split('/')
            .map((seg) => encodeURIComponent(seg))
            .join('/');
          const rawUrl = `https://raw.githubusercontent.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${encodeURIComponent(branch)}/${encodedPath}`;
          try {
            const response = await fetch(rawUrl, {
              headers: { 'User-Agent': 'Repo2TXT-WebApp/1.0' },
            });
            if (!response.ok) {
              return { path: filePath, content: '', size: 0, skipped: true };
            }
            const buffer = Buffer.from(await response.arrayBuffer());
            // Skip files > 1.5MB or containing null bytes (binary)
            if (buffer.length > 1_500_000 || buffer.includes(0)) {
              return {
                path: filePath,
                content: `[Skipped binary or oversized file: ${filePath}]`,
                size: buffer.length,
                skipped: true,
              };
            }
            const text = buffer.toString('utf8');
            return {
              path: filePath,
              content: text,
              size: buffer.length,
            };
          } catch {
            return { path: filePath, content: '', size: 0, skipped: true };
          }
        })
      );
      results.push(...chunkResults);
    }

    res.json({ files: results });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Repo2TXT server listening on http://localhost:${PORT}`);
  });
}

startServer();
