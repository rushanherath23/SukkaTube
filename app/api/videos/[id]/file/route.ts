import { createWriteStream } from 'node:fs'
import fs from 'node:fs/promises'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { getViewerId } from '@/lib/identity'
import {
  getVideo,
  markReady,
  MAX_UPLOAD_BYTES,
  UPLOAD_DIR,
  videoFilePath,
} from '@/lib/videos'

/** Receives the raw video bytes and streams them straight to disk. */
export async function PUT(request: Request, ctx: RouteContext<'/api/videos/[id]/file'>) {
  const { id } = await ctx.params

  const video = await getVideo(id)
  if (!video) {
    return Response.json({ error: 'Video not found' }, { status: 404 })
  }
  if (video.status === 'ready') {
    return Response.json({ error: 'This video was already uploaded' }, { status: 409 })
  }

  const viewerId = await getViewerId()
  if (viewerId !== video.ownerId) {
    return Response.json({ error: 'Not your upload' }, { status: 403 })
  }

  const declared = Number(request.headers.get('content-length') ?? 0)
  if (declared > MAX_UPLOAD_BYTES) {
    return Response.json({ error: 'File is larger than 2 GB' }, { status: 413 })
  }
  if (!request.body) {
    return Response.json({ error: 'Missing request body' }, { status: 400 })
  }

  const target = videoFilePath(video)
  await fs.mkdir(UPLOAD_DIR, { recursive: true })

  try {
    await pipeline(
      Readable.fromWeb(request.body as Parameters<typeof Readable.fromWeb>[0]),
      createWriteStream(target),
    )
  } catch {
    await fs.rm(target, { force: true })
    return Response.json({ error: 'Upload failed' }, { status: 500 })
  }

  const { size } = await fs.stat(target)
  if (size === 0) {
    await fs.rm(target, { force: true })
    return Response.json({ error: 'Uploaded file was empty' }, { status: 400 })
  }
  if (size > MAX_UPLOAD_BYTES) {
    await fs.rm(target, { force: true })
    return Response.json({ error: 'File is larger than 2 GB' }, { status: 413 })
  }

  await markReady(video.id, size)

  return Response.json({ id: video.id, size, status: 'ready' })
}
