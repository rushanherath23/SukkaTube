'use server'

import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/auth'
import { addComment, deleteComment, getComment } from '@/lib/comments'
import { ensureViewerId } from '@/lib/identity'
import { MAX_COMMENT_LENGTH } from '@/lib/limits'
import { type LikeState, toggleLike } from '@/lib/likes'
import { getVideo, recordView } from '@/lib/videos'

/** Called by the player once playback actually starts. */
export async function registerView(id: string): Promise<number | null> {
  return recordView(id)
}

export async function toggleVideoLike(videoId: string): Promise<LikeState | null> {
  const video = await getVideo(videoId)
  if (!video || video.status !== 'ready') return null

  // Liking stays open to signed-out viewers, keyed on the anonymous browser id.
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
  const user = await getCurrentUser()
  if (!user) return { error: 'Sign in to leave a comment' }

  const body = String(formData.get('body') ?? '').trim()
  if (!body) return { error: 'Write something first' }
  if (body.length > MAX_COMMENT_LENGTH) {
    return { error: `Comments are limited to ${MAX_COMMENT_LENGTH} characters` }
  }

  const video = await getVideo(videoId)
  if (!video || video.status !== 'ready') return { error: 'That video no longer exists' }

  await addComment({ videoId, author: user.displayName, authorId: user.id, body })
  revalidatePath(`/watch/${videoId}`)

  return { ok: true }
}

export async function removeComment(videoId: string, formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '')

  const user = await getCurrentUser()
  const comment = await getComment(id)
  // Only the author may remove a comment.
  if (!user || !comment || comment.authorId !== user.id) return

  await deleteComment(id)
  revalidatePath(`/watch/${videoId}`)
}
