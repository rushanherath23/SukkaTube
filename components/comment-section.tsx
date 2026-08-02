import { removeComment } from '@/app/actions'
import { CommentForm } from '@/components/comment-form'
import { listComments } from '@/lib/comments'
import { avatarColor, formatTimeAgo } from '@/lib/format'
import { getDisplayName, getViewerId } from '@/lib/identity'

export async function CommentSection({ videoId }: { videoId: string }) {
  const [comments, viewerId, defaultName] = await Promise.all([
    listComments(videoId),
    getViewerId(),
    getDisplayName(),
  ])

  const removeFromThisVideo = removeComment.bind(null, videoId)

  return (
    <section className="mt-8 border-t border-line pt-6">
      <h2 className="text-base font-semibold">
        {comments.length} comment{comments.length === 1 ? '' : 's'}
      </h2>

      <div className="mt-4">
        <CommentForm videoId={videoId} defaultName={defaultName} />
      </div>

      {comments.length === 0 ? (
        <p className="mt-4 text-sm text-muted">No comments yet — start the conversation.</p>
      ) : (
        <ul className="mt-6 flex flex-col gap-5">
          {comments.map((comment) => (
            <li key={comment.id} className="flex gap-3">
              <span
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-semibold text-white"
                style={{ background: avatarColor(comment.author) }}
                aria-hidden
              >
                {comment.author.charAt(0).toUpperCase() || '?'}
              </span>

              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-baseline gap-2">
                  <span className="text-sm font-semibold">{comment.author}</span>
                  <span className="text-xs text-muted">{formatTimeAgo(comment.createdAt)}</span>
                </p>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed">
                  {comment.body}
                </p>
              </div>

              {viewerId === comment.authorId && (
                <form action={removeFromThisVideo} className="shrink-0">
                  <input type="hidden" name="id" value={comment.id} />
                  <button
                    type="submit"
                    className="rounded-full px-3 py-1 text-xs font-medium text-muted transition hover:bg-elevated hover:text-brand"
                  >
                    Delete
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
