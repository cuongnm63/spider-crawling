const SUIT = '#24306b'
const ACCENT = '#ff8a1f'
const LENS_EDGE = '#0d1030'

/** Nhân vật "Nhện Nhí": gốc toạ độ ở chân, cao khoảng 75 đơn vị. */
export function Climber() {
  return (
    <g className="climber-body">
      <g stroke={SUIT} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path className="leg leg-l" d="M-6 -22 L-17 -13 L-12 0" />
        <path className="leg leg-r" d="M6 -22 L17 -13 L12 0" />
        <path className="arm arm-l" d="M-9 -38 L-21 -47 L-16 -62" />
        <path className="arm arm-r" d="M9 -38 L21 -47 L16 -62" />
      </g>
      {/* găng tay & giày */}
      <circle cx={-16} cy={-62} r={4.5} fill={ACCENT} />
      <circle cx={16} cy={-62} r={4.5} fill={ACCENT} />
      <ellipse cx={-12} cy={0} rx={5.5} ry={3.5} fill={ACCENT} />
      <ellipse cx={12} cy={0} rx={5.5} ry={3.5} fill={ACCENT} />
      {/* thân */}
      <rect x={-11} y={-42} width={22} height={24} rx={9} fill={SUIT} />
      <rect x={-11} y={-24} width={22} height={4} fill={ACCENT} />
      {/* biểu tượng nhện trên ngực */}
      <path d="M-6 -37 L6 -29 M6 -37 L-6 -29 M-7 -33 H7" stroke={ACCENT} strokeWidth={1.4} strokeLinecap="round" />
      <circle cy={-33} r={2.8} fill={ACCENT} />
      {/* râu */}
      <path d="M-4 -61 Q-8 -71 -13 -73 M4 -61 Q8 -71 13 -73" stroke={SUIT} strokeWidth={2} fill="none" strokeLinecap="round" />
      <circle cx={-13} cy={-73} r={2.2} fill={ACCENT} />
      <circle cx={13} cy={-73} r={2.2} fill={ACCENT} />
      {/* đầu & mắt */}
      <circle cy={-52} r={11.5} fill={SUIT} />
      <path d="M-9 -55 Q-3 -57 -1.5 -50 Q-7 -47.5 -9 -55Z" fill="#fff" stroke={LENS_EDGE} strokeWidth={1.5} />
      <path d="M9 -55 Q3 -57 1.5 -50 Q7 -47.5 9 -55Z" fill="#fff" stroke={LENS_EDGE} strokeWidth={1.5} />
    </g>
  )
}
