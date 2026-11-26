import { Info, Heart } from 'lucide-react';

export function AboutCard() {
  return (
    <section
      aria-labelledby="sidebar-about-heading"
      className="rounded-xl border border-[#242434] bg-[#13131C] p-5"
    >
      <div className="flex items-center gap-2">
        <Info className="h-4 w-4 text-slate-300" aria-hidden="true" />
        <h2 id="sidebar-about-heading" className="font-display text-base font-semibold text-white">
          About
        </h2>
      </div>

      <p className="mt-2.5 text-xs leading-relaxed text-slate-400">
        Monofile is a simple utility to export GitHub repositories as plain text files. Perfect for
        reading, archiving, or... well, whatever you need it for.
      </p>

      <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-400">
        <Heart className="h-3.5 w-3.5 fill-[#9D6BFF] text-[#9D6BFF]" aria-hidden="true" />
        <span>Made with</span>
        <Heart className="h-3.5 w-3.5 fill-[#9D6BFF] text-[#9D6BFF]" aria-hidden="true" />
        <span>for developers</span>
      </div>
    </section>
  );
}
