import { Clock3 } from 'lucide-react'

// One holly leaf pointing along +x from the origin; the concave curves between points make the spikes.
const LEAF = 'M0 0Q2-1 2.5-3.5 4-2 6-3.8 7.5-2 9.5-3.2 10-1 12 0 10 1 9.5 3.2 7.5 2 6 3.8 4 2 2.5 3.5 2 1 0 0z'

export default function Brand() {
  return (
    <span className="brand">
      <span className="brand-mark">
        <Clock3 className="brand-clock" size={16} aria-hidden="true" />
        <svg className="brand-hat" viewBox="0 0 32 26" aria-hidden="true">
          <path className="hat-red" d="M4 20C5 11 10 4 17 4c5 0 9 3 10 8-3-2-6-2-7 0 1 3 3 6 4 8z" />
          <rect className="hat-fur" x="2" y="18" width="25" height="6" rx="3" />
          <circle className="hat-fur" cx="27" cy="12" r="3.2" />
        </svg>
      </span>
      Shiftly PH
      <svg className="brand-holly" viewBox="0 0 24 19" aria-hidden="true">
        {[-155, -25].map((angle) => (
          <g key={angle} transform={`translate(12 12) rotate(${angle})`}>
            <path className="holly-leaf" d={LEAF} />
            <path className="holly-vein" d="M1.5 0H10.5" />
          </g>
        ))}
        <circle className="holly-berry" cx="12" cy="13.5" r="2.2" />
        <circle className="holly-berry" cx="9.4" cy="15.2" r="2.2" />
        <circle className="holly-berry" cx="14.6" cy="15.2" r="2.2" />
      </svg>
    </span>
  )
}
