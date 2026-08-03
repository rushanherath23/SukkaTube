'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useActionState } from 'react'
import { removeVideo, saveVideo } from '@/app/dashboard-actions'
import { PlayMark } from '@/components/brand-mark'
import { INPUT_CLASS, PRIMARY_BUTTON_CLASS } from '@/components/form-styles'
import type { Category } from '@/lib/categories'
import { formatDuration, formatTimeAgo, formatViews } from '@/lib/format'
import type { Video } from '@/lib/videos'

export function VideoManagerRow({
  video,
  categories,
  likes,
  comments,
}: {
  video: Video
  categories: Category[]
  likes: number
  comments: number
}) {
  const [state, formAction, pending] = useActionState(saveVideo, {})
  const isPrivate = video.visibility === 'private'

  return (
    <li className="rounded-2xl border border-line bg-surface p-4">
      <div className="flex flex-col gap-4 sm:flex-row">
        <Link
          href={`/watch/${video.id}`}
          className="relative aspect-video w-full shrink-0 overflow-hidden rounded-xl bg-elevated sm:w-40"
        >
          {video.hasThumbnail ? (
            <Image
              src={`/api/videos/${video.id}/thumbnail`}
              alt=""
              fill
              unoptimized
              sizes="160px"
              className="object-cover"
            />
          ) : (
            <span className="grid h-full w-full place-items-center">
              <PlayMark className="h-8 w-8 fill-muted/50" />
            </span>
          )}
          {video.duration > 0 && (
            <span className="absolute bottom-1.5 right-1.5 rounded bg-black/80 px-1.5 py-0.5 text-xs tabular-nums text-white">
              {formatDuration(video.duration)}
            </span>
          )}
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="min-w-0 flex-1 truncate font-semibold">{video.title}</h3>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                isPrivate ? 'bg-elevated text-muted' : 'bg-brand/10 text-brand-ink'
              }`}
            >
              {isPrivate ? 'Private' : 'Public'}
            </span>
          </div>

          <p className="mt-1 text-sm text-muted">
            {formatViews(video.views)} · {likes} like{likes === 1 ? '' : 's'} · {comments} comment
            {comments === 1 ? '' : 's'} · {formatTimeAgo(video.createdAt)}
          </p>

          <details className="mt-3">
            <summary className="cursor-pointer text-sm font-medium text-brand-ink">Edit</summary>

            <form action={formAction} className="mt-3 flex flex-col gap-3">
              <input type="hidden" name="id" value={video.id} />

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted">Title</span>
                <input
                  name="title"
                  defaultValue={video.title}
                  maxLength={200}
                  required
                  disabled={pending}
                  className={INPUT_CLASS}
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted">Description</span>
                <textarea
                  name="description"
                  defaultValue={video.description}
                  maxLength={5000}
                  rows={3}
                  disabled={pending}
                  className={`resize-y ${INPUT_CLASS}`}
                />
              </label>

              <div className="flex flex-wrap gap-3">
                <label className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <span className="text-xs font-medium text-muted">Category</span>
                  <select
                    name="categoryId"
                    defaultValue={video.categoryId ?? ''}
                    disabled={pending}
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
                    name="visibility"
                    defaultValue={video.visibility ?? 'public'}
                    disabled={pending}
                    className={INPUT_CLASS}
                  >
                    <option value="public">Public — everyone can watch</option>
                    <option value="private">Private — only you</option>
                  </select>
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button type="submit" disabled={pending} className={PRIMARY_BUTTON_CLASS}>
                  {pending ? 'Saving…' : 'Save changes'}
                </button>

                <button
                  type="submit"
                  formAction={removeVideo}
                  disabled={pending}
                  onClick={(event) => {
                    if (!window.confirm(`Delete “${video.title}” permanently?`)) {
                      event.preventDefault()
                    }
                  }}
                  className="rounded-full px-4 py-2 text-sm font-medium text-brand-ink transition hover:bg-elevated disabled:opacity-50"
                >
                  Delete video
                </button>

                {state?.ok && <span className="text-sm text-muted">{state.ok}</span>}
                {state?.error && <span className="text-sm text-brand-ink">{state.error}</span>}
              </div>
            </form>
          </details>
        </div>
      </div>
    </li>
  )
}
