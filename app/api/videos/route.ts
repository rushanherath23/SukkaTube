import fs from 'node:fs/promises'
import path from 'node:path'
import { ensureViewerId } from '@/lib/identity'
import { MAX_UPLOAD_BYTES } from '@/lib/limits'
import { createVideo, thumbFilePath, THUMB_DIR, updateVideo } from '@/lib/videos'

const ALLOWED_EXTENSIONS = new Set([
  '.mp4',
  '.m4v',
  '.webm',
  '.ogg',
  '.ogv',
  '.mov',
  '.mkv',
  '.avi',
])

type CreateBody = {
  title?: unknown
  description?: unknown
  uploader?: unknown
  filename?: unknown
  mimeType?: unknown
  size?: unknown
  duration?: unknown
  thumbnail?: unknown
}

function asString(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

async function saveThumbnail(id: string, dataUrl: string): Promise<boolean> {
  const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl)
  if (!match) return false

  const bytes = Buffer.from(match[2], 'base64')
  // A poster frame should never be this large; treat anything bigger as bogus.
  if (bytes.byteLength === 0 || bytes.byteLength > 4 * 1024 * 1024) return false

  await fs.mkdir(THUMB_DIR, { recursive: true })
  await fs.writeFile(thumbFilePath(id), bytes)
  return true
}

export async function POST(request: Request) {
  let body: CreateBody
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const filename = asString(body.filename, 260)
  const ext = path.extname(filename).toLowerCase()
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return Response.json(
      { error: `Unsupported file type "${ext || filename}"` },
      { status: 400 },
    )
  }

  const mimeType = asString(body.mimeType, 120)
  if (mimeType && !mimeType.startsWith('video/')) {
    return Response.json({ error: 'File is not a video' }, { status: 400 })
  }

  const size = typeof body.size === 'number' && Number.isFinite(body.size) ? body.size : 0
  if (size <= 0) {
    return Response.json({ error: 'File is empty' }, { status: 400 })
  }
  if (size > MAX_UPLOAD_BYTES) {
    return Response.json({ error: 'File is larger than 2 GB' }, { status: 413 })
  }

  const title = asString(body.title, 200) || path.basename(filename, ext) || 'Untitled'
  const duration =
    typeof body.duration === 'number' && Number.isFinite(body.duration) && body.duration > 0
      ? body.duration
      : 0

  const ownerId = await ensureViewerId()

  const video = await createVideo({
    title,
    description: asString(body.description, 5000),
    uploader: asString(body.uploader, 60) || 'Anonymous',
    ownerId,
    ext,
    mimeType: mimeType || 'video/mp4',
    size,
    duration,
    hasThumbnail: false,
  })

  let hasThumbnail = false
  if (typeof body.thumbnail === 'string' && body.thumbnail.startsWith('data:image/')) {
    hasThumbnail = await saveThumbnail(video.id, body.thumbnail)
    if (hasThumbnail) await updateVideo(video.id, { hasThumbnail: true })
  }

  return Response.json(
    { id: video.id, uploadUrl: `/api/videos/${video.id}/file`, hasThumbnail },
    { status: 201 },
  )
}
