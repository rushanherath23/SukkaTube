'use server'

import { revalidatePath } from 'next/cache'
import { addComment, deleteComment, getComment } from '@/lib/comments'
import { ensureViewerId, getViewerId, rememberDisplayName } from '@/lib/identity'
import { MAX_AUTHOR_LENGTH, MAX_COMMENT_LENGTH } from '@/lib/limits'
import { type LikeState, toggleLike } from '@/lib/likes'
import { getVideo, recordView } from '@/lib/videos'

/** Called by the player once playback actually starts. */
export async function registerView(id: string): Promise<number | null> {
  return recordView(id)
}

export async function toggleVideoLike(videoId: string): Promise<LikeState | null> {
  const video = await getVideo(videoId)
  if (!video || video.status !== 'ready') return null

  const viewerId = await ensureViewerId()
  const state = await toggleLike(videoId, viewerId)

  // So the feed shows the new total when the viewer navigates back to it.
  revalidatePath('/')

  return state
}

export type CommentFormState = { error?: string; ok?: boolean }

export async function postComment(
  videoId: string,
  _prevState: CommentFormState,
  formData: FormData,
): Promise<CommentFormState> {
  const body = String(formData.get('body') ?? '').trim()
  if (!body) return { error: 'Write something first' }
  if (body.length > MAX_COMMENT_LENGTH) {
    return { error: `Comments are limited to ${MAX_COMMENT_LENGTH} characters` }
  }

  const video = await getVideo(videoId)
  if (!video || video.status !== 'ready') return { error: 'That video no longer exists' }

  const author = String(formData.get('author') ?? '')
    .trim()
    .slice(0, MAX_AUTHOR_LENGTH)

  const authorId = await ensureViewerId()
  await rememberDisplayName(author || 'Anonymous')

  await addComment({ videoId, author: author || 'Anonymous', authorId, body })
  revalidatePath(`/watch/${videoId}`)

  return { ok: true }
}

export async function removeComment(videoId: string, formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '')

  const comment = await getComment(id)
  const viewerId = await getViewerId()
  // Only the author's browser may remove a comment.
  if (!comment || !viewerId || comment.authorId !== viewerId) return

  await deleteComment(id)
  revalidatePath(`/watch/${videoId}`)
}
