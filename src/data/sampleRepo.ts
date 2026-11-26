import type { RepoFileEntry, RepoMetadata } from '../utils/repoLogic';

export const SAMPLE_REPO_METADATA: RepoMetadata = {
  owner: 'microsoft',
  name: 'vscode',
  branch: 'main',
  branches: ['main', 'release/1.96', 'insider-preview'],
  isPrivate: false,
  description: 'Visual Studio Code — open-source code editor workspace preview',
  htmlUrl: 'https://github.com/microsoft/vscode',
  stars: 168400,
  isDemo: true,
};

export const SAMPLE_GITIGNORE = `
node_modules/
out/
dist/
*.log
.DS_Store
`;

export const SAMPLE_REPO_FILES: RepoFileEntry[] = [
  {
    path: '.github/workflows/ci.yml',
    size: 1840,
    content: `name: VS Code CI
on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  hygiene-and-build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run compile
      - run: npm test`,
  },
  {
    path: '.github/workflows/release.yml',
    size: 1420,
    content: `name: Release Pipeline
on:
  workflow_dispatch:
    inputs:
      quality:
        description: 'Build quality channel'
        required: true
        default: 'stable'
jobs:
  package:
    runs-on: ubuntu-latest
    steps:
      - run: echo "Packaging \${{ github.event.inputs.quality }}"`,
  },
  {
    path: '.github/ISSUE_TEMPLATE/bug_report.yml',
    size: 980,
    content: `name: Bug Report
description: File a bug report for Visual Studio Code
labels: ["triage-needed"]
body:
  - type: textarea
    id: steps
    attributes:
      label: Steps to Reproduce
      description: Please describe the minimal steps to reproduce the issue.`,
  },
  {
    path: '.github/ISSUE_TEMPLATE/feature_request.yml',
    size: 760,
    content: `name: Feature Request
description: Suggest an improvement or new editor capability
labels: ["feature-request"]
body:
  - type: textarea
    id: proposal
    attributes:
      label: Proposal Summary`,
  },
  {
    path: '.github/pull_request_template.md',
    size: 540,
    content: `<!-- Thank you for contributing to VS Code! -->
### Summary
Describe what this PR fixes or introduces.

### Checklist
- [ ] Added unit tests covering edge cases
- [ ] Verified TypeScript compilation with zero warnings`,
  },
  {
    path: '.github/CODEOWNERS',
    size: 320,
    content: `# Core maintainers
/src/vs/editor/ @alexdima
/src/vs/workbench/ @bpasero @isidorn
/extensions/ @sandy081`,
  },
  {
    path: 'src/vs/editor/editor.api.ts',
    size: 4250,
    content: `/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export interface IPosition {
  readonly lineNumber: number;
  readonly column: number;
}

export interface ITextModel {
  readonly uri: string;
  getValue(): string;
  getLineCount(): number;
  getLineContent(lineNumber: number): string;
}

export function createEditorTokenStream(source: string): string[] {
  return source.split(/\\r?\\n/).filter((line) => line.trim().length > 0);
}`,
  },
  {
    path: 'src/vs/workbench/workbench.desktop.main.ts',
    size: 3890,
    content: `import { createEditorTokenStream } from '../editor/editor.api';

export interface IWorkbenchOptions {
  readonly workspaceUri: string;
  readonly enableTelemetry: boolean;
}

export class DesktopWorkbench {
  constructor(private readonly options: IWorkbenchOptions) {}

  public start(): { status: 'ready'; workspace: string } {
    const tokens = createEditorTokenStream(this.options.workspaceUri);
    return {
      status: tokens.length > 0 ? 'ready' : 'ready',
      workspace: this.options.workspaceUri,
    };
  }
}`,
  },
  {
    path: 'src/vs/platform/files/common/files.ts',
    size: 2740,
    content: `export const enum FileType {
  Unknown = 0,
  File = 1,
  Directory = 2,
  SymbolicLink = 64,
}

export interface IFileStat {
  readonly resource: string;
  readonly name: string;
  readonly size: number;
  readonly isFile: boolean;
  readonly isDirectory: boolean;
}`,
  },
  {
    path: 'extensions/typescript-language-features/package.json',
    size: 1920,
    content: `{
  "name": "typescript-language-features",
  "displayName": "TypeScript and JavaScript Language Features",
  "version": "1.0.0",
  "publisher": "vscode",
  "engines": {
    "vscode": "^1.90.0"
  },
  "activationEvents": [
    "onLanguage:typescript",
    "onLanguage:javascript"
  ]
}`,
  },
  {
    path: 'extensions/typescript-language-features/src/extension.ts',
    size: 2650,
    content: `export function activateLanguageClient(workspaceFolders: string[]): number {
  return workspaceFolders.length;
}

export function deactivateLanguageClient(): void {
  // Clean shutdown of tsserver worker
}`,
  },
  {
    path: 'remote/package.json',
    size: 1120,
    content: `{
  "name": "vscode-remote-server",
  "version": "1.96.0",
  "private": true,
  "dependencies": {
    "ws": "^8.18.0"
  }
}`,
  },
  {
    path: 'remote/server-main.js',
    size: 2340,
    content: `const http = require('http');

function createRemoteServer(port = 8000) {
  return http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, service: 'vscode-remote' }));
  });
}

module.exports = { createRemoteServer };`,
  },
  {
    path: 'test/unit/browser/index.js',
    size: 1640,
    content: `export function runBrowserUnitSuite(suites) {
  const passed = suites.filter((s) => s.status === 'passed').length;
  return { total: suites.length, passed };
}`,
  },
  {
    path: 'test/smoke/src/main.ts',
    size: 2180,
    content: `export async function verifyEditorLaunch(timeoutMs = 15000): Promise<boolean> {
  return timeoutMs > 0;
}`,
  },
  {
    path: 'resources/linux/code.png',
    size: 48200,
  },
  {
    path: 'logs/build-output.log',
    size: 12400,
    content: `[2026-11-25T10:00:00Z] INFO Build started
[2026-11-25T10:00:14Z] INFO Compiled 412 modules`,
  },
  {
    path: '.gitignore',
    size: 210,
    content: SAMPLE_GITIGNORE.trim(),
  },
  {
    path: 'package.json',
    size: 1580,
    content: `{
  "name": "code-oss-dev",
  "version": "1.96.0",
  "license": "MIT",
  "scripts": {
    "compile": "gulp compile",
    "watch": "gulp watch",
    "test": "node test/unit/electron/index.js"
  }
}`,
  },
  {
    path: 'README.md',
    size: 1450,
    content: `# Visual Studio Code

Visual Studio Code is a distribution of the \`Code - OSS\` repository with Microsoft-specific customizations released under a traditional Microsoft product license.

## Contributing
Pull requests and issue reports are welcome. See \`CONTRIBUTING.md\` for build instructions.`,
  },
];
