import { cookies } from 'next/headers'
import { newId } from './ids'

const COOKIE = 'st_uid'
const FIVE_YEARS = 60 * 60 * 24 * 365 * 5

/**
 * Anonymous per-browser id. Uploads and comments belong to accounts now; this
 * is only what keeps likes to one per browser for signed-out viewers.
 */
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
