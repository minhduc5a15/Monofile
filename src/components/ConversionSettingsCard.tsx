import { useState } from 'react';
import { Settings, FileText, ChevronDown, Info, Check } from 'lucide-react';
import type { ConversionSettings, OutputFormat } from '../utils/repoLogic';

interface ConversionSettingsCardProps {
  settings: ConversionSettings;
  onChange: (next: ConversionSettings) => void;
}

const FORMAT_OPTIONS: Array<{ value: OutputFormat; label: string }> = [
  { value: '.txt', label: '.txt' },
  { value: '.md', label: '.md' },
  { value: '.xml', label: '.xml' },
  { value: '.json', label: '.json' },
];

export function ConversionSettingsCard({ settings, onChange }: ConversionSettingsCardProps) {
  const [showPatternHelp, setShowPatternHelp] = useState(false);

  const toggleField = (
    key: 'includeFilePaths' | 'includeDirectoryStructure' | 'excludeBinaryFiles' | 'useGitignore'
  ) => {
    onChange({ ...settings, [key]: !settings[key] });
  };

  return (
    <section
      aria-labelledby="conversion-settings-heading"
      className="rounded-xl border border-[#242434] bg-[#13131C] p-4.5"
    >
      <div className="flex items-center gap-2.5">
        <Settings className="h-4.5 w-4.5 text-slate-300" aria-hidden="true" />
        <h2 id="conversion-settings-heading" className="font-display text-base font-semibold text-white">
          Conversion Settings
        </h2>
      </div>

      {/* Output Format selector */}
      <div className="mt-4 flex items-center justify-between gap-4">
        <label htmlFor="output-format-select" className="text-sm font-medium text-slate-200">
          Output Format
        </label>
        <div className="relative min-w-[144px]">
          <FileText
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <select
            id="output-format-select"
            value={settings.outputFormat}
            onChange={(e) => onChange({ ...settings, outputFormat: e.target.value as OutputFormat })}
            className="h-9 w-full appearance-none rounded-lg border border-[#2B2B3E] bg-[#0E0E16] pl-9 pr-8 font-mono text-sm font-medium text-slate-100 transition-colors hover:border-[#3D3D56] focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
          >
            {FORMAT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-[#13131C] text-slate-100">
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-purple-400"
            aria-hidden="true"
          />
        </div>
      </div>

      <div className="my-3.5 h-px bg-[#202030]" />

      {/* Checkbox options */}
      <div className="space-y-2.5">
        {(
          [
            {
              key: 'includeFilePaths',
              title: 'Include file paths',
              description: "Add the file path before each file's content",
            },
            {
              key: 'includeDirectoryStructure',
              title: 'Include directory structure',
              description: 'Add a tree view of the repository structure',
            },
            {
              key: 'excludeBinaryFiles',
              title: 'Exclude binary files',
              description: 'Skip files like images, videos, etc.',
            },
            {
              key: 'useGitignore',
              title: 'Use .gitignore patterns',
              description: "Respect the repository's .gitignore file",
            },
          ] as const
        ).map((item) => {
          const checked = settings[item.key];
          const inputId = `setting-${item.key}`;
          return (
            <label
              key={item.key}
              htmlFor={inputId}
              className="group flex cursor-pointer items-start gap-3 select-none"
            >
              <span className="relative mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center">
                <input
                  id={inputId}
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleField(item.key)}
                  className="peer absolute inset-0 h-full w-full cursor-pointer opacity-0"
                />
                <span
                  aria-hidden="true"
                  className={`pointer-events-none flex h-4.5 w-4.5 items-center justify-center rounded-[5px] border transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-purple-400 ${
                    checked
                      ? 'border-[#8B5CF6] bg-[#8B5CF6] text-white'
                      : 'border-[#3B3B52] bg-[#0E0E16] group-hover:border-[#575776]'
                  }`}
                >
                  {checked && <Check className="h-3 w-3 stroke-[3]" />}
                </span>
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium leading-snug text-slate-100">
                  {item.title}
                </span>
                <span className="mt-0.5 block text-xs leading-snug text-slate-400">
                  {item.description}
                </span>
              </span>
            </label>
          );
        })}
      </div>

      {/* Custom Exclude Patterns */}
      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <label htmlFor="custom-exclude-patterns" className="text-sm font-medium text-slate-200">
            Custom Exclude Patterns <span className="font-normal text-slate-400">(optional)</span>
          </label>
        </div>
        <div className="flex items-center gap-2">
          <input
            id="custom-exclude-patterns"
            type="text"
            value={settings.customExcludePatterns}
            onChange={(e) => onChange({ ...settings, customExcludePatterns: e.target.value })}
            placeholder="*.log, node_modules/**"
            className="h-9.5 w-full rounded-lg border border-[#2B2B3E] bg-[#0E0E16] px-3 font-mono text-xs text-slate-100 placeholder-slate-500 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
          />
          <button
            type="button"
            onClick={() => setShowPatternHelp((prev) => !prev)}
            aria-label="Toggle exclude pattern syntax help"
            aria-expanded={showPatternHelp}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-purple-400 transition-colors hover:bg-purple-500/10 hover:text-purple-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
          >
            <Info className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        {showPatternHelp && (
          <p className="mt-2 rounded-lg border border-[#27273A] bg-[#0E0E16] p-2.5 text-xs leading-relaxed text-slate-400">
            Separate patterns with commas or new lines. Supports wildcards like{' '}
            <code className="font-mono text-purple-300">*.log</code>,{' '}
            <code className="font-mono text-purple-300">dist/**</code>, and{' '}
            <code className="font-mono text-purple-300">**/*.test.ts</code>.
          </p>
        )}
      </div>
    </section>
  );
}
