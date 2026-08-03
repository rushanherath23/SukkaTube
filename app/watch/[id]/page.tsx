import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CommentSection } from '@/components/comment-section'
import { VideoRow } from '@/components/video-card'
import { WatchStage } from '@/components/watch-stage'
import { getCurrentUser } from '@/lib/auth'
import { avatarColor, formatBytes } from '@/lib/format'
import { getViewerId } from '@/lib/identity'
import { getCategory } from '@/lib/categories'
import { getLikeCounts, getLikeState } from '@/lib/likes'
import { canWatch, getVideo, isPublic, listVideos } from '@/lib/videos'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: PageProps<'/watch/[id]'>): Promise<Metadata> {
  const { id } = await params
  const video = await getVideo(id)
  if (!video || video.status !== 'ready') return { title: 'Video not found' }

  // Don't leak a private video's title or poster into link previews.
  if (!isPublic(video)) return { title: 'Private video', robots: { index: false } }

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
  if (!video) notFound()

  // Uploads belong to accounts; likes stay keyed on the anonymous browser id.
  const [user, viewerId] = await Promise.all([getCurrentUser(), getViewerId()])
  const isOwner = user !== null && user.id === video.ownerId

  // A private video is a 404 for everyone but its owner.
  if (!canWatch(video, user?.id ?? null)) notFound()

  const [likes, likeCounts, others, category] = await Promise.all([
    getLikeState(video.id, viewerId),
    getLikeCounts(),
    listVideos().then((all) => all.filter((item) => item.id !== video.id).slice(0, 12)),
    video.categoryId ? getCategory(video.categoryId) : null,
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

          <span className="ml-auto flex flex-wrap items-center gap-2">
            {category && (
              <span className="rounded-full bg-elevated px-3 py-1 text-xs font-medium text-muted">
                {category.name}
              </span>
            )}
            {!isPublic(video) && (
              <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-medium text-brand-ink">
                Private — only you can see this
              </span>
            )}
          </span>
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
