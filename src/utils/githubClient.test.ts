import test from 'node:test';
import assert from 'node:assert/strict';
import {
  fetchRepoFilesBatch,
  loadRepositoryFromApiOrDirect,
} from './githubClient';

test('loadRepositoryFromApiOrDirect falls back to GitHub API when /api returns non-JSON 404 (e.g. Vercel static)', async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith('/api/github/repo')) {
        return new Response('The page could not be found', {
          status: 404,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
      }
      if (url === 'https://api.github.com/repos/minhduc5a15/monofile') {
        return new Response(
          JSON.stringify({
            name: 'monofile',
            private: false,
            description: 'Monofile app',
            html_url: 'https://github.com/minhduc5a15/monofile',
            default_branch: 'main',
            stargazers_count: 1,
            owner: { login: 'minhduc5a15' },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (url.includes('/branches')) {
        return new Response(JSON.stringify([{ name: 'main' }]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (url.includes('/git/trees/main')) {
        return new Response(
          JSON.stringify({
            truncated: false,
            tree: [{ path: 'README.md', type: 'blob', size: 120, sha: 'abc' }],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response('Not Found', { status: 404 });
    }) as typeof fetch;

    const controller = new AbortController();
    const res = await loadRepositoryFromApiOrDirect(
      'https://github.com/minhduc5a15/monofile',
      undefined,
      controller.signal
    );

    assert.equal(res.metadata.owner, 'minhduc5a15');
    assert.equal(res.metadata.name, 'monofile');
    assert.equal(res.files.length, 1);
    assert.equal(res.files[0].path, 'README.md');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('fetchRepoFilesBatch falls back to raw.githubusercontent.com when /api returns non-JSON 404', async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === '/api/github/files') {
        return new Response('The page could not be found', {
          status: 404,
          headers: { 'Content-Type': 'text/plain' },
        });
      }
      if (url === 'https://raw.githubusercontent.com/minhduc5a15/monofile/main/README.md') {
        return new Response('# Monofile', { status: 200 });
      }
      return new Response('', { status: 404 });
    }) as typeof fetch;

    const controller = new AbortController();
    const files = await fetchRepoFilesBatch(
      'minhduc5a15',
      'monofile',
      'main',
      ['README.md'],
      controller.signal
    );

    assert.equal(files.length, 1);
    assert.equal(files[0].path, 'README.md');
    assert.equal(files[0].content, '# Monofile');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
