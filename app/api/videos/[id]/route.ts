import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/auth'
import { deleteVideo, getVideo } from '@/lib/videos'

export async function GET(_request: Request, ctx: RouteContext<'/api/videos/[id]'>) {
  const { id } = await ctx.params
  const video = await getVideo(id)
  if (!video || video.status !== 'ready') {
    return Response.json({ error: 'Video not found' }, { status: 404 })
  }

  const { ownerId, ext, ...pub } = video
  void ownerId
  void ext
  return Response.json(pub)
}

export async function DELETE(_request: Request, ctx: RouteContext<'/api/videos/[id]'>) {
  const { id } = await ctx.params

  const video = await getVideo(id)
  if (!video) {
    return Response.json({ error: 'Video not found' }, { status: 404 })
  }

  const user = await getCurrentUser()
  if (!user) {
    return Response.json({ error: 'Sign in first' }, { status: 401 })
  }
  if (user.id !== video.ownerId) {
    return Response.json({ error: 'You can only delete your own uploads' }, { status: 403 })
  }

  await deleteVideo(id)
  revalidatePath('/')

  return Response.json({ id, deleted: true })
}
