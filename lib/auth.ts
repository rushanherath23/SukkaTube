import { cookies, headers } from 'next/headers'
import {
  createSession,
  deleteSession,
  getSessionUserId,
  SESSION_MAX_AGE_SECONDS,
} from './sessions'
import { getUser, type User } from './users'

const SESSION_COOKIE = 'st_session'

/**
 * Only mark the cookie `secure` when the request actually arrived over HTTPS —
 * otherwise the site would be impossible to log into behind plain HTTP. Put
 * `proxy_set_header X-Forwarded-Proto $scheme;` in your nginx config so this
 * can see the real scheme.
 */
async function isSecureRequest(): Promise<boolean> {
  const requestHeaders = await headers()
  const proto = requestHeaders.get('x-forwarded-proto')?.split(',')[0]?.trim()
  return proto === 'https'
}

export async function startSession(userId: string): Promise<void> {
  const token = await createSession(userId)
  const store = await cookies()

  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: await isSecureRequest(),
    maxAge: SESSION_MAX_AGE_SECONDS,
  })
}

export async function endSession(): Promise<void> {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (token) await deleteSession(token)
  store.delete(SESSION_COOKIE)
}

export async function getCurrentUser(): Promise<User | null> {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (!token) return null

  const userId = await getSessionUserId(token)
  if (!userId) return null

  return getUser(userId)
}

/** Keeps `?next=` redirects on this site. */
export function safeNext(next: string | null | undefined): string {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return '/'
  return next
}
