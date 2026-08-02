# SukkaTube

A small video platform. Anyone can upload a video and anyone can watch it — no
accounts, no sign-up.

Built with Next.js 16 (App Router), React 19 and Tailwind CSS 4.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Uploads and metadata are written to a `data/` directory at the project root,
which is created on first upload and is git-ignored.

## Features

- **Upload** — drag & drop or file picker, with a live progress bar. The poster
  frame and duration are read in the browser, so there is no `ffmpeg`
  dependency. Limit is 2 GB per file.
- **Playback** — HTML5 player served over an endpoint with full HTTP `Range`
  support, so seeking works properly.
- **Feed and search** — newest first, filtered by title, description or
  uploader name.
- **Comments** — one thread per video, posted through a Server Action.
- **Likes** — one like per browser, toggled optimistically. Counts show on the
  watch page, feed cards and the Up next list.
- **Light / dark theme** — follows the system preference until you pick one with
  the header toggle; the choice is remembered and applied before first paint.

## Identity model

There are no user accounts. On the first upload or comment the server sets an
anonymous id in an `httpOnly` cookie. That id decides:

- which videos you can delete
- which comments you can delete
- whether you have already liked a video

Clearing cookies gives you a fresh identity, which also means someone can like
a video again from another browser. That is the trade-off of running without
accounts.

## Project layout

```
app/
  page.tsx                        feed + search
  upload/page.tsx                 upload form
  watch/[id]/page.tsx             player, comments, Up next
  actions.ts                      Server Actions (views, comments, likes)
  api/videos/route.ts             POST — create a video record
  api/videos/[id]/route.ts        GET public metadata, DELETE (owner only)
  api/videos/[id]/file/route.ts   PUT — stream the upload to disk
  api/videos/[id]/stream/route.ts GET — Range-aware playback
  api/videos/[id]/thumbnail/...   GET — poster image
components/                       UI (client components where interactive)
lib/
  json-store.ts                   locked, atomic JSON collection on disk
  videos.ts  comments.ts  likes.ts
  identity.ts                     anonymous cookie identity
  format.ts  limits.ts  ids.ts  theme.ts
```

## How storage works

Metadata lives in JSON files under `data/`, each backed by the same small store
in `lib/json-store.ts`. Every read-modify-write is serialised through a promise
chain so concurrent requests cannot clobber one another, and writes go to a
temp file that is renamed into place so a crash cannot truncate the store.

```
data/
  videos.json
  comments.json
  likes.json
  uploads/<id>.<ext>     the uploaded files
  thumbs/<id>.jpg        poster frames
```

Uploads are streamed straight from the request body to disk rather than being
buffered in memory, and playback reads back a byte range per request.

Deleting a video removes its file, its thumbnail, its comments and its likes.

## Limitations

This is a single-server app. Before putting it somewhere public you would want
to replace two things:

- **Storage** — the local filesystem and JSON files assume one long-lived
  server with a persistent disk. On a serverless host, move the files to object
  storage (S3, R2) and the metadata to a real database.
- **Abuse controls** — there is no rate limiting, spam filtering or moderation.
  Uploads and comments are open to anyone who can reach the site.

## Scripts

```bash
npm run dev     # development server
npm run build   # production build
npm run start   # serve the production build
npm run lint    # eslint
```
