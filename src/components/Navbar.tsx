import { ExternalLink } from 'lucide-react';

interface NavbarProps {
  onHomeClick?: () => void;
}

export function GitHubMark({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  );
}

export function Navbar({ onHomeClick }: NavbarProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-[#202030] bg-[#0B0B10]/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1220px] items-center justify-between gap-3 px-4 sm:gap-8 sm:px-6">
        <div className="flex items-center gap-4 sm:gap-10 min-w-0">
          {/* Zone 1: Brand mark */}
          <button
            type="button"
            onClick={onHomeClick}
            className="flex items-center gap-2 whitespace-nowrap shrink-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 sm:gap-2.5"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#A78BFA] to-[#7C3AED] shadow-sm shadow-purple-900/40">
              <svg viewBox="0 0 24 24" fill="none" className="h-4.5 w-4.5 text-white" aria-hidden="true">
                <path
                  d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z"
                  fill="currentColor"
                  fillOpacity="0.22"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
                <path
                  d="M9.5 13.5 7.5 15.5l2 2M14.5 13.5l2 2-2 2M12.7 12.8l-1.4 5.4"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span className="font-display text-base font-bold tracking-tight text-white sm:text-lg">
              Mono<span className="text-[#9D6BFF]">file</span>
            </span>
          </button>
        </div>

        {/* Zone 3: Primary external action */}
        <a
          href="https://github.com/minhduc5a15/monofile"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
        >
          <GitHubMark className="h-4.5 w-4.5 text-white" />
          <span className="hidden sm:inline">Star on GitHub</span>
          <ExternalLink className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
        </a>
      </div>
    </header>
  );
}
