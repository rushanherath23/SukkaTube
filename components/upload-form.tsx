'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { ERROR_CLASS, INPUT_CLASS, PRIMARY_BUTTON_CLASS } from '@/components/form-styles'
import type { Category } from '@/lib/categories'
import { formatBytes, formatDuration } from '@/lib/format'
import { MAX_UPLOAD_BYTES } from '@/lib/limits'
import { extractVideosFromZip, isVideoName, isZipFile } from '@/lib/unzip'
import { putFile, readVideoPreview, type VideoPreview } from '@/lib/video-preview'
import type { Visibility } from '@/lib/videos'

type ItemStatus = 'reading' | 'ready' | 'uploading' | 'done' | 'failed'

type QueueItem = {
  key: string
  file: File
  title: string
  description: string
  preview: VideoPreview
  status: ItemStatus
  progress: number
  error?: string
  videoId?: string
}

const EMPTY_PREVIEW: VideoPreview = { thumbnail: null, duration: 0 }

function stripExtension(name: string): string {
  return name.replace(/\.[^.]+$/, '')
}

export function UploadForm({ categories }: { categories: Category[] }) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const keyCounter = useRef(0)

  // Applied to the whole batch; anything can be changed later in the dashboard.
  const [categoryId, setCategoryId] = useState('')
  const [visibility, setVisibility] = useState<Visibility>('public')
  const [items, setItems] = useState<QueueItem[]>([])
  const [notice, setNotice] = useState<string | null>(null)
  const [unpacking, setUnpacking] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [dragging, setDragging] = useState(false)

  function patch(key: string, changes: Partial<QueueItem>) {
    setItems((current) =>
      current.map((item) => (item.key === key ? { ...item, ...changes } : item)),
    )
  }

  async function addFiles(incoming: File[]) {
    if (incoming.length === 0) return
    setNotice(null)

    const accepted: File[] = []
    const problems: string[] = []

    for (const file of incoming) {
      if (isZipFile(file)) {
        setUnpacking(true)
        try {
          accepted.push(...(await extractVideosFromZip(file)))
        } catch (cause) {
          problems.push(cause instanceof Error ? cause.message : `Could not read ${file.name}`)
        } finally {
          setUnpacking(false)
        }
        continue
      }

      if (!file.type.startsWith('video/') && !isVideoName(file.name)) {
        problems.push(`${file.name} is not a video`)
      } else if (file.size > MAX_UPLOAD_BYTES) {
        problems.push(`${file.name} is ${formatBytes(file.size)} — the limit is 2 GB each`)
      } else {
        accepted.push(file)
      }
    }

    if (problems.length > 0) setNotice(problems.join('. '))
    if (accepted.length === 0) return

    const added: QueueItem[] = accepted.map((file) => ({
      key: `item-${(keyCounter.current += 1)}`,
      file,
      title: stripExtension(file.name),
      description: '',
      preview: EMPTY_PREVIEW,
      status: 'reading',
      progress: 0,
    }))

    setItems((current) => [...current, ...added])

    // One at a time: a batch of decoders fighting over the same video element
    // work is slower and more likely to hand back a blank frame.
    for (const item of added) {
      try {
        patch(item.key, { preview: await readVideoPreview(item.file), status: 'ready' })
      } catch {
        // A missing poster frame is not fatal — the upload can still go ahead.
        patch(item.key, { status: 'ready' })
      }
    }
  }

  async function publish(event: React.FormEvent) {
    event.preventDefault()
    if (publishing) return

    const queue = items.filter((item) => item.status !== 'done')
    if (queue.length === 0) return

    setNotice(null)
    setPublishing(true)

    let uploaded = 0
    let lastId: string | undefined

    for (const item of queue) {
      patch(item.key, { status: 'uploading', progress: 0, error: undefined })

      try {
        const created = await fetch('/api/videos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: item.title.trim() || item.file.name,
            description: item.description.trim(),
            filename: item.file.name,
            mimeType: item.file.type,
            size: item.file.size,
            duration: item.preview.duration,
            thumbnail: item.preview.thumbnail,
            categoryId,
            visibility,
          }),
        })

        const body = await created.json()
        if (!created.ok) throw new Error(body.error ?? 'Could not start the upload')

        let lastPercent = -1
        await putFile(body.uploadUrl, item.file, (fraction) => {
          const percent = Math.round(fraction * 100)
          if (percent === lastPercent) return
          lastPercent = percent
          patch(item.key, { progress: fraction })
        })

        patch(item.key, { status: 'done', progress: 1, videoId: body.id })
        uploaded += 1
        lastId = body.id
      } catch (cause) {
        patch(item.key, {
          status: 'failed',
          error: cause instanceof Error ? cause.message : 'Upload failed',
        })
      }
    }

    setPublishing(false)

    if (uploaded < queue.length) {
      setNotice(`${queue.length - uploaded} of ${queue.length} did not upload — see below.`)
    }
    // A single video goes straight to its page; a batch keeps its summary here.
    if (uploaded === 1 && items.length === 1 && lastId) {
      router.push(`/watch/${lastId}`)
    } else if (uploaded > 0) {
      router.refresh()
    }
  }

  const pending = items.filter((item) => item.status !== 'done')
  const finished = items.filter((item) => item.status === 'done')
  const readingAny = items.some((item) => item.status === 'reading')
  const busy = publishing || unpacking

  return (
    <form onSubmit={publish} className="flex flex-col gap-6">
      <div
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          if (!busy) void addFiles(Array.from(event.dataTransfer.files))
        }}
        className={`rounded-2xl border-2 border-dashed p-6 transition ${
          dragging ? 'border-brand bg-brand/5' : 'border-line bg-surface'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="video/*,.zip,application/zip"
          className="hidden"
          onChange={(event) => {
            void addFiles(Array.from(event.target.files ?? []))
            event.target.value = ''
          }}
        />

        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="flex w-full flex-col items-center gap-3 py-8 text-center disabled:opacity-60"
        >
          <span className="grid h-14 w-14 place-items-center rounded-full bg-elevated">
            <svg
              viewBox="0 0 24 24"
              className="h-6 w-6 stroke-brand-ink"
              fill="none"
              strokeWidth={2}
              aria-hidden
            >
              <path d="M12 16V4m0 0L7 9m5-5 5 5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" strokeLinecap="round" />
            </svg>
          </span>
          <span className="text-base font-semibold">
            {unpacking ? 'Unpacking zip…' : 'Drop videos here, or click to browse'}
          </span>
          <span className="text-sm text-muted">
            Pick as many as you like — or drop a .zip and the videos inside get queued up. Up to
            2 GB per file.
          </span>
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-3">
          <label className="flex min-w-0 flex-1 flex-col gap-1.5">
            <span className="text-xs font-medium text-muted">Category</span>
            <select
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              disabled={busy}
              className={INPUT_CLASS}
            >
              <option value="">No category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex min-w-0 flex-1 flex-col gap-1.5">
            <span className="text-xs font-medium text-muted">Visibility</span>
            <select
              value={visibility}
              onChange={(event) => setVisibility(event.target.value as Visibility)}
              disabled={busy}
              className={INPUT_CLASS}
            >
              <option value="public">Public — everyone can watch</option>
              <option value="private">Private — only you</option>
            </select>
          </label>
        </div>
        <p className="text-xs text-muted">
          Applies to everything in this batch.{' '}
          {categories.length === 0 && 'Create categories in your dashboard. '}
          You can change either per video later.
        </p>
      </div>

      {notice && <p className={ERROR_CLASS}>{notice}</p>}

      {items.length > 0 && (
        <ul className="flex flex-col gap-4">
          {items.map((item) => (
            <li
              key={item.key}
              className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-4 sm:flex-row"
            >
              <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-xl bg-elevated sm:w-44">
                {item.preview.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.preview.thumbnail} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full place-items-center px-2 text-center text-xs text-muted">
                    {item.status === 'reading' ? 'Reading video…' : 'No preview'}
                  </div>
                )}
                {item.preview.duration > 0 && (
                  <span className="absolute bottom-1.5 right-1.5 rounded bg-black/80 px-1.5 py-0.5 text-xs tabular-nums text-white">
                    {formatDuration(item.preview.duration)}
                  </span>
                )}
              </div>

              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <input
                  value={item.title}
                  onChange={(event) => patch(item.key, { title: event.target.value })}
                  maxLength={200}
                  required
                  disabled={busy || item.status === 'done'}
                  placeholder="Title"
                  aria-label={`Title for ${item.file.name}`}
                  className={INPUT_CLASS}
                />

                <details>
                  <summary className="cursor-pointer text-xs text-muted">Description</summary>
                  <textarea
                    value={item.description}
                    onChange={(event) => patch(item.key, { description: event.target.value })}
                    maxLength={5000}
                    rows={3}
                    disabled={busy || item.status === 'done'}
                    placeholder="What is this video about?"
                    className={`mt-2 w-full resize-y ${INPUT_CLASS}`}
                  />
                </details>

                <p className="truncate text-xs text-muted">
                  {item.file.name} · {formatBytes(item.file.size)}
                </p>

                {item.status === 'uploading' && (
                  <div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-elevated">
                      <div
                        className="h-full rounded-full bg-brand transition-[width] duration-200"
                        style={{ width: `${Math.round(item.progress * 100)}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      Uploading — {Math.round(item.progress * 100)}%
                    </p>
                  </div>
                )}

                {item.status === 'done' && item.videoId && (
                  <p className="text-xs text-muted">
                    Published ·{' '}
                    <Link href={`/watch/${item.videoId}`} className="text-brand-ink hover:underline">
                      Watch it
                    </Link>
                  </p>
                )}

                {item.status === 'failed' && <p className="text-xs text-brand-ink">{item.error}</p>}
              </div>

              {!busy && item.status !== 'done' && (
                <button
                  type="button"
                  onClick={() => setItems((current) => current.filter((i) => i.key !== item.key))}
                  aria-label={`Remove ${item.file.name}`}
                  className="self-start rounded-full px-3 py-1 text-xs font-medium text-muted transition hover:bg-elevated hover:text-brand-ink"
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={pending.length === 0 || busy || readingAny}
          className={PRIMARY_BUTTON_CLASS}
        >
          {publishing
            ? `Uploading ${finished.length + 1} of ${items.length}…`
            : pending.length > 1
              ? `Publish ${pending.length} videos`
              : 'Publish video'}
        </button>

        {finished.length > 0 && (
          <p className="text-sm text-muted">
            {finished.length} published ·{' '}
            <Link href="/" className="text-brand-ink hover:underline">
              Back to the feed
            </Link>
          </p>
        )}
      </div>
    </form>
  )
}
