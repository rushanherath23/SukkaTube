'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

export function SearchBar() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initial = searchParams.get('q') ?? ''
  const [value, setValue] = useState(initial)

  // Keep the field in sync when navigation changes the query (back button, logo click).
  useEffect(() => setValue(initial), [initial])

  return (
    <form
      role="search"
      className="flex flex-1 justify-center"
      onSubmit={(event) => {
        event.preventDefault()
        const term = value.trim()
        router.push(term ? `/?q=${encodeURIComponent(term)}` : '/')
      }}
    >
      <div className="flex w-full max-w-2xl items-center rounded-full border border-line bg-surface focus-within:border-brand/60">
        <input
          name="q"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Search videos"
          aria-label="Search videos"
          className="min-w-0 flex-1 bg-transparent px-4 py-2 text-sm outline-none placeholder:text-muted"
        />
        {value && (
          <button
            type="button"
            onClick={() => {
              setValue('')
              router.push('/')
            }}
            aria-label="Clear search"
            className="px-2 text-muted transition hover:text-ink"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 stroke-current" fill="none" strokeWidth={2} aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        )}
        <button
          type="submit"
          aria-label="Search"
          className="rounded-r-full px-4 py-2 text-muted transition hover:text-ink"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4 stroke-current" fill="none" strokeWidth={2} aria-hidden>
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </form>
  )
}
