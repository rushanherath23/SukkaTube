/**
 * Shared by server-side validation and the client UI, so this module must stay
 * free of Node imports — client components bundle it.
 */
export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024 * 1024

/** Extensions the site accepts, both for direct uploads and inside a .zip. */
export const VIDEO_EXTENSIONS = [
  '.mp4',
  '.m4v',
  '.webm',
  '.ogg',
  '.ogv',
  '.mov',
  '.mkv',
  '.avi',
] as const

/** Extension → MIME type, used to label files pulled out of a zip. */
export const VIDEO_MIME_TYPES: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.m4v': 'video/mp4',
  '.webm': 'video/webm',
  '.ogg': 'video/ogg',
  '.ogv': 'video/ogg',
  '.mov': 'video/quicktime',
  '.mkv': 'video/x-matroska',
  '.avi': 'video/x-msvideo',
}
export const MAX_COMMENT_LENGTH = 2000
export const MAX_AUTHOR_LENGTH = 60

export const MAX_CATEGORY_NAME_LENGTH = 60

/** Accounts. */
export const MIN_AGE = 18
export const MIN_USERNAME_LENGTH = 3
export const MAX_USERNAME_LENGTH = 24
export const MIN_PASSWORD_LENGTH = 8
export const MAX_PASSWORD_LENGTH = 200
export const USERNAME_PATTERN = '[a-zA-Z0-9_]+'
