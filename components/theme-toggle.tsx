'use client'

import { THEME_KEY } from '@/lib/theme'

/**
 * Flips `data-theme` on <html> and remembers the choice. Which icon shows is
 * decided by CSS, so this component renders identically on server and client.
 */
export function ThemeToggle() {
  function toggle() {
    const root = document.documentElement
    const current =
      root.dataset.theme ??
      (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
    const next = current === 'dark' ? 'light' : 'dark'

    root.dataset.theme = next
    try {
      localStorage.setItem(THEME_KEY, next)
    } catch {
      // Private mode or blocked storage — the toggle still works for this page.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Switch between light and dark theme"
      title="Switch between light and dark theme"
      className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-muted transition hover:bg-elevated hover:text-ink"
    >
      {/* Shown while dark is active: click for light. */}
      <svg viewBox="0 0 24 24" className="icon-dark h-5 w-5 stroke-current" fill="none" strokeWidth={2} aria-hidden>
        <circle cx="12" cy="12" r="4" />
        <path
          d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"
          strokeLinecap="round"
        />
      </svg>
      {/* Shown while light is active: click for dark. */}
      <svg viewBox="0 0 24 24" className="icon-light h-5 w-5 stroke-current" fill="none" strokeWidth={2} aria-hidden>
        <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z" strokeLinejoin="round" />
      </svg>
    </button>
  )
}
