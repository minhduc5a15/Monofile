import { parseGitHubUrl } from '../../src/utils/repoLogic';

function getGitHubHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'Monofile-WebApp/1.0',
  };
  const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  const token = proc?.env?.GITHUB_TOKEN;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

async function fetchGitHubJson<T>(
  url: string
): Promise<{ ok: true; data: T } | { ok: false; status: number; error: string }> {
  try {
    const res = await fetch(url, { headers: getGitHubHeaders() });
    if (!res.ok) {
      if (res.status === 404) {
        return { ok: false, status: 404, error: 'Repository or branch not found on GitHub.' };
      }
      if (res.status === 403 || res.status === 429) {
        return {
          ok: false,
          status: 429,
          error: 'GitHub API rate limit reached. Try again shortly.',
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

export async function GET(request: Request): Promise<Response> {
  const reqUrl = new URL(request.url);
  const rawUrl = reqUrl.searchParams.get('url') ?? '';
  const requestedBranch = (reqUrl.searchParams.get('branch') ?? '').trim();

  const parsed = parseGitHubUrl(rawUrl);
  if (!parsed.ok) {
    return jsonResponse({ error: parsed.error }, 400);
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
    return jsonResponse({ error: repoResult.error }, repoResult.status);
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
    return jsonResponse({ error: treeResult.error }, treeResult.status);
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
        { headers: { 'User-Agent': 'Monofile-WebApp/1.0' } }
      );
      if (giRes.ok) {
        gitignore = await giRes.text();
      }
    } catch {
      // Ignore optional .gitignore fetch failure
    }
  }

  return jsonResponse({
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
}
