import type { Metadata } from 'next'
import { UploadForm } from '@/components/upload-form'

export const metadata: Metadata = {
  title: 'Upload',
  description: 'Publish a video to SukkaTube.',
}

export default function UploadPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Upload a video</h1>
      <p className="mt-2 text-sm text-muted">
        No account needed. Your video goes live as soon as the upload finishes.
      </p>
      <div className="mt-8">
        <UploadForm />
      </div>
    </div>
  )
}
