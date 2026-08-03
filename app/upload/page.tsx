import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { UploadForm } from '@/components/upload-form'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Upload',
  description: 'Publish a video to SukkaTube.',
}

export default async function UploadPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login?next=%2Fupload')

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Upload a video</h1>
      <p className="mt-2 text-sm text-muted">
        Publishing as <span className="font-medium text-ink">{user.displayName}</span>. Your video
        goes live as soon as the upload finishes.
      </p>
      <div className="mt-8">
        <UploadForm />
      </div>
    </div>
  )
}
