/**
 * Shared by server-side validation and the client UI, so this module must stay
 * free of Node imports — client components bundle it.
 */
export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024 * 1024
export const MAX_COMMENT_LENGTH = 2000
export const MAX_AUTHOR_LENGTH = 60

/** Accounts. */
export const MIN_AGE = 18
export const MIN_USERNAME_LENGTH = 3
export const MAX_USERNAME_LENGTH = 24
export const MIN_PASSWORD_LENGTH = 8
export const MAX_PASSWORD_LENGTH = 200
export const USERNAME_PATTERN = '[a-zA-Z0-9_]+'
