const WEB_ANGLES = [4, 20, 36, 52, 68, 84].map((degrees) => (degrees * Math.PI) / 180)
const WEB_RINGS = [44, 82, 124, 170, 220]

const webPoint = (radius: number, angle: number) =>
  `${(radius * Math.cos(angle)).toFixed(1)} ${(radius * Math.sin(angle)).toFixed(1)}`

// The sine wobble keeps the rings from looking machine drawn, and each thread sags toward the corner.
const webPath = [
  ...WEB_ANGLES.map((angle) => `M0 0L${webPoint(236, angle)}`),
  ...WEB_RINGS.map((ring, r) =>
    WEB_ANGLES.slice(1).map((angle, i) => {
      const before = WEB_ANGLES[i]
      const wobble = (spoke: number) => ring * (1 + 0.05 * Math.sin(spoke * 2.3 + r))
      return `M${webPoint(wobble(i), before)}Q${webPoint(ring * 0.84, (before + angle) / 2)} ${webPoint(wobble(i + 1), angle)}`
    }).join(''),
  ),
].join('')

const spiderLegs = [
  'M12 15C8 10 5 9 2 3', 'M11 17C7 15 4 14 0 11', 'M11 19C7 20 4 21 1 25', 'M12 21C9 24 7 27 5 31',
  'M20 15C24 10 27 9 30 3', 'M21 17C25 15 28 14 32 11', 'M21 19C25 20 28 21 31 25', 'M20 21C23 24 25 27 27 31',
]

function Web({ side }: { side: 'left' | 'right' }) {
  return (
    <svg className={`web web-${side}`} viewBox="0 0 240 240">
      <path d={webPath} />
    </svg>
  )
}

function Ghost({ name }: { name: string }) {
  return (
    <div className={`ghost ghost-${name}`}>
      <svg viewBox="0 0 64 80">
        <path
          className="ghost-body"
          d="M8 34C8 16 19 4 32 4s24 12 24 30v38c0 3-3 4-5 2l-5-5c-2-2-4-2-6 0l-4 4c-2 2-5 2-7 0l-4-4c-2-2-4-2-6 0l-5 5c-2 2-6 1-6-2z"
        />
        <g className="ghost-eyes">
          <ellipse cx="24" cy="31" rx="3.5" ry="5" />
          <ellipse cx="40" cy="31" rx="3.5" ry="5" />
        </g>
        <ellipse className="ghost-mouth" cx="32" cy="44" rx="4" ry="5" />
      </svg>
    </div>
  )
}

// Sits behind the opaque cards, so it can never cover a figure or catch a tap.
export default function Halloween() {
  return (
    <div className="halloween" aria-hidden="true">
      <Web side="left" />
      <Web side="right" />
      <Ghost name="near" />
      <Ghost name="mid" />
      <Ghost name="far" />
      <div className="spider">
        <svg viewBox="0 0 32 34">
          <path className="spider-legs" d={spiderLegs.join('')} />
          <circle className="spider-body" cx="16" cy="18" r="6" />
          <circle className="spider-body" cx="16" cy="10.5" r="3.5" />
          <circle className="spider-eye" cx="14.6" cy="10" r="0.9" />
          <circle className="spider-eye" cx="17.4" cy="10" r="0.9" />
        </svg>
      </div>
    </div>
  )
}
