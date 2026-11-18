import { Braces, CodeXml, Terminal, Orbit } from 'lucide-react'

export function AtlasGraphic({ active }: { active: boolean }) {
  return (
    <div className="atlas-art" data-active={active} aria-hidden="true">
      <svg viewBox="0 0 490 280" className="atlas-map" fill="none">
        <defs>
          <pattern id="atlas-grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill="currentColor" opacity=".28" />
          </pattern>
          <radialGradient id="atlas-fade">
            <stop offset="28%" stopColor="white" />
            <stop offset="78%" stopColor="white" stopOpacity=".64" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
          <mask id="atlas-mask"><rect width="490" height="280" fill="url(#atlas-fade)" /></mask>
        </defs>
        <g mask="url(#atlas-mask)">
          <rect width="490" height="280" fill="url(#atlas-grid)" />
          <path d="M25 139.5h440M245.5 8v266" stroke="currentColor" strokeOpacity=".4" strokeDasharray="3 6" />
          <circle cx="245" cy="140" r="127" stroke="currentColor" strokeOpacity=".45" />
          <circle cx="245" cy="140" r="101" stroke="currentColor" strokeOpacity=".66" />
          <circle cx="245" cy="140" r="73" stroke="currentColor" strokeOpacity=".68" strokeDasharray="3 5" />
          <circle cx="245" cy="140" r="46" stroke="currentColor" strokeOpacity=".55" />
          <ellipse cx="245" cy="140" rx="194" ry="48" transform="rotate(-23 245 140)" stroke="currentColor" strokeOpacity=".52" />
          <ellipse cx="245" cy="140" rx="178" ry="54" transform="rotate(23 245 140)" stroke="currentColor" strokeOpacity=".3" />
          <path d="M126 165h54l29-23m67-33 33-26h48m-80 91 37 29h48m-121-106-38-47h-35" stroke="currentColor" strokeOpacity=".8" />
          <g className="map-accent">
            <path className="atlas-signal" d="M144 140a101 101 0 1 1 202 0 101 101 0 1 1-202 0" pathLength="100" stroke="currentColor" strokeWidth="1.8" />
            <path d="M144 140a101 101 0 0 1 101-101m101 101a101 101 0 0 1-101 101" opacity=".61" strokeDasharray="19 5 3 13" stroke="currentColor" />
            <circle cx="144" cy="140" r="3.5" fill="currentColor" />
            <circle cx="309" cy="83" r="3" fill="currentColor" />
            <circle cx="335" cy="189" r="3" fill="currentColor" />
            <circle cx="195" cy="76" r="2" fill="currentColor" />
            <path d="M285 52h8m-4-4v8M103 109h8m-4-4v8m38 90h8m-4-4v8m236-59h8m-4-4v8" stroke="currentColor" opacity=".65" />
          </g>
        </g>
      </svg>
      <span className="map-node node-main"><Orbit /></span>
      <span className="map-node node-terminal"><Terminal /></span>
      <span className="map-node node-code"><CodeXml /></span>
      <span className="map-node node-braces"><Braces /></span>
      <span className="map-node node-file">SKILL.md</span>
    </div>
  )
}
