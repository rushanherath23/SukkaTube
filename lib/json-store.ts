import fs from 'node:fs/promises'
import path from 'node:path'

export const DATA_DIR = path.join(process.cwd(), 'data')

/**
 * A tiny append-and-rewrite JSON collection on disk. Every read-modify-write is
 * serialised through a promise chain so concurrent requests can't clobber each
 * other, and writes go through a temp file so a crash can't truncate the store.
 */
export function jsonStore<T>(fileName: string) {
  const file = path.join(DATA_DIR, fileName)
  let queue: Promise<unknown> = Promise.resolve()

  async function read(): Promise<T[]> {
    try {
      const parsed: unknown = JSON.parse(await fs.readFile(file, 'utf8'))
      return Array.isArray(parsed) ? (parsed as T[]) : []
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
      throw error
    }
  }

  async function write(items: T[]) {
    await fs.mkdir(DATA_DIR, { recursive: true })
    const tmp = `${file}.${process.pid}.tmp`
    await fs.writeFile(tmp, JSON.stringify(items, null, 2), 'utf8')
    await fs.rename(tmp, file)
  }

  /**
   * Runs `mutate` against the current items under the lock. The file is written
   * back unless `mutate` returns `null`, which means "nothing changed".
   */
  function update<R>(mutate: (items: T[]) => R): Promise<R> {
    const run = async () => {
      const items = await read()
      const result = mutate(items)
      if (result !== null) await write(items)
      return result
    }

    const next = queue.then(run, run)
    queue = next.then(
      () => undefined,
      () => undefined,
    )
    return next
  }

  return { read, update }
}
