import { isValidId, newId } from './ids'
import { jsonStore } from './json-store'
import { MAX_CATEGORY_NAME_LENGTH } from './limits'
import { clearCategoryFromVideos } from './videos'

export type Category = {
  id: string
  /** Categories belong to the account that made them. */
  ownerId: string
  name: string
  createdAt: string
}

const store = jsonStore<Category>('categories.json')

function tidy(name: string): string {
  return name.trim().replace(/\s+/g, ' ').slice(0, MAX_CATEGORY_NAME_LENGTH)
}

export async function listCategories(ownerId: string): Promise<Category[]> {
  const categories = (await store.read()).filter((item) => item.ownerId === ownerId)
  categories.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
  return categories
}

export async function getCategory(id: string): Promise<Category | null> {
  if (!isValidId(id)) return null
  return (await store.read()).find((item) => item.id === id) ?? null
}

/** Returns null when the owner already has a category by that name. */
export async function createCategory(ownerId: string, name: string): Promise<Category | null> {
  const clean = tidy(name)
  if (!clean) return null

  return store.update((categories) => {
    const taken = categories.some(
      (item) =>
        item.ownerId === ownerId && item.name.toLowerCase() === clean.toLowerCase(),
    )
    if (taken) return null

    const category: Category = {
      id: newId(),
      ownerId,
      name: clean,
      createdAt: new Date().toISOString(),
    }
    categories.push(category)
    return category
  })
}

export async function renameCategory(
  id: string,
  ownerId: string,
  name: string,
): Promise<Category | null> {
  const clean = tidy(name)
  if (!clean || !isValidId(id)) return null

  return store.update((categories) => {
    const category = categories.find((item) => item.id === id && item.ownerId === ownerId)
    if (!category) return null

    const taken = categories.some(
      (item) =>
        item.id !== id &&
        item.ownerId === ownerId &&
        item.name.toLowerCase() === clean.toLowerCase(),
    )
    if (taken) return null

    category.name = clean
    return category
  })
}

/** Removing a category leaves its videos in place, just uncategorised. */
export async function deleteCategory(id: string, ownerId: string): Promise<boolean> {
  if (!isValidId(id)) return false

  const removed = await store.update((categories) => {
    const index = categories.findIndex((item) => item.id === id && item.ownerId === ownerId)
    if (index === -1) return null
    return categories.splice(index, 1)[0]
  })

  if (!removed) return false

  await clearCategoryFromVideos(id)
  return true
}

export async function deleteCategoriesForOwner(ownerId: string): Promise<number> {
  const removed = await store.update((categories) => {
    const keep = categories.filter((item) => item.ownerId !== ownerId)
    const count = categories.length - keep.length
    if (count === 0) return null
    categories.splice(0, categories.length, ...keep)
    return count
  })
  return removed ?? 0
}
