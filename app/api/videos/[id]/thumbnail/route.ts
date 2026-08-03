import fs from 'node:fs/promises'
import { getCurrentUser } from '@/lib/auth'
import { isValidId } from '@/lib/ids'
import { canWatch, getVideo, thumbFilePath } from '@/lib/videos'

export async function GET(_request: Request, ctx: RouteContext<'/api/videos/[id]/thumbnail'>) {
  const { id } = await ctx.params
  if (!isValidId(id)) return new Response('Not found', { status: 404 })

  // A private video's poster frame is private too.
  const video = await getVideo(id)
  if (!video) return new Response('Not found', { status: 404 })

  if (!canWatch(video, (await getCurrentUser())?.id ?? null)) {
    return new Response('Not found', { status: 404 })
  }

  try {
    const bytes = await fs.readFile(thumbFilePath(id))
    return new Response(new Uint8Array(bytes), {
      headers: {
        'Content-Type': 'image/jpeg',
        'Content-Length': String(bytes.byteLength),
        'Cache-Control': 'private, max-age=31536000, immutable',
      },
    })
  } catch {
    return new Response('Not found', { status: 404 })
  }
}
