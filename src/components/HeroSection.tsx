import { Play, Loader2, AlertCircle } from 'lucide-react';
import type { FormEvent } from 'react';
import { GitHubMark } from './Navbar';

interface HeroSectionProps {
  repoUrl: string;
  onRepoUrlChange: (val: string) => void;
  onSubmit: (urlOverride?: string) => void;
  isLoading: boolean;
  validationError: string | null;
}

export function HeroSection({
  repoUrl,
  onRepoUrlChange,
  onSubmit,
  isLoading,
  validationError,
}: HeroSectionProps) {
  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <section className="relative overflow-hidden border-b border-[#1A1A28] bg-[#0B0B10] pb-7 pt-6 sm:pb-8 sm:pt-7">
      {/* Subtle atmospheric cosmic backdrop matching screenshot */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div
          className="absolute left-1/2 top-0 h-[440px] w-[960px] -translate-x-1/2 rounded-full opacity-35 blur-[110px]"
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(139, 92, 246, 0.38) 0%, rgba(76, 29, 149, 0.14) 50%, transparent 75%)',
          }}
        />
        <svg
          className="absolute inset-0 h-full w-full opacity-35"
          viewBox="0 0 1440 420"
          fill="none"
          preserveAspectRatio="xMidYMid slice"
        >
          <path
            d="M-120 340 C 260 110, 880 60, 1520 310"
            stroke="url(#arcGrad1)"
            strokeWidth="1"
          />
          <path
            d="M-60 400 C 390 190, 990 160, 1540 390"
            stroke="url(#arcGrad2)"
            strokeWidth="1"
          />
          <circle cx="195" cy="94" r="1.4" fill="#C4B5FD" fillOpacity="0.65" />
          <circle cx="312" cy="182" r="1" fill="#A78BFA" fillOpacity="0.5" />
          <circle cx="1140" cy="78" r="1.5" fill="#DDD6FE" fillOpacity="0.6" />
          <circle cx="1275" cy="156" r="1.2" fill="#A78BFA" fillOpacity="0.45" />
          <circle cx="965" cy="240" r="1" fill="#C4B5FD" fillOpacity="0.4" />
          <defs>
            <linearGradient id="arcGrad1" x1="0" y1="200" x2="1440" y2="200" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0" />
              <stop offset="45%" stopColor="#8B5CF6" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="arcGrad2" x1="0" y1="300" x2="1440" y2="300" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#6366F1" stopOpacity="0" />
              <stop offset="55%" stopColor="#7C3AED" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#6366F1" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <div className="relative mx-auto max-w-[940px] px-4 sm:px-6">
        {/* Hero graphic + display headline */}
        <div className="flex flex-col items-center gap-6 text-center md:flex-row md:items-center md:justify-center md:gap-9 md:text-left">
          {/* Custom 3D-inspired file + arrow emblem */}
          <div className="relative shrink-0 select-none" aria-hidden="true">
            <div className="absolute -inset-3 rounded-3xl bg-purple-600/20 blur-2xl" />
            <svg viewBox="0 0 156 144" className="relative h-28 w-32 sm:h-32 sm:w-36" fill="none">
              <defs>
                <linearGradient id="docBody" x1="16" y1="16" x2="108" y2="124" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#E9D5FF" />
                  <stop offset="45%" stopColor="#A78BFA" />
                  <stop offset="100%" stopColor="#6D28D9" />
                </linearGradient>
                <linearGradient id="docFold" x1="78" y1="16" x2="106" y2="46" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#F5F3FF" />
                  <stop offset="100%" stopColor="#C4B5FD" />
                </linearGradient>
                <linearGradient id="sweepArrow" x1="78" y1="118" x2="146" y2="90" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#6D28D9" />
                  <stop offset="100%" stopColor="#A855F7" />
                </linearGradient>
              </defs>
              {/* Burst lines */}
              <path d="M98 14L104 4M114 23L126 17M119 39L132 39" stroke="#C4B5FD" strokeWidth="2.4" strokeLinecap="round" opacity="0.7" />
              {/* Main file card */}
              <path
                d="M24 28C24 21.3726 29.3726 16 36 16H78L106 44V110C106 116.627 100.627 122 94 122H36C29.3726 122 24 116.627 24 110V28Z"
                fill="url(#docBody)"
              />
              {/* Folded corner */}
              <path d="M78 16L106 44H86C81.5817 44 78 40.4183 78 36V16Z" fill="url(#docFold)" />
              {/* Code brackets </> */}
              <path
                d="M52 60L41 71L52 82M78 60L89 71L78 82M69 55L61 87"
                stroke="#1E1038"
                strokeWidth="4.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Curved arrow pointing right */}
              <path
                d="M78 118C104 118 118 102 128 89"
                stroke="url(#sweepArrow)"
                strokeWidth="9"
                strokeLinecap="round"
              />
              <path
                d="M118 82L139 81L136 102"
                stroke="#A855F7"
                strokeWidth="7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <div className="max-w-xl">
            <h1 className="font-display text-3xl font-extrabold leading-[1.12] tracking-tight text-white sm:text-[2.75rem] [text-wrap:balance]">
              Your entire codebase.
              <br />
              One{' '}
              <span className="font-mono font-bold text-[#9D6BFF]">.txt</span>{' '}
              file.
            </h1>
            <p className="mt-3 text-base text-slate-300 sm:text-[17px]">
              Convert any public GitHub repository into a single text file.
            </p>
          </div>
        </div>

        {/* Repository URL form */}
        <form onSubmit={handleFormSubmit} className="mx-auto mt-6 max-w-[740px]" noValidate>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
            <div className="relative flex-1">
              <label htmlFor="github-repo-url" className="sr-only">
                GitHub repository URL
              </label>
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300">
                <GitHubMark className="h-5 w-5" />
              </span>
              <input
                id="github-repo-url"
                type="url"
                value={repoUrl}
                onChange={(e) => onRepoUrlChange(e.target.value)}
                placeholder="https://github.com/owner/repo"
                aria-invalid={Boolean(validationError)}
                aria-describedby={validationError ? 'repo-url-error' : undefined}
                className={`h-12 w-full rounded-xl border bg-[#12121B] pl-11 pr-4 text-sm text-white placeholder-slate-500 transition-colors focus:outline-none focus:ring-2 ${
                  validationError
                    ? 'border-rose-500/80 focus:border-rose-400 focus:ring-rose-500/30'
                    : 'border-[#2A2A3D] focus:border-[#8B5CF6] focus:ring-purple-500/30'
                }`}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#9353F6] to-[#7C3AED] px-6 text-sm font-semibold text-white shadow-lg shadow-purple-950/50 transition-all hover:from-[#A166FF] hover:to-[#8B4CF6] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-65 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  <span>Loading Repo...</span>
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                  <span>Convert Repository</span>
                </>
              )}
            </button>
          </div>

          {validationError && (
            <p
              id="repo-url-error"
              role="alert"
              className="mt-2.5 flex items-center gap-1.5 text-xs font-medium text-rose-400"
            >
              <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>{validationError}</span>
            </p>
          )}

          {/* Subtle quick examples for effortless exploration */}
          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-slate-500 sm:justify-start">
            <span>Examples:</span>
            <button
              type="button"
              onClick={() => {
                onRepoUrlChange('https://github.com/octocat/Hello-World');
                onSubmit('https://github.com/octocat/Hello-World');
              }}
              className="font-mono text-slate-400 underline decoration-slate-700 underline-offset-2 transition-colors hover:text-purple-300 hover:decoration-purple-400"
            >
              octocat/Hello-World
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => {
                onRepoUrlChange('https://github.com/sindresorhus/is');
                onSubmit('https://github.com/sindresorhus/is');
              }}
              className="font-mono text-slate-400 underline decoration-slate-700 underline-offset-2 transition-colors hover:text-purple-300 hover:decoration-purple-400"
            >
              sindresorhus/is
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => {
                onRepoUrlChange('https://github.com/microsoft/vscode');
                onSubmit('https://github.com/microsoft/vscode');
              }}
              className="font-mono text-slate-400 underline decoration-slate-700 underline-offset-2 transition-colors hover:text-purple-300 hover:decoration-purple-400"
            >
              microsoft/vscode (preview)
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
