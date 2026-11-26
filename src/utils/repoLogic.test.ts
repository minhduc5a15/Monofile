import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseGitHubUrl,
  isBinaryFile,
  matchesAnyExcludePattern,
  parsePatternList,
  filterFilesBySettings,
  buildFileTree,
  generateAsciiTree,
  formatOutputDocument,
  formatBytes,
  type ConversionSettings,
  type RepoFileEntry,
} from './repoLogic';

test('parseGitHubUrl parses full URLs, branch URLs, and shorthand', () => {
  const full = parseGitHubUrl('https://github.com/microsoft/vscode');
  assert.equal(full.ok, true);
  if (full.ok) {
    assert.equal(full.value.owner, 'microsoft');
    assert.equal(full.value.repo, 'vscode');
    assert.equal(full.value.branch, undefined);
  }

  const withBranch = parseGitHubUrl('https://github.com/facebook/react/tree/main');
  assert.equal(withBranch.ok, true);
  if (withBranch.ok) {
    assert.equal(withBranch.value.owner, 'facebook');
    assert.equal(withBranch.value.repo, 'react');
    assert.equal(withBranch.value.branch, 'main');
  }

  const shorthand = parseGitHubUrl('vercel/next.js');
  assert.equal(shorthand.ok, true);
  if (shorthand.ok) {
    assert.equal(shorthand.value.owner, 'vercel');
    assert.equal(shorthand.value.repo, 'next.js');
  }

  const empty = parseGitHubUrl('   ');
  assert.equal(empty.ok, false);

  const nonGithub = parseGitHubUrl('https://gitlab.com/org/project');
  assert.equal(nonGithub.ok, false);
});

test('isBinaryFile accurately identifies binary vs text files', () => {
  assert.equal(isBinaryFile('assets/logo.png'), true);
  assert.equal(isBinaryFile('media/demo.mp4'), true);
  assert.equal(isBinaryFile('fonts/inter.woff2'), true);
  assert.equal(isBinaryFile('src/index.ts'), false);
  assert.equal(isBinaryFile('README.md'), false);
  assert.equal(isBinaryFile('Dockerfile'), false);
});

test('glob and gitignore pattern matching excludes matching paths', () => {
  const patterns = parsePatternList('*.log, node_modules/**, dist/');
  assert.equal(matchesAnyExcludePattern('debug.log', patterns), true);
  assert.equal(matchesAnyExcludePattern('logs/server.log', patterns), true);
  assert.equal(matchesAnyExcludePattern('node_modules/react/index.js', patterns), true);
  assert.equal(matchesAnyExcludePattern('dist/bundle.js', patterns), true);
  assert.equal(matchesAnyExcludePattern('src/App.tsx', patterns), false);
});

test('filterFilesBySettings respects binary exclusion, gitignore, and custom globs', () => {
  const files: RepoFileEntry[] = [
    { path: 'src/main.ts', size: 420 },
    { path: 'assets/hero.png', size: 14200 },
    { path: 'logs/error.log', size: 900 },
    { path: '.env.local', size: 120 },
  ];

  const settings: ConversionSettings = {
    outputFormat: '.txt',
    includeFilePaths: true,
    includeDirectoryStructure: true,
    excludeBinaryFiles: true,
    useGitignore: true,
    customExcludePatterns: '*.log',
  };

  const filtered = filterFilesBySettings(files, settings, '.env.local\n');
  assert.deepEqual(
    filtered.map((f) => f.path),
    ['src/main.ts']
  );
});

test('buildFileTree sorts folders first and accumulates folder sizes', () => {
  const tree = buildFileTree([
    { path: 'README.md', size: 100 },
    { path: 'src/index.ts', size: 300 },
    { path: 'src/utils/math.ts', size: 200 },
  ]);

  assert.equal(tree[0].name, 'src');
  assert.equal(tree[0].type, 'folder');
  assert.equal(tree[0].size, 500);
  assert.equal(tree[1].name, 'README.md');
  assert.equal(tree[1].type, 'file');
});

test('generateAsciiTree and formatOutputDocument produce valid formats', () => {
  const ascii = generateAsciiTree(['src/app.ts', 'README.md'], 'demo');
  assert.ok(ascii.includes('demo/'));
  assert.ok(ascii.includes('src/'));
  assert.ok(ascii.includes('README.md'));

  const baseSettings: ConversionSettings = {
    outputFormat: '.txt',
    includeFilePaths: true,
    includeDirectoryStructure: true,
    excludeBinaryFiles: true,
    useGitignore: false,
    customExcludePatterns: '',
  };

  const txtOut = formatOutputDocument(
    { owner: 'acme', name: 'demo', branch: 'main' },
    [{ path: 'src/app.ts', content: 'console.log("hi");', size: 18 }],
    baseSettings
  );
  assert.ok(txtOut.content.includes('FILE: src/app.ts'));
  assert.ok(txtOut.content.includes('DIRECTORY STRUCTURE'));
  assert.equal(txtOut.fileCount, 1);

  const jsonOut = formatOutputDocument(
    { owner: 'acme', name: 'demo', branch: 'main' },
    [{ path: 'src/app.ts', content: 'console.log("hi");', size: 18 }],
    { ...baseSettings, outputFormat: '.json', includeFilePaths: false }
  );
  const parsed = JSON.parse(jsonOut.content);
  assert.equal(parsed.repository, 'acme/demo');
  assert.equal(parsed.files[0].path, undefined);
  assert.equal(parsed.files[0].content, 'console.log("hi");');
});

test('formatBytes formats human-readable byte sizes', () => {
  assert.equal(formatBytes(0), '0 B');
  assert.equal(formatBytes(512), '512 B');
  assert.equal(formatBytes(2048), '2.0 KB');
  assert.equal(formatBytes(5 * 1024 * 1024), '5.0 MB');
});
