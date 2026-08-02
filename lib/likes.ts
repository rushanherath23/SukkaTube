import { isValidId } from './ids'
import { jsonStore } from './json-store'

type Like = {
  videoId: string
  viewerId: string
  createdAt: string
}

export type LikeState = {
  count: number
  liked: boolean
}

const store = jsonStore<Like>('likes.json')

function countFor(likes: Like[], videoId: string) {
  return likes.reduce((total, like) => (like.videoId === videoId ? total + 1 : total), 0)
}

export async function getLikeState(
  videoId: string,
  viewerId: string | null,
): Promise<LikeState> {
  if (!isValidId(videoId)) return { count: 0, liked: false }

  const likes = await store.read()
  return {
    count: countFor(likes, videoId),
    liked: viewerId
      ? likes.some((like) => like.videoId === videoId && like.viewerId === viewerId)
      : false,
  }
}

/** Like totals for every video, in one pass — for feed listings. */
export async function getLikeCounts(): Promise<Map<string, number>> {
  const counts = new Map<string, number>()
  for (const like of await store.read()) {
    counts.set(like.videoId, (counts.get(like.videoId) ?? 0) + 1)
  }
  return counts
}

/** One like per browser: clicking again removes it. */
export async function toggleLike(videoId: string, viewerId: string): Promise<LikeState> {
  return store.update((likes) => {
    const index = likes.findIndex(
      (like) => like.videoId === videoId && like.viewerId === viewerId,
    )

    if (index === -1) {
      likes.push({ videoId, viewerId, createdAt: new Date().toISOString() })
    } else {
      likes.splice(index, 1)
    }

    return { count: countFor(likes, videoId), liked: index === -1 }
  })
}

export async function deleteLikesForVideo(videoId: string): Promise<number> {
  const removed = await store.update((likes) => {
    const keep = likes.filter((like) => like.videoId !== videoId)
    const count = likes.length - keep.length
    if (count === 0) return null
    likes.splice(0, likes.length, ...keep)
    return count
  })
  return removed ?? 0
}
