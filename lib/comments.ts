import { isValidId, newId } from './ids'
import { jsonStore } from './json-store'
import { MAX_AUTHOR_LENGTH, MAX_COMMENT_LENGTH } from './limits'

export type Comment = {
  id: string
  videoId: string
  author: string
  authorId: string
  body: string
  createdAt: string
}

const store = jsonStore<Comment>('comments.json')

export async function listComments(videoId: string): Promise<Comment[]> {
  if (!isValidId(videoId)) return []
  const comments = (await store.read()).filter((item) => item.videoId === videoId)
  comments.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return comments
}

export async function addComment(input: {
  videoId: string
  author: string
  authorId: string
  body: string
}): Promise<Comment> {
  const comment: Comment = {
    id: newId(),
    videoId: input.videoId,
    author: input.author.slice(0, MAX_AUTHOR_LENGTH) || 'Anonymous',
    authorId: input.authorId,
    body: input.body.slice(0, MAX_COMMENT_LENGTH),
    createdAt: new Date().toISOString(),
  }

  await store.update((comments) => {
    comments.push(comment)
    return comment
  })

  return comment
}

export async function getComment(id: string): Promise<Comment | null> {
  if (!isValidId(id)) return null
  return (await store.read()).find((item) => item.id === id) ?? null
}

export async function deleteComment(id: string): Promise<Comment | null> {
  if (!isValidId(id)) return null
  return store.update((comments) => {
    const index = comments.findIndex((item) => item.id === id)
    if (index === -1) return null
    return comments.splice(index, 1)[0]
  })
}

/** Called when a video is removed so its thread doesn't linger. */
export async function deleteCommentsForVideo(videoId: string): Promise<number> {
  const removed = await store.update((comments) => {
    const keep = comments.filter((item) => item.videoId !== videoId)
    const count = comments.length - keep.length
    if (count === 0) return null
    comments.splice(0, comments.length, ...keep)
    return count
  })
  return removed ?? 0
}
