export type VideoPreview = {
  thumbnail: string | null
  duration: number
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** Seeks and waits for a frame to actually be presented, not just for `seeked` to fire. */
function seekTo(video: HTMLVideoElement, time: number) {
  return new Promise<void>((resolve) => {
    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve()
    }
    const timer = setTimeout(finish, 3000)

    video.addEventListener('error', finish, { once: true })
    video.addEventListener(
      'seeked',
      () => {
        // On a cold decode `seeked` can beat the first painted frame, so wait for
        // one presented frame where the browser can tell us about it.
        if (typeof video.requestVideoFrameCallback === 'function') {
          video.requestVideoFrameCallback(() => finish())
          setTimeout(finish, 500)
        } else {
          setTimeout(finish, 120)
        }
      },
      { once: true },
    )

    video.currentTime = time
  })
}

/** True when every sampled pixel is the same — i.e. the decoder gave us nothing. */
function isBlank(context: CanvasRenderingContext2D, width: number, height: number) {
  const { data } = context.getImageData(0, 0, width, height)
  let min = 255
  let max = 0
  for (let i = 0; i < data.length; i += 4) {
    const luma = (data[i] + data[i + 1] + data[i + 2]) / 3
    if (luma < min) min = luma
    if (luma > max) max = luma
    if (max - min > 6) return false
  }
  return true
}

/** Grabs a poster frame and the duration straight from the browser's decoder. */
export async function readVideoPreview(file: File): Promise<VideoPreview> {
  const url = URL.createObjectURL(file)
  const video = document.createElement('video')
  video.preload = 'auto'
  video.muted = true
  video.playsInline = true

  try {
    const duration = await new Promise<number>((resolve, reject) => {
      video.onloadedmetadata = () => resolve(Number.isFinite(video.duration) ? video.duration : 0)
      video.onerror = () => reject(new Error('This file could not be decoded by your browser'))
      video.src = url
    })

    const width = video.videoWidth
    const height = video.videoHeight
    if (!width || !height) return { thumbnail: null, duration }

    const scale = Math.min(1, 640 / width)
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(width * scale)
    canvas.height = Math.round(height * scale)
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) return { thumbnail: null, duration }

    // A frame a quarter of the way in is usually more representative than frame zero;
    // fall back to other timestamps if that one decodes blank.
    const candidates = duration > 0 ? [Math.min(duration * 0.25, 10), duration * 0.5, 0.1, 0] : [0]

    for (const time of candidates) {
      await seekTo(video, Math.min(time, Math.max(duration - 0.05, 0)))

      for (let retry = 0; retry < 2; retry++) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height)
        if (!isBlank(context, canvas.width, canvas.height)) {
          return { thumbnail: canvas.toDataURL('image/jpeg', 0.72), duration }
        }
        await delay(200)
      }
    }

    return { thumbnail: null, duration }
  } finally {
    video.removeAttribute('src')
    video.load()
    URL.revokeObjectURL(url)
  }
}

/** PUTs the bytes with progress reporting, which `fetch` still can't do. */
export function putFile(url: string, file: File, onProgress: (fraction: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', url)

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total)
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve()
      let message = `Upload failed (${xhr.status})`
      try {
        message = JSON.parse(xhr.responseText).error ?? message
      } catch {
        // keep the status-code message
      }
      reject(new Error(message))
    }
    xhr.onerror = () => reject(new Error('Network error during upload'))
    xhr.onabort = () => reject(new Error('Upload cancelled'))

    xhr.send(file)
  })
}
