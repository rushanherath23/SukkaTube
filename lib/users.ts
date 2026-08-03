import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { newId } from './ids'
import { jsonStore } from './json-store'

export type User = {
  id: string
  /** Lowercased, the unique lookup key. */
  username: string
  /** As the account holder typed it — shown next to videos and comments. */
  displayName: string
  passwordHash: string
  dateOfBirth: string
  consentAcceptedAt: string
  createdAt: string
}

export type PublicUser = Omit<User, 'passwordHash'>

const store = jsonStore<User>('users.json')

const KEY_LENGTH = 64
const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const key = await scryptAsync(password.normalize('NFKC'), salt, KEY_LENGTH)
  return `scrypt:${salt.toString('base64url')}:${key.toString('base64url')}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, saltPart, keyPart] = stored.split(':')
  if (scheme !== 'scrypt' || !saltPart || !keyPart) return false

  const expected = Buffer.from(keyPart, 'base64url')
  const actual = await scryptAsync(
    password.normalize('NFKC'),
    Buffer.from(saltPart, 'base64url'),
    expected.length,
  )

  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

export function normaliseUsername(username: string): string {
  return username.trim().toLowerCase()
}

export function toPublicUser(user: User): PublicUser {
  const { passwordHash, ...pub } = user
  void passwordHash
  return pub
}

export async function findByUsername(username: string): Promise<User | null> {
  const key = normaliseUsername(username)
  return (await store.read()).find((user) => user.username === key) ?? null
}

export async function getUser(id: string): Promise<User | null> {
  return (await store.read()).find((user) => user.id === id) ?? null
}

/** Returns null when the username was taken — the check and the insert share one lock. */
export async function createUser(input: {
  username: string
  displayName: string
  passwordHash: string
  dateOfBirth: string
}): Promise<User | null> {
  const username = normaliseUsername(input.username)

  return store.update((users) => {
    if (users.some((user) => user.username === username)) return null

    const now = new Date().toISOString()
    const user: User = {
      id: newId(),
      username,
      displayName: input.displayName.trim() || input.username.trim(),
      passwordHash: input.passwordHash,
      dateOfBirth: input.dateOfBirth,
      consentAcceptedAt: now,
      createdAt: now,
    }

    users.push(user)
    return user
  })
}
