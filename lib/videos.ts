import fs from 'node:fs/promises'
import path from 'node:path'
import { deleteCommentsForVideo } from './comments'
import { isValidId, newId } from './ids'
import { DATA_DIR, jsonStore } from './json-store'
import { deleteLikesForVideo } from './likes'

export type VideoStatus = 'pending' | 'ready'

export type Video = {
  id: string
  title: string
  description: string
  uploader: string
  ownerId: string
  ext: string
  mimeType: string
  size: number
  duration: number
  hasThumbnail: boolean
  views: number
  status: VideoStatus
  createdAt: string
}

export type NewVideo = {
  title: string
  description: string
  uploader: string
  ownerId: string
  ext: string
  mimeType: string
  size: number
  duration: number
  hasThumbnail: boolean
}

export const UPLOAD_DIR = path.join(DATA_DIR, 'uploads')
export const THUMB_DIR = path.join(DATA_DIR, 'thumbs')

const store = jsonStore<Video>('videos.json')

export function videoFilePath(video: Pick<Video, 'id' | 'ext'>): string {
  return path.join(UPLOAD_DIR, `${video.id}${video.ext}`)
}

export function thumbFilePath(id: string): string {
  return path.join(THUMB_DIR, `${id}.jpg`)
}

async function ensureDirs() {
  await Promise.all([
    fs.mkdir(UPLOAD_DIR, { recursive: true }),
    fs.mkdir(THUMB_DIR, { recursive: true }),
  ])
}

export async function listVideos(query?: string): Promise<Video[]> {
  const videos = (await store.read()).filter((video) => video.status === 'ready')
  videos.sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  const term = query?.trim().toLowerCase()
  if (!term) return videos

  return videos.filter((video) =>
    [video.title, video.description, video.uploader]
      .join(' ')
      .toLowerCase()
      .includes(term),
  )
}

export async function getVideo(id: string): Promise<Video | null> {
  if (!isValidId(id)) return null
  return (await store.read()).find((video) => video.id === id) ?? null
}

export async function createVideo(input: NewVideo): Promise<Video> {
  await ensureDirs()
  const video: Video = {
    id: newId(),
    ...input,
    views: 0,
    status: 'pending',
    createdAt: new Date().toISOString(),
  }

  await store.update((videos) => {
    videos.push(video)
    return video
  })

  return video
}

type VideoPatch = Partial<Pick<Video, 'status' | 'size' | 'hasThumbnail' | 'title' | 'description'>>

export async function updateVideo(id: string, patch: VideoPatch): Promise<Video | null> {
  if (!isValidId(id)) return null
  return store.update((videos) => {
    const video = videos.find((item) => item.id === id)
    if (!video) return null
    Object.assign(video, patch)
    return video
  })
}

export async function markReady(id: string, size: number): Promise<Video | null> {
  return updateVideo(id, { status: 'ready', size })
}

export async function recordView(id: string): Promise<number | null> {
  const video = await store.update((videos) => {
    const found = videos.find((item) => item.id === id && item.status === 'ready')
    if (!found) return null
    found.views += 1
    return found
  })
  return video?.views ?? null
}

export async function deleteVideo(id: string): Promise<Video | null> {
  const video = await store.update((videos) => {
    const index = videos.findIndex((item) => item.id === id)
    if (index === -1) return null
    return videos.splice(index, 1)[0]
  })

  if (!video) return null

  await Promise.all([
    fs.rm(videoFilePath(video), { force: true }),
    fs.rm(thumbFilePath(video.id), { force: true }),
    deleteCommentsForVideo(video.id),
    deleteLikesForVideo(video.id),
  ])

  return video
}
