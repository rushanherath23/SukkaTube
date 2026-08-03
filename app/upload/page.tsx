import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { UploadForm } from '@/components/upload-form'
import { getCurrentUser } from '@/lib/auth'
import { listCategories } from '@/lib/categories'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Upload',
  description: 'Publish videos to SukkaTube.',
}

export default async function UploadPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login?next=%2Fupload')

  const categories = await listCategories(user.id)

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Upload videos</h1>
      <p className="mt-2 text-sm text-muted">
        Publishing as <span className="font-medium text-ink">{user.displayName}</span>. Add several
        at once, or drop a zip — each video goes live as its upload finishes.
      </p>

      <div className="mt-8">
        <UploadForm categories={categories} />
      </div>

      <p className="mt-6 text-sm text-muted">
        Manage everything you have uploaded from your{' '}
        <Link href="/dashboard" className="text-brand-ink hover:underline">
          dashboard
        </Link>
        .
      </p>
    </div>
  )
}
