import { cookies } from 'next/headers'
import { newId } from './ids'

const COOKIE = 'st_uid'
const NAME_COOKIE = 'st_name'
const FIVE_YEARS = 60 * 60 * 24 * 365 * 5

/** Anonymous per-browser id. Lets an uploader manage the videos they posted. */
export async function getViewerId(): Promise<string | null> {
  const store = await cookies()
  return store.get(COOKIE)?.value ?? null
}

export async function ensureViewerId(): Promise<string> {
  const store = await cookies()
  const existing = store.get(COOKIE)?.value
  if (existing) return existing

  const id = newId()
  store.set(COOKIE, id, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: FIVE_YEARS,
  })
  return id
}

/** The name last used to comment, so the field can be prefilled server-side. */
export async function getDisplayName(): Promise<string> {
  const store = await cookies()
  return store.get(NAME_COOKIE)?.value ?? ''
}

export async function rememberDisplayName(name: string): Promise<void> {
  const store = await cookies()
  store.set(NAME_COOKIE, name, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: FIVE_YEARS,
  })
}
