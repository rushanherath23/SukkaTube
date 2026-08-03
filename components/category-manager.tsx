'use client'

import { useActionState } from 'react'
import { addCategory, editCategory, removeCategory } from '@/app/dashboard-actions'
import { INPUT_CLASS, PRIMARY_BUTTON_CLASS } from '@/components/form-styles'
import type { Category } from '@/lib/categories'
import { MAX_CATEGORY_NAME_LENGTH } from '@/lib/limits'

export function CategoryManager({
  categories,
  counts,
}: {
  categories: Category[]
  counts: Map<string, number>
}) {
  const [state, formAction, pending] = useActionState(addCategory, {})

  return (
    <section className="rounded-2xl border border-line bg-surface p-4 sm:p-6">
      <h2 className="text-base font-semibold">Categories</h2>
      <p className="mt-1 text-sm text-muted">
        Your own labels for organising uploads. Deleting one keeps its videos — they just go back
        to having no category.
      </p>

      <form action={formAction} className="mt-4 flex flex-wrap gap-2">
        <input
          name="name"
          required
          maxLength={MAX_CATEGORY_NAME_LENGTH}
          placeholder="New category"
          aria-label="New category name"
          disabled={pending}
          className={`min-w-0 flex-1 sm:max-w-xs ${INPUT_CLASS}`}
        />
        <button type="submit" disabled={pending} className={PRIMARY_BUTTON_CLASS}>
          {pending ? 'Adding…' : 'Add'}
        </button>
      </form>

      {state?.error && <p className="mt-2 text-sm text-brand-ink">{state.error}</p>}

      {categories.length === 0 ? (
        <p className="mt-4 text-sm text-muted">No categories yet.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {categories.map((category) => (
            <li
              key={category.id}
              className="flex flex-wrap items-center gap-2 rounded-xl bg-elevated px-3 py-2"
            >
              <form action={editCategory} className="flex min-w-0 flex-1 items-center gap-2">
                <input type="hidden" name="id" value={category.id} />
                <input
                  name="name"
                  defaultValue={category.name}
                  maxLength={MAX_CATEGORY_NAME_LENGTH}
                  aria-label={`Rename ${category.name}`}
                  className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm outline-none transition focus:border-line focus:bg-surface"
                />
                <button
                  type="submit"
                  className="rounded-full px-3 py-1 text-xs font-medium text-muted transition hover:bg-surface hover:text-ink"
                >
                  Rename
                </button>
              </form>

              <span className="text-xs text-muted">
                {counts.get(category.id) ?? 0} video{(counts.get(category.id) ?? 0) === 1 ? '' : 's'}
              </span>

              <form
                action={removeCategory}
                onSubmit={(event) => {
                  if (!window.confirm(`Delete the category “${category.name}”?`)) {
                    event.preventDefault()
                  }
                }}
              >
                <input type="hidden" name="id" value={category.id} />
                <button
                  type="submit"
                  className="rounded-full px-3 py-1 text-xs font-medium text-muted transition hover:bg-surface hover:text-brand-ink"
                >
                  Delete
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
