'use client'

import { useActionState } from 'react'
import { postComment } from '@/app/actions'
import { PRIMARY_BUTTON_CLASS } from '@/components/form-styles'
import { MAX_COMMENT_LENGTH } from '@/lib/limits'

export function CommentForm({ videoId }: { videoId: string }) {
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

      <button type="submit" disabled={pending} className={`${PRIMARY_BUTTON_CLASS} self-start`}>
        {pending ? 'Posting…' : 'Comment'}
      </button>

      <p aria-live="polite" className="min-h-5 text-sm text-brand-ink">
        {state?.error}
      </p>
    </form>
  )
}
