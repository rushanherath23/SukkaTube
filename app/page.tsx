import Link from 'next/link'
import { VideoCard } from '@/components/video-card'
import { getLikeCounts } from '@/lib/likes'
import { listVideos } from '@/lib/videos'

// The feed reads the upload store on every request, so it must never be prerendered.
export const dynamic = 'force-dynamic'

export default async function HomePage({ searchParams }: PageProps<'/'>) {
  const { q } = await searchParams
  const query = typeof q === 'string' ? q : ''
  const [videos, likeCounts] = await Promise.all([listVideos(query), getLikeCounts()])

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6">
      {query && (
        <h1 className="mb-5 text-lg text-muted">
          {videos.length} result{videos.length === 1 ? '' : 's'} for{' '}
          <span className="font-semibold text-ink">&ldquo;{query}&rdquo;</span>
        </h1>
      )}

      {videos.length === 0 ? (
        <EmptyState query={query} />
      ) : (
        <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {videos.map((video) => (
            <VideoCard key={video.id} video={video} likes={likeCounts.get(video.id) ?? 0} />
          ))}
        </div>
      )}
    </div>
  )
}

function EmptyState({ query }: { query: string }) {
  return (
    <div className="mx-auto max-w-md py-24 text-center">
      <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-elevated">
        <svg viewBox="0 0 24 24" className="h-7 w-7 fill-brand" aria-hidden>
          <path d="M8 5.5v13l11-6.5-11-6.5Z" />
        </svg>
      </span>
      <h2 className="mt-5 text-xl font-semibold">
        {query ? 'No videos matched that search' : 'Nothing here yet'}
      </h2>
      <p className="mt-2 text-sm text-muted">
        {query
          ? 'Try a different title, description, or uploader name.'
          : 'Be the first — upload a video and it shows up right here.'}
      </p>
      <Link
        href="/upload"
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-soft"
      >
        Upload a video
      </Link>
    </div>
  )
}
