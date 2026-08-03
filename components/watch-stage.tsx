'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { registerView } from '@/app/actions'
import { LikeButton } from '@/components/like-button'
import { formatTimeAgo, formatViews } from '@/lib/format'

type Props = {
  id: string
  title: string
  createdAt: string
  initialViews: number
  initialLikes: number
  initialLiked: boolean
  hasThumbnail: boolean
  isOwner: boolean
}

export function WatchStage({
  id,
  title,
  createdAt,
  initialViews,
  initialLikes,
  initialLiked,
  hasThumbnail,
  isOwner,
}: Props) {
  const router = useRouter()
  const counted = useRef(false)
  const [views, setViews] = useState(initialViews)
  const [copied, setCopied] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handlePlay() {
    if (counted.current) return
    counted.current = true

    // One view per video per browser tab session, even if the player remounts.
    const key = `sukkatube:viewed:${id}`
    if (sessionStorage.getItem(key)) return
    sessionStorage.setItem(key, '1')

    const updated = await registerView(id)
    if (typeof updated === 'number') setViews(updated)
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('Could not copy the link')
    }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this video permanently?')) return
    setDeleting(true)
    setError(null)
    try {
      const response = await fetch(`/api/videos/${id}`, { method: 'DELETE' })
      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new Error(body.error ?? 'Delete failed')
      }
      router.push('/')
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Delete failed')
      setDeleting(false)
    }
  }

  return (
    <div>
      <div className="overflow-hidden rounded-xl bg-black">
        <video
          className="aspect-video w-full bg-black"
          src={`/api/videos/${id}/stream`}
          poster={hasThumbnail ? `/api/videos/${id}/thumbnail` : undefined}
          controls
          autoPlay
          playsInline
          preload="metadata"
          onPlay={handlePlay}
        />
      </div>

      <h1 className="mt-4 text-xl font-semibold leading-snug">{title}</h1>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted">
        <span>
          {formatViews(views)} · {formatTimeAgo(createdAt)}
        </span>
        <span className="ml-auto flex items-center gap-2">
          <LikeButton videoId={id} initialCount={initialLikes} initialLiked={initialLiked} />
          <button
            type="button"
            onClick={handleCopy}
            className="rounded-full bg-elevated px-4 py-2 text-sm font-medium text-ink transition hover:bg-line"
          >
            {copied ? 'Link copied' : 'Copy link'}
          </button>
          {isOwner && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-full bg-elevated px-4 py-2 text-sm font-medium text-brand-ink transition hover:bg-line disabled:opacity-50"
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          )}
        </span>
      </div>

      {error && <p className="mt-2 text-sm text-brand-ink">{error}</p>}
    </div>
  )
}
