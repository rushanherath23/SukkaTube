import { randomBytes } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

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

export const DATA_DIR = path.join(process.cwd(), 'data')
export const UPLOAD_DIR = path.join(DATA_DIR, 'uploads')
export const THUMB_DIR = path.join(DATA_DIR, 'thumbs')

const DB_FILE = path.join(DATA_DIR, 'videos.json')

/** Max upload size: 2 GB. */
export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024 * 1024

const ID_PATTERN = /^[A-Za-z0-9_-]{6,24}$/

export function isValidId(id: string): boolean {
  return ID_PATTERN.test(id)
}

export function newId(): string {
  return randomBytes(8).toString('base64url')
}

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

async function readAll(): Promise<Video[]> {
  try {
    const raw = await fs.readFile(DB_FILE, 'utf8')
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as Video[]) : []
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw error
  }
}

async function writeAll(videos: Video[]) {
  await ensureDirs()
  const tmp = `${DB_FILE}.${process.pid}.tmp`
  await fs.writeFile(tmp, JSON.stringify(videos, null, 2), 'utf8')
  await fs.rename(tmp, DB_FILE)
}

// Serialise every read-modify-write so concurrent requests can't clobber the file.
let queue: Promise<unknown> = Promise.resolve()

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn)
  queue = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}

function update(mutate: (videos: Video[]) => Video | null) {
  return withLock(async () => {
    const videos = await readAll()
    const result = mutate(videos)
    if (result !== null) await writeAll(videos)
    return result
  })
}

export async function listVideos(query?: string): Promise<Video[]> {
  const videos = (await readAll()).filter((video) => video.status === 'ready')
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
  const videos = await readAll()
  return videos.find((video) => video.id === id) ?? null
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

  await withLock(async () => {
    const videos = await readAll()
    videos.push(video)
    await writeAll(videos)
  })

  return video
}

type VideoPatch = Partial<Pick<Video, 'status' | 'size' | 'hasThumbnail' | 'title' | 'description'>>

export async function updateVideo(id: string, patch: VideoPatch): Promise<Video | null> {
  if (!isValidId(id)) return null
  return update((videos) => {
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
  const video = await update((videos) => {
    const found = videos.find((item) => item.id === id && item.status === 'ready')
    if (!found) return null
    found.views += 1
    return found
  })
  return video?.views ?? null
}

export async function deleteVideo(id: string): Promise<Video | null> {
  const video = await update((videos) => {
    const index = videos.findIndex((item) => item.id === id)
    if (index === -1) return null
    return videos.splice(index, 1)[0]
  })

  if (!video) return null

  await Promise.all([
    fs.rm(videoFilePath(video), { force: true }),
    fs.rm(thumbFilePath(video.id), { force: true }),
  ])

  return video
}
