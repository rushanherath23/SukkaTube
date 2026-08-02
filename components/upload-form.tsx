'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { formatBytes, formatDuration } from '@/lib/format'
import { MAX_UPLOAD_BYTES } from '@/lib/limits'

const NAME_KEY = 'sukkatube:uploader'

type Stage = 'idle' | 'preparing' | 'uploading' | 'done'

type Preview = {
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
async function inspect(file: File): Promise<Preview> {
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

function putFile(url: string, file: File, onProgress: (fraction: number) => void) {
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

export function UploadForm() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<Preview>({ thumbnail: null, duration: 0 })
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [uploader, setUploader] = useState('')
  const [stage, setStage] = useState<Stage>('idle')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)

  async function chooseFile(next: File | undefined) {
    if (!next) return
    setError(null)

    // Restore the name used for previous uploads, without an SSR/client mismatch.
    setUploader((current) => current || localStorage.getItem(NAME_KEY) || '')

    if (!next.type.startsWith('video/')) {
      setError('That file is not a video')
      return
    }
    if (next.size > MAX_UPLOAD_BYTES) {
      setError(`That file is ${formatBytes(next.size)} — the limit is 2 GB`)
      return
    }

    setFile(next)
    setTitle((current) => current || next.name.replace(/\.[^.]+$/, ''))
    setPreview({ thumbnail: null, duration: 0 })
    setStage('preparing')

    try {
      setPreview(await inspect(next))
    } catch (cause) {
      // A missing poster frame is not fatal — the upload can still go ahead.
      console.warn(cause)
    } finally {
      setStage('idle')
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!file || stage === 'uploading') return

    setError(null)
    setProgress(0)
    setStage('uploading')

    try {
      const name = uploader.trim() || 'Anonymous'
      localStorage.setItem(NAME_KEY, name)

      const created = await fetch('/api/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim() || file.name,
          description: description.trim(),
          uploader: name,
          filename: file.name,
          mimeType: file.type,
          size: file.size,
          duration: preview.duration,
          thumbnail: preview.thumbnail,
        }),
      })

      const body = await created.json()
      if (!created.ok) throw new Error(body.error ?? 'Could not start the upload')

      await putFile(body.uploadUrl, file, setProgress)

      setStage('done')
      router.push(`/watch/${body.id}`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Upload failed')
      setStage('idle')
    }
  }

  const busy = stage === 'uploading' || stage === 'done'
  const percent = Math.round(progress * 100)

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          if (!busy) void chooseFile(event.dataTransfer.files[0])
        }}
        className={`rounded-2xl border-2 border-dashed p-6 transition ${
          dragging ? 'border-brand bg-brand/5' : 'border-line bg-surface'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(event) => void chooseFile(event.target.files?.[0])}
        />

        {file ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-xl bg-elevated sm:w-56">
              {preview.thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview.thumbnail} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full place-items-center text-xs text-muted">
                  {stage === 'preparing' ? 'Reading video…' : 'No preview'}
                </div>
              )}
              {preview.duration > 0 && (
                <span className="absolute bottom-1.5 right-1.5 rounded bg-black/80 px-1.5 py-0.5 text-xs tabular-nums text-white">
                  {formatDuration(preview.duration)}
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{file.name}</p>
              <p className="mt-1 text-sm text-muted">
                {formatBytes(file.size)}
                {preview.duration > 0 && ` · ${formatDuration(preview.duration)}`}
              </p>
              <button
                type="button"
                disabled={busy}
                onClick={() => inputRef.current?.click()}
                className="mt-3 rounded-full bg-elevated px-4 py-2 text-sm font-medium transition hover:bg-line disabled:opacity-50"
              >
                Choose a different file
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex w-full flex-col items-center gap-3 py-10 text-center"
          >
            <span className="grid h-14 w-14 place-items-center rounded-full bg-elevated">
              <svg viewBox="0 0 24 24" className="h-6 w-6 stroke-brand" fill="none" strokeWidth={2} aria-hidden>
                <path d="M12 16V4m0 0L7 9m5-5 5 5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" strokeLinecap="round" />
              </svg>
            </span>
            <span className="text-base font-semibold">Drop a video here, or click to browse</span>
            <span className="text-sm text-muted">MP4, WebM, MOV, MKV and friends — up to 2 GB</span>
          </button>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Title</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={200}
            required
            disabled={busy}
            placeholder="Give your video a title"
            className="rounded-xl border border-line bg-surface px-4 py-2.5 text-sm outline-none transition focus:border-brand/60 disabled:opacity-50"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Description</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={5000}
            rows={4}
            disabled={busy}
            placeholder="What is this video about?"
            className="resize-y rounded-xl border border-line bg-surface px-4 py-2.5 text-sm outline-none transition focus:border-brand/60 disabled:opacity-50"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Your name</span>
          <input
            value={uploader}
            onChange={(event) => setUploader(event.target.value)}
            maxLength={60}
            disabled={busy}
            placeholder="Anonymous"
            className="rounded-xl border border-line bg-surface px-4 py-2.5 text-sm outline-none transition focus:border-brand/60 disabled:opacity-50"
          />
        </label>
      </div>

      {busy && (
        <div>
          <div className="h-2 overflow-hidden rounded-full bg-elevated">
            <div
              className="h-full rounded-full bg-brand transition-[width] duration-200"
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="mt-2 text-sm text-muted">
            {stage === 'done' ? 'Finishing up…' : `Uploading — ${percent}%`}
          </p>
        </div>
      )}

      {error && (
        <p className="rounded-xl border border-brand/40 bg-brand/10 px-4 py-3 text-sm text-brand-soft">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={!file || busy || stage === 'preparing'}
        className="self-start rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-soft disabled:cursor-not-allowed disabled:opacity-40"
      >
        {busy ? 'Uploading…' : 'Publish video'}
      </button>
    </form>
  )
}
