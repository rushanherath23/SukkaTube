'use server'

import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/auth'
import {
  createCategory,
  deleteCategory,
  getCategory,
  renameCategory,
} from '@/lib/categories'
import { MAX_CATEGORY_NAME_LENGTH } from '@/lib/limits'
import { deleteVideo, getVideo, updateVideo, type Visibility } from '@/lib/videos'

export type DashboardState = { error?: string; ok?: string }

function field(formData: FormData, name: string): string {
  return String(formData.get(name) ?? '').trim()
}

function refresh() {
  revalidatePath('/dashboard')
  revalidatePath('/')
}

export async function addCategory(
  _prevState: DashboardState,
  formData: FormData,
): Promise<DashboardState> {
  const user = await getCurrentUser()
  if (!user) return { error: 'Sign in first' }

  const name = field(formData, 'name')
  if (!name) return { error: 'Give the category a name' }
  if (name.length > MAX_CATEGORY_NAME_LENGTH) {
    return { error: `Keep it under ${MAX_CATEGORY_NAME_LENGTH} characters` }
  }

  const category = await createCategory(user.id, name)
  if (!category) return { error: 'You already have a category with that name' }

  refresh()
  return { ok: `Added “${category.name}”` }
}

export async function editCategory(formData: FormData): Promise<void> {
  const user = await getCurrentUser()
  if (!user) return

  const id = field(formData, 'id')
  const name = field(formData, 'name')
  if (!name) return

  await renameCategory(id, user.id, name)
  refresh()
}

export async function removeCategory(formData: FormData): Promise<void> {
  const user = await getCurrentUser()
  if (!user) return

  await deleteCategory(field(formData, 'id'), user.id)
  refresh()
}

/** Title, description, category and public/private, all from the one form. */
export async function saveVideo(
  _prevState: DashboardState,
  formData: FormData,
): Promise<DashboardState> {
  const user = await getCurrentUser()
  if (!user) return { error: 'Sign in first' }

  const video = await getVideo(field(formData, 'id'))
  if (!video || video.ownerId !== user.id) return { error: 'That video is not yours' }

  const title = field(formData, 'title').slice(0, 200)
  if (!title) return { error: 'A video needs a title' }

  const visibility: Visibility = formData.get('visibility') === 'private' ? 'private' : 'public'

  const requested = field(formData, 'categoryId')
  const category = requested ? await getCategory(requested) : null
  const categoryId = category && category.ownerId === user.id ? category.id : null

  await updateVideo(video.id, {
    title,
    description: field(formData, 'description').slice(0, 5000),
    categoryId,
    visibility,
  })

  refresh()
  revalidatePath(`/watch/${video.id}`)
  return { ok: 'Saved' }
}

export async function removeVideo(formData: FormData): Promise<void> {
  const user = await getCurrentUser()
  if (!user) return

  const video = await getVideo(field(formData, 'id'))
  if (!video || video.ownerId !== user.id) return

  await deleteVideo(video.id)
  refresh()
}
