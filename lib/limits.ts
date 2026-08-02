/**
 * Shared by server-side validation and the client UI, so this module must stay
 * free of Node imports — client components bundle it.
 */
export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024 * 1024
export const MAX_COMMENT_LENGTH = 2000
export const MAX_AUTHOR_LENGTH = 60
