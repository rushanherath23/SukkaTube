# SukkaTube

A small video platform. Watching is open to everyone; uploading and commenting
need an account.

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

- **Accounts** — username and password, with the date of birth and an accepted
  consent checkbox recorded at sign-up. Only signed-in accounts can upload or
  comment.
- **Dashboard** — every account gets `/dashboard`: totals for its videos, its
  own categories to create and rename, and a row per video where the title,
  description, category and visibility can be changed or the video deleted.
- **Public or private** — a private video is for its owner alone. It is kept out
  of the feed, search and Up next, and the watch page, stream, poster frame and
  metadata endpoint all return 404 to anyone else, signed in or not. Visibility
  can be set at upload and changed later.
- **Upload** — drag & drop or file picker, one video or many. Each queued file
  gets its own title and description, and they upload one after another with a
  progress bar each; if one fails the rest carry on. The poster frame and
  duration are read in the browser, so there is no `ffmpeg` dependency. Limit is
  2 GB per file.
- **Zip uploads** — drop a `.zip` and the videos inside are unpacked in the
  browser (with [fflate](https://github.com/101arrowz/fflate)) and queued like
  any other file, folders flattened and `__MACOSX` junk skipped. The server
  never has to unpack anything, and zipped videos still get poster frames.
- **Playback** — HTML5 player served over an endpoint with full HTTP `Range`
  support, so seeking works properly.
- **Feed and search** — newest first, filtered by title, description or
  uploader name.
- **Comments** — one thread per video, posted through a Server Action.
- **Likes** — one like per browser, toggled optimistically. Counts show on the
  watch page, feed cards and the Up next list.
- **Light / dark theme** — follows the system preference until you pick one with
  the header toggle; the choice is remembered and applied before first paint.

## Accounts

Sign-up asks for a username, a password, a date of birth and a ticked consent
box. Accounts must be **18 or older** — the age is derived from the date of
birth and checked on the server, not just in the browser. The minimum lives in
`MIN_AGE` in `lib/limits.ts`.

Passwords are hashed with scrypt from Node's own `crypto` module (random salt
per user, constant-time comparison), so no password library is needed. A session
is a random 32-byte token in an `httpOnly` cookie; only its SHA-256 hash is
stored, so a leaked `sessions.json` cannot be used to sign in.

What an account gates:

| Action | Signed out | Signed in |
| --- | --- | --- |
| Watch public videos, search, like | yes | yes |
| Upload a video | no | yes |
| Comment | no | yes |
| Dashboard, categories, visibility | no | yes |
| Watch a private video | no | owner only |
| Delete your own video or comment | no | yes |

Categories belong to the account that created them. A video can only be filed
under one of its own owner's categories — the server checks, so a forged id in
the form is dropped. Deleting a category keeps its videos and leaves them
uncategorised.

Likes are still counted per browser through an anonymous `httpOnly` cookie, so
signed-out viewers can like. Clearing cookies allows a second like — the
trade-off of not requiring an account for it.

Videos and comments made before accounts existed keep their old anonymous owner
id, so nobody can delete them from the UI. To adopt them, set their `ownerId`
(or a comment's `authorId`) to your user id from `data/users.json`.

## Running behind nginx

The session cookie is marked `secure` only when the request arrived over HTTPS,
so the site still works over plain HTTP while you are setting it up. For that
detection to work behind a reverse proxy, pass the scheme through:

```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    client_max_body_size 2g;   # uploads go through this proxy
}
```

Serve the site over HTTPS in production — without it, session cookies travel in
clear text.

## Project layout

```
app/
  page.tsx                        feed + search
  upload/page.tsx                 upload form (signed-in only)
  watch/[id]/page.tsx             player, comments, Up next
  dashboard/page.tsx              manage your videos and categories
  login/page.tsx  signup/page.tsx
  actions.ts                      Server Actions (views, comments, likes)
  auth-actions.ts                 Server Actions (sign up, sign in, sign out)
  dashboard-actions.ts            Server Actions (categories, edit, delete)
  api/videos/route.ts             POST — create a video record
  api/videos/[id]/route.ts        GET public metadata, DELETE (owner only)
  api/videos/[id]/file/route.ts   PUT — stream the upload to disk
  api/videos/[id]/stream/route.ts GET — Range-aware playback
  api/videos/[id]/thumbnail/...   GET — poster image
components/                       UI (client components where interactive)
lib/
  json-store.ts                   locked, atomic JSON collection on disk
  videos.ts  comments.ts  likes.ts  categories.ts
  users.ts                        accounts + scrypt password hashing
  sessions.ts                     session tokens (hashed at rest)
  auth.ts                         session cookie, current user
  identity.ts                     anonymous cookie id, used for likes
  unzip.ts                        pulls videos out of a dropped zip
  video-preview.ts                poster frame, duration, upload with progress
  brand.ts  format.ts  limits.ts  ids.ts  theme.ts
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
  categories.json
  users.json             accounts (passwords hashed)
  sessions.json          live sessions (tokens hashed)
  uploads/<id>.<ext>     the uploaded files
  thumbs/<id>.jpg        poster frames
```

Back this directory up — it holds every account and every uploaded file.

Uploads are streamed straight from the request body to disk rather than being
buffered in memory, and playback reads back a byte range per request.

Deleting a video removes its file, its thumbnail, its comments and its likes.

## Limitations

This is a single-server app. Things worth knowing before it carries real
traffic:

- **Storage** — the local filesystem and JSON files assume one long-lived
  server with a persistent disk. On a serverless host, move the files to object
  storage (S3, R2) and the metadata to a real database.
- **Abuse controls** — there is no rate limiting, spam filtering or moderation
  queue, and sign-up is open to anyone.
- **Age is self-declared.** The 18+ check trusts the date of birth that was
  typed in. It records intent; it does not verify identity.
- **No password reset.** There is no email on file, so a forgotten password
  means editing `data/users.json` by hand.
- The consent checkbox records that the account holder agreed, with a
  timestamp. Write the actual terms they are agreeing to and link them from
  that checkbox.

## Scripts

```bash
npm run dev     # development server
npm run build   # production build
npm run start   # serve the production build
npm run lint    # eslint
```
