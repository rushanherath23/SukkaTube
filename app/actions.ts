'use server'

import { recordView } from '@/lib/videos'

/** Called by the player once playback actually starts. */
export async function registerView(id: string): Promise<number | null> {
  return recordView(id)
}
