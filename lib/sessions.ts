import { createHash } from 'node:crypto'
import { newToken } from './ids'
import { jsonStore } from './json-store'

type Session = {
  /** SHA-256 of the cookie value, so the store never holds a usable token. */
  fingerprint: string
  userId: string
  createdAt: string
  expiresAt: string
}

export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30

const store = jsonStore<Session>('sessions.json')

function fingerprint(token: string): string {
  return createHash('sha256').update(token).digest('base64url')
}

function isLive(session: Session, now: number): boolean {
  return Date.parse(session.expiresAt) > now
}

/** Returns the raw token to put in the cookie; only its hash is stored. */
export async function createSession(userId: string): Promise<string> {
  const token = newToken()
  const now = Date.now()

  await store.update((sessions) => {
    // Opportunistically drop anything that has already lapsed.
    const live = sessions.filter((session) => isLive(session, now))
    live.push({
      fingerprint: fingerprint(token),
      userId,
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + SESSION_MAX_AGE_SECONDS * 1000).toISOString(),
    })
    sessions.splice(0, sessions.length, ...live)
    return live.length
  })

  return token
}

export async function getSessionUserId(token: string): Promise<string | null> {
  const key = fingerprint(token)
  const session = (await store.read()).find((item) => item.fingerprint === key)
  if (!session || !isLive(session, Date.now())) return null
  return session.userId
}

export async function deleteSession(token: string): Promise<void> {
  const key = fingerprint(token)
  await store.update((sessions) => {
    const index = sessions.findIndex((session) => session.fingerprint === key)
    if (index === -1) return null
    sessions.splice(index, 1)
    return index
  })
}

/** Used when an account is removed, or to sign a user out everywhere. */
export async function deleteSessionsForUser(userId: string): Promise<number> {
  const removed = await store.update((sessions) => {
    const keep = sessions.filter((session) => session.userId !== userId)
    const count = sessions.length - keep.length
    if (count === 0) return null
    sessions.splice(0, sessions.length, ...keep)
    return count
  })
  return removed ?? 0
}
