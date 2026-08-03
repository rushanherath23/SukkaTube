import { ImageResponse } from 'next/og'
import { BrandBadgeSvg } from '@/components/brand-mark'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'SukkaTube'

/** Link preview for pages that don't have a video thumbnail of their own. */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 40,
          background: '#0d0d10',
          color: '#f3f3f5',
        }}
      >
        <BrandBadgeSvg size={180} />
        {/* Two spans are two flex items, so close the gap the layout leaves between them. */}
        <div style={{ display: 'flex', gap: 0, fontSize: 84, fontWeight: 600 }}>
          <span>Sukka</span>
          <span style={{ color: '#f87171', marginLeft: -14 }}>Tube</span>
        </div>
        <div style={{ fontSize: 32, color: '#9c9ca6' }}>Upload a video. Share the link.</div>
      </div>
    ),
    { ...size },
  )
}
