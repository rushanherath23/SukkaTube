import { ImageResponse } from 'next/og'
import { BrandBadgeSvg } from '@/components/brand-mark'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

/** Home screen icon on iOS, which needs a raster square rather than an SVG. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ display: 'flex', width: '100%', height: '100%' }}>
        <BrandBadgeSvg size={size.width} />
      </div>
    ),
    { ...size },
  )
}
