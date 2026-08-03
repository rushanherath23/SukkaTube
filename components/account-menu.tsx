import Link from 'next/link'
import { logOut } from '@/app/auth-actions'
import { getCurrentUser } from '@/lib/auth'
import { avatarColor, calculateAge } from '@/lib/format'

/** A <details> dropdown, so the menu needs no client JavaScript. */
export async function AccountMenu() {
  const user = await getCurrentUser()

  if (!user) {
    return (
      <Link
        href="/login"
        className="shrink-0 rounded-full bg-elevated px-3 py-2 text-sm font-medium text-ink transition hover:bg-line sm:px-4"
      >
        Sign in
      </Link>
    )
  }

  const age = calculateAge(user.dateOfBirth)

  return (
    <details className="relative shrink-0 [&[open]>summary>span]:ring-2">
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full py-1 pl-1 pr-2 transition hover:bg-elevated">
        <span
          className="grid h-8 w-8 place-items-center rounded-full text-sm font-semibold text-white ring-brand"
          style={{ background: avatarColor(user.displayName) }}
          aria-hidden
        >
          {user.displayName.charAt(0).toUpperCase()}
        </span>
        <span className="hidden max-w-32 truncate text-sm font-medium lg:block">
          {user.displayName}
        </span>
      </summary>

      <div className="absolute right-0 z-50 mt-2 w-56 rounded-xl border border-line bg-surface p-3 shadow-lg">
        <p className="truncate text-sm font-semibold">{user.displayName}</p>
        <p className="mt-0.5 text-xs text-muted">
          {age === null ? 'Age not set' : `Age ${age}`}
        </p>

        <Link
          href="/upload"
          className="mt-3 block rounded-lg px-3 py-2 text-sm transition hover:bg-elevated"
        >
          Upload a video
        </Link>

        <form action={logOut}>
          <button
            type="submit"
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-brand-ink transition hover:bg-elevated"
          >
            Log out
          </button>
        </form>
      </div>
    </details>
  )
}
