import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { LoginForm } from '@/components/login-form'
import { getCurrentUser, safeNext } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to your SukkaTube account.',
}

export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  const user = await getCurrentUser()
  const { next } = await searchParams
  const target = safeNext(typeof next === 'string' ? next : null)

  if (user) redirect(target)

  return (
    <div className="mx-auto max-w-md px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
      <p className="mt-2 text-sm text-muted">Welcome back.</p>

      <div className="mt-8">
        <LoginForm next={target} />
      </div>

      <p className="mt-6 text-sm text-muted">
        No account yet?{' '}
        <Link
          href={`/signup?next=${encodeURIComponent(target)}`}
          className="font-medium text-brand-ink hover:underline"
        >
          Create one
        </Link>
      </p>
    </div>
  )
}
