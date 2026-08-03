import { unzip, type Unzipped } from 'fflate'
import { MAX_UPLOAD_BYTES, VIDEO_EXTENSIONS, VIDEO_MIME_TYPES } from './limits'

export function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot === -1 ? '' : name.slice(dot).toLowerCase()
}

export function isVideoName(name: string): boolean {
  return (VIDEO_EXTENSIONS as readonly string[]).includes(extensionOf(name))
}

export function isZipFile(file: File): boolean {
  return /\.zip$/i.test(file.name) || file.type === 'application/zip' || file.type === 'application/x-zip-compressed'
}

function baseName(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1)
}

/** Skips directories, macOS resource forks and other dotfiles. */
function isWantedEntry(path: string): boolean {
  if (path.endsWith('/')) return false
  if (path.startsWith('__MACOSX/') || path.includes('/__MACOSX/')) return false
  if (baseName(path).startsWith('.')) return false
  return isVideoName(path)
}

/**
 * Pulls the videos out of a zip in the browser, so each one then follows the
 * normal upload path — poster frame included — and the server never has to
 * unpack anything.
 */
export async function extractVideosFromZip(zipFile: File): Promise<File[]> {
  if (zipFile.size > MAX_UPLOAD_BYTES) {
    throw new Error('That zip is larger than 2 GB — split it into smaller ones')
  }

  const bytes = new Uint8Array(await zipFile.arrayBuffer())

  const entries = await new Promise<Unzipped>((resolve, reject) => {
    unzip(bytes, { filter: (entry) => isWantedEntry(entry.name) }, (error, data) => {
      if (error) reject(new Error(`Could not read that zip: ${error.message}`))
      else resolve(data)
    })
  })

  const files = Object.entries(entries)
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
    .map(([path, data]) => {
      const name = baseName(path)
      return new File([data as BlobPart], name, {
        type: VIDEO_MIME_TYPES[extensionOf(name)] ?? 'video/mp4',
      })
    })
    .filter((file) => file.size > 0)

  if (files.length === 0) {
    throw new Error('No videos found in that zip')
  }

  return files
}
