function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

export async function POST(request: Request): Promise<Response> {
  const body = (await request.json().catch(() => ({}))) as {
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
    return jsonResponse({ error: 'Invalid file batch request.' }, 400);
  }

  const concurrency = 8;
  const decoder = new TextDecoder('utf-8');
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
            headers: { 'User-Agent': 'Monofile-WebApp/1.0' },
          });
          if (!response.ok) {
            return { path: filePath, content: '', size: 0, skipped: true };
          }
          const bytes = new Uint8Array(await response.arrayBuffer());
          if (bytes.length > 1_500_000 || bytes.includes(0)) {
            return {
              path: filePath,
              content: `[Skipped binary or oversized file: ${filePath}]`,
              size: bytes.length,
              skipped: true,
            };
          }
          return {
            path: filePath,
            content: decoder.decode(bytes),
            size: bytes.length,
          };
        } catch {
          return { path: filePath, content: '', size: 0, skipped: true };
        }
      })
    );
    results.push(...chunkResults);
  }

  return jsonResponse({ files: results });
}
