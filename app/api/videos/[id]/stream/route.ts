import { createReadStream } from 'node:fs'
import fs from 'node:fs/promises'
import { Readable } from 'node:stream'
import { getVideo, videoFilePath } from '@/lib/videos'

function toWebStream(start: number, end: number, file: string) {
  const node = createReadStream(file, { start, end })
  return Readable.toWeb(node) as unknown as ReadableStream<Uint8Array>
}

/** Parses a single-range `Range` header. Returns null when absent, undefined when unsatisfiable. */
function parseRange(header: string | null, size: number) {
  if (!header) return null

  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim())
  if (!match) return undefined

  const [, rawStart, rawEnd] = match
  if (rawStart === '' && rawEnd === '') return undefined

  let start: number
  let end: number

  if (rawStart === '') {
    // Suffix range: the last N bytes.
    const suffix = Number(rawEnd)
    if (suffix <= 0) return undefined
    start = Math.max(0, size - suffix)
    end = size - 1
  } else {
    start = Number(rawStart)
    end = rawEnd === '' ? size - 1 : Math.min(Number(rawEnd), size - 1)
  }

  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= size) {
    return undefined
  }
  return { start, end }
}

export async function GET(request: Request, ctx: RouteContext<'/api/videos/[id]/stream'>) {
  const { id } = await ctx.params

  const video = await getVideo(id)
  if (!video || video.status !== 'ready') {
    return new Response('Not found', { status: 404 })
  }

  const file = videoFilePath(video)
  let size: number
  try {
    size = (await fs.stat(file)).size
  } catch {
    return new Response('Not found', { status: 404 })
  }

  const baseHeaders = {
    'Content-Type': video.mimeType || 'video/mp4',
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'public, max-age=31536000, immutable',
  }

  const range = parseRange(request.headers.get('range'), size)

  if (range === undefined) {
    return new Response('Range not satisfiable', {
      status: 416,
      headers: { ...baseHeaders, 'Content-Range': `bytes */${size}` },
    })
  }

  if (range === null) {
    return new Response(toWebStream(0, size - 1, file), {
      status: 200,
      headers: { ...baseHeaders, 'Content-Length': String(size) },
    })
  }

  const { start, end } = range
  return new Response(toWebStream(start, end, file), {
    status: 206,
    headers: {
      ...baseHeaders,
      'Content-Range': `bytes ${start}-${end}/${size}`,
      'Content-Length': String(end - start + 1),
    },
  })
}
