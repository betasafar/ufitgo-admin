import { ImageResponse } from "next/og"

export const size = { width: 180, height: 180 }
export const contentType = "image/png"

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#071e16",
          borderRadius: 37,
        }}
      >
        <svg width={180} height={180} viewBox="0 0 180 180">
          <g transform="translate(61 46) scale(3)">
            <path d="M27 21 A 14 14 0 1 1 11 5 A 11 11 0 1 0 27 21 Z" fill="#e6b91e" />
            <path d="M10 29 V 17 C 10 9, 18 7, 18 2 C 18 7, 26 9, 26 17 V 29 Z" fill="#d8fff0" />
            <rect x="8" y="29" width="20" height="3" fill="#d8fff0" />
          </g>
          <circle cx="148" cy="32" r="13" fill="#ef3340" />
        </svg>
      </div>
    ),
    { ...size },
  )
}
