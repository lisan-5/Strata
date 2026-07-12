import type { ReactNode } from 'react'

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-full bg-[#0b0d12]">
      <header className="border-b border-white/5">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <span className="font-mono text-sm font-semibold tracking-tight text-slate-100">
            strata
          </span>
          <a
            href="https://github.com/lisan-5/Strata"
            className="text-sm text-slate-400 transition hover:text-slate-200"
          >
            source
          </a>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-12">{children}</main>
    </div>
  )
}
