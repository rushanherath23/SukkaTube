import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CategoryManager } from '@/components/category-manager'
import { VideoManagerRow } from '@/components/video-manager-row'
import { getCurrentUser } from '@/lib/auth'
import { listCategories } from '@/lib/categories'
import { getCommentCounts } from '@/lib/comments'
import { formatBytes } from '@/lib/format'
import { getLikeCounts } from '@/lib/likes'
import { isPublic, listVideosForOwner } from '@/lib/videos'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Manage your videos and categories.',
}

export default async function DashboardPage({ searchParams }: PageProps<'/dashboard'>) {
  const user = await getCurrentUser()
  if (!user) redirect('/login?next=%2Fdashboard')

  const { category: categoryParam } = await searchParams
  const activeCategory = typeof categoryParam === 'string' ? categoryParam : ''

  const [categories, allVideos, likeCounts, commentCounts] = await Promise.all([
    listCategories(user.id),
    listVideosForOwner(user.id),
    getLikeCounts(),
    getCommentCounts(),
  ])

  const videosByCategory = new Map<string, number>()
  for (const video of allVideos) {
    if (video.categoryId) {
      videosByCategory.set(video.categoryId, (videosByCategory.get(video.categoryId) ?? 0) + 1)
    }
  }

  const videos = activeCategory
    ? allVideos.filter((video) =>
        activeCategory === 'none' ? !video.categoryId : video.categoryId === activeCategory,
      )
    : allVideos

  const publicCount = allVideos.filter(isPublic).length
  const totalViews = allVideos.reduce((sum, video) => sum + video.views, 0)
  const totalBytes = allVideos.reduce((sum, video) => sum + video.size, 0)

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Your dashboard</h1>
          <p className="mt-1 text-sm text-muted">
            Signed in as <span className="font-medium text-ink">{user.displayName}</span>
          </p>
        </div>
        <Link
          href="/upload"
          className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-soft"
        >
          Upload videos
        </Link>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Videos" value={String(allVideos.length)} />
        <Stat label="Public" value={`${publicCount} of ${allVideos.length}`} />
        <Stat label="Views" value={String(totalViews)} />
        <Stat label="Storage" value={formatBytes(totalBytes)} />
      </dl>

      <div className="mt-8">
        <CategoryManager categories={categories} counts={videosByCategory} />
      </div>

      <section className="mt-8">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="mr-auto text-base font-semibold">Videos</h2>
          <Filter href="/dashboard" label="All" active={activeCategory === ''} />
          {categories.map((category) => (
            <Filter
              key={category.id}
              href={`/dashboard?category=${category.id}`}
              label={category.name}
              active={activeCategory === category.id}
            />
          ))}
          <Filter
            href="/dashboard?category=none"
            label="Uncategorised"
            active={activeCategory === 'none'}
          />
        </div>

        {videos.length === 0 ? (
          <p className="mt-6 rounded-2xl border border-line bg-surface p-6 text-sm text-muted">
            {allVideos.length === 0
              ? 'Nothing uploaded yet. Your videos will appear here once you publish one.'
              : 'No videos in this category.'}
          </p>
        ) : (
          <ul className="mt-4 flex flex-col gap-4">
            {videos.map((video) => (
              <VideoManagerRow
                key={video.id}
                video={video}
                categories={categories}
                likes={likeCounts.get(video.id) ?? 0}
                comments={commentCounts.get(video.id) ?? 0}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface px-4 py-3">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 text-lg font-semibold">{value}</dd>
    </div>
  )
}

function Filter({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
        active ? 'bg-brand text-white' : 'bg-elevated text-muted hover:text-ink'
      }`}
    >
      {label}
    </Link>
  )
}
