import { randomBytes } from 'node:crypto'

const ID_PATTERN = /^[A-Za-z0-9_-]{6,24}$/

export function newId(): string {
  return randomBytes(8).toString('base64url')
}

/** Guards ids that end up in file paths or URLs. */
export function isValidId(id: string): boolean {
  return ID_PATTERN.test(id)
}
