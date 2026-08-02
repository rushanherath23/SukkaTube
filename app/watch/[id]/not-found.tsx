import Link from 'next/link'

export default function VideoNotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <h1 className="text-2xl font-semibold">Video not found</h1>
      <p className="mt-2 text-sm text-muted">
        It may have been deleted, or the link is wrong.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-soft"
      >
        Back to all videos
      </Link>
    </div>
  )
}
