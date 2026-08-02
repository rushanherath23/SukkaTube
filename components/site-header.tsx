import Link from 'next/link'
import { Suspense } from 'react'
import { SearchBar } from './search-bar'

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-bg/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-3 px-4 sm:gap-6 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand">
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-white" aria-hidden>
              <path d="M8 5.5v13l11-6.5-11-6.5Z" />
            </svg>
          </span>
          <span className="hidden text-lg font-semibold tracking-tight sm:block">
            Sukka<span className="text-brand">Tube</span>
          </span>
        </Link>

        <Suspense fallback={<div className="h-10 flex-1" />}>
          <SearchBar />
        </Suspense>

        <Link
          href="/upload"
          className="flex shrink-0 items-center gap-2 rounded-full bg-elevated px-3 py-2 text-sm font-medium text-ink transition hover:bg-line sm:px-4"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4 stroke-current" fill="none" strokeWidth={2} aria-hidden>
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
          <span className="hidden sm:block">Upload</span>
        </Link>
      </div>
    </header>
  )
}
