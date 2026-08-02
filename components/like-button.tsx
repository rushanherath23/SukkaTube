'use client'

import { useState, useTransition } from 'react'
import { toggleVideoLike } from '@/app/actions'

export function LikeButton({
  videoId,
  initialCount,
  initialLiked,
}: {
  videoId: string
  initialCount: number
  initialLiked: boolean
}) {
  const [state, setState] = useState({ count: initialCount, liked: initialLiked })
  const [pending, startTransition] = useTransition()

  function handleClick() {
    // Flip straight away, then reconcile with whatever the server settled on.
    const previous = state
    setState({ liked: !state.liked, count: state.count + (state.liked ? -1 : 1) })

    startTransition(async () => {
      try {
        setState((await toggleVideoLike(videoId)) ?? previous)
      } catch {
        setState(previous)
      }
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      aria-pressed={state.liked}
      aria-label={state.liked ? 'Remove your like' : 'Like this video'}
      className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition disabled:opacity-60 ${
        state.liked ? 'bg-brand text-white hover:bg-brand-soft' : 'bg-elevated text-ink hover:bg-line'
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill={state.liked ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden
      >
        <path
          d="M7 22V10l5-8a2.5 2.5 0 0 1 2.4 3.2L13.5 9H19a2 2 0 0 1 2 2.4l-1.6 8A2 2 0 0 1 17.4 21H7Z"
          strokeLinejoin="round"
        />
        <path d="M7 10H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" strokeLinejoin="round" />
      </svg>
      <span className="tabular-nums">{state.count}</span>
    </button>
  )
}
