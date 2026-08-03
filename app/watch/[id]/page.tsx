import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CommentSection } from '@/components/comment-section'
import { VideoRow } from '@/components/video-card'
import { WatchStage } from '@/components/watch-stage'
import { getCurrentUser } from '@/lib/auth'
import { avatarColor, formatBytes } from '@/lib/format'
import { getViewerId } from '@/lib/identity'
import { getLikeCounts, getLikeState } from '@/lib/likes'
import { getVideo, listVideos } from '@/lib/videos'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: PageProps<'/watch/[id]'>): Promise<Metadata> {
  const { id } = await params
  const video = await getVideo(id)
  if (!video || video.status !== 'ready') return { title: 'Video not found' }

  return {
    title: video.title,
    description: video.description || `Uploaded by ${video.uploader}`,
    openGraph: {
      title: video.title,
      description: video.description || `Uploaded by ${video.uploader}`,
      images: video.hasThumbnail ? [`/api/videos/${video.id}/thumbnail`] : undefined,
    },
  }
}

export default async function WatchPage({ params }: PageProps<'/watch/[id]'>) {
  const { id } = await params
  const video = await getVideo(id)
  if (!video || video.status !== 'ready') notFound()

  // Uploads belong to accounts; likes stay keyed on the anonymous browser id.
  const [user, viewerId] = await Promise.all([getCurrentUser(), getViewerId()])
  const isOwner = user !== null && user.id === video.ownerId

  const [likes, likeCounts, others] = await Promise.all([
    getLikeState(video.id, viewerId),
    getLikeCounts(),
    listVideos().then((all) => all.filter((item) => item.id !== video.id).slice(0, 12)),
  ])

  return (
    <div className="mx-auto flex max-w-[1600px] flex-col gap-8 px-4 py-6 sm:px-6 xl:flex-row">
      <div className="min-w-0 flex-1">
        <WatchStage
          id={video.id}
          title={video.title}
          createdAt={video.createdAt}
          initialViews={video.views}
          initialLikes={likes.count}
          initialLiked={likes.liked}
          hasThumbnail={video.hasThumbnail}
          isOwner={isOwner}
        />

        <div className="mt-4 flex items-center gap-3 border-t border-line pt-4">
          <span
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-semibold text-white"
            style={{ background: avatarColor(video.uploader) }}
            aria-hidden
          >
            {video.uploader.charAt(0).toUpperCase() || '?'}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{video.uploader}</p>
            <p className="text-xs text-muted">{formatBytes(video.size)}</p>
          </div>
        </div>

        {video.description && (
          <div className="mt-4 whitespace-pre-wrap rounded-xl bg-surface p-4 text-sm leading-relaxed text-ink/90">
            {video.description}
          </div>
        )}

        <CommentSection videoId={video.id} />
      </div>

      <aside className="w-full shrink-0 xl:w-[400px]">
        <h2 className="mb-4 text-sm font-semibold text-muted">Up next</h2>
        {others.length === 0 ? (
          <p className="text-sm text-muted">No other videos yet.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {others.map((item) => (
              <VideoRow key={item.id} video={item} likes={likeCounts.get(item.id) ?? 0} />
            ))}
          </div>
        )}
      </aside>
    </div>
  )
}
