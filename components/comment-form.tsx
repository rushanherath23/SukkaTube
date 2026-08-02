'use client'

import { useActionState } from 'react'
import { postComment } from '@/app/actions'
import { MAX_AUTHOR_LENGTH, MAX_COMMENT_LENGTH } from '@/lib/limits'

export function CommentForm({
  videoId,
  defaultName,
}: {
  videoId: string
  defaultName: string
}) {
  const [state, formAction, pending] = useActionState(postComment.bind(null, videoId), {})

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <textarea
        name="body"
        rows={3}
        required
        maxLength={MAX_COMMENT_LENGTH}
        placeholder="Add a comment…"
        aria-label="Comment"
        className="resize-y rounded-xl border border-line bg-surface px-4 py-2.5 text-sm outline-none transition focus:border-brand/60"
      />

      <div className="flex flex-wrap items-center gap-3">
        <input
          name="author"
          defaultValue={defaultName}
          maxLength={MAX_AUTHOR_LENGTH}
          placeholder="Your name"
          aria-label="Your name"
          className="min-w-0 flex-1 rounded-xl border border-line bg-surface px-4 py-2 text-sm outline-none transition focus:border-brand/60 sm:max-w-xs"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-soft disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? 'Posting…' : 'Comment'}
        </button>
      </div>

      <p aria-live="polite" className="min-h-5 text-sm text-brand">
        {state?.error}
      </p>
    </form>
  )
}
