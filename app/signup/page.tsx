import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { SignupForm } from '@/components/signup-form'
import { getCurrentUser, safeNext } from '@/lib/auth'
import { MIN_AGE } from '@/lib/limits'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Create an account',
  description: 'Sign up to upload videos and comment on SukkaTube.',
}

/** Today minus MIN_AGE years — the latest birth date the form will accept. */
function latestAllowedBirthDate(): string {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear() - MIN_AGE, now.getUTCMonth(), now.getUTCDate()))
    .toISOString()
    .slice(0, 10)
}

export default async function SignupPage({ searchParams }: PageProps<'/signup'>) {
  const user = await getCurrentUser()
  const { next } = await searchParams
  const target = safeNext(typeof next === 'string' ? next : null)

  if (user) redirect(target)

  return (
    <div className="mx-auto max-w-md px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Create an account</h1>
      <p className="mt-2 text-sm text-muted">
        You need an account to upload videos and leave comments. Watching stays open to everyone.
      </p>

      <div className="mt-8">
        <SignupForm next={target} maxBirthDate={latestAllowedBirthDate()} />
      </div>

      <p className="mt-6 text-sm text-muted">
        Already have an account?{' '}
        <Link
          href={`/login?next=${encodeURIComponent(target)}`}
          className="font-medium text-brand-ink hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  )
}
