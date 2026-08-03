import { ImageResponse } from 'next/og'
import { BrandBadgeSvg } from '@/components/brand-mark'

export const size = { width: 64, height: 64 }
export const contentType = 'image/png'

/** Browser tab and bookmark icon. */
export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ display: 'flex', width: '100%', height: '100%' }}>
        <BrandBadgeSvg size={size.width} />
      </div>
    ),
    { ...size },
  )
}
