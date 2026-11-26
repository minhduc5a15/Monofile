# Monofile

Convert any public GitHub repository into a single structured text file.

## Features

- Load any public GitHub repository by URL or `owner/repo` shorthand
- Switch branches and filter/select files from an interactive tree view
- Export in `.txt`, `.md`, `.xml`, or `.json`
- Toggle file path headers, ASCII directory tree, binary file exclusion, `.gitignore` rules, and custom glob exclude patterns
- Preview, copy to clipboard, or download the generated file

## Tech Stack

- React, TypeScript, Vite, Tailwind CSS
- Express backend proxy for GitHub REST API and raw file fetching

## Development

```bash
npm install
npm run dev
```

The app runs on `http://localhost:3000`.

### Optional Environment Variables

- `GITHUB_TOKEN`: Personal access token to increase GitHub API rate limits when fetching public repositories.

## Scripts

- `npm run dev` — Start development server
- `npm run build` — Build frontend for production
- `npm start` — Run production server
- `npm run lint` — Run TypeScript type check
