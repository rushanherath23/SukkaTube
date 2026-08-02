import Image from 'next/image'
import Link from 'next/link'
import { avatarColor, formatDuration, formatLikes, formatTimeAgo, formatViews } from '@/lib/format'
import type { Video } from '@/lib/videos'

/** Likes are only worth the space once someone has actually given one. */
function meta(video: Video, likes: number): string {
  const parts = [formatViews(video.views)]
  if (likes > 0) parts.push(formatLikes(likes))
  parts.push(formatTimeAgo(video.createdAt))
  return parts.join(' · ')
}

function Thumbnail({ video, sizes }: { video: Video; sizes: string }) {
  const duration = formatDuration(video.duration)

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-elevated">
      {video.hasThumbnail ? (
        <Image
          src={`/api/videos/${video.id}/thumbnail`}
          alt=""
          fill
          unoptimized
          sizes={sizes}
          className="object-cover transition duration-300 group-hover:scale-[1.03]"
        />
      ) : (
        <div className="grid h-full w-full place-items-center bg-linear-to-br from-elevated to-surface">
          <svg viewBox="0 0 24 24" className="h-10 w-10 fill-muted/50" aria-hidden>
            <path d="M8 5.5v13l11-6.5-11-6.5Z" />
          </svg>
        </div>
      )}

      {duration && (
        <span className="absolute bottom-1.5 right-1.5 rounded bg-black/80 px-1.5 py-0.5 text-xs font-medium tabular-nums text-white">
          {duration}
        </span>
      )}
    </div>
  )
}

function Avatar({ name }: { name: string }) {
  return (
    <span
      className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-semibold text-white"
      style={{ background: avatarColor(name) }}
      aria-hidden
    >
      {name.charAt(0).toUpperCase() || '?'}
    </span>
  )
}

export function VideoCard({ video, likes = 0 }: { video: Video; likes?: number }) {
  return (
    <Link href={`/watch/${video.id}`} className="group flex flex-col gap-3">
      <Thumbnail video={video} sizes="(max-width: 640px) 100vw, (max-width: 1280px) 45vw, 22vw" />
      <div className="flex gap-3">
        <Avatar name={video.uploader} />
        <div className="min-w-0">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-ink">
            {video.title}
          </h3>
          <p className="mt-1 truncate text-sm text-muted">{video.uploader}</p>
          <p className="text-sm text-muted">{meta(video, likes)}</p>
        </div>
      </div>
    </Link>
  )
}

export function VideoRow({ video, likes = 0 }: { video: Video; likes?: number }) {
  return (
    <Link href={`/watch/${video.id}`} className="group flex gap-3">
      <div className="w-40 shrink-0 sm:w-44">
        <Thumbnail video={video} sizes="176px" />
      </div>
      <div className="min-w-0 py-0.5">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-ink">
          {video.title}
        </h3>
        <p className="mt-1 truncate text-xs text-muted">{video.uploader}</p>
        <p className="text-xs text-muted">{meta(video, likes)}</p>
      </div>
    </Link>
  )
}
