import type { GameConfig } from '../game/config.ts'
import { fireStep, type Feedback, type Phase } from '../game/game.ts'
import { Climber } from './Climber.tsx'

const W = 400
const H = 700
const ROOF_Y = 130
const GROUND_Y = 625
const CX = 200

const HOLD_COLORS = ['#3ad1c6', '#ffd23f', '#ff7ab6', '#7cd35b', '#8f7bff']
const STARS = [
  [140, 40], [210, 22], [260, 70], [330, 35], [380, 95], [20, 120], [110, 95], [300, 100],
]
const TONGUE_HEIGHTS = [1, 0.8, 1.1, 0.9, 1.05, 0.85, 1, 0.95, 1.1]
// Cảnh vẽ tràn ra ngoài viewBox để lấp đầy màn hình rộng
const EXT_X = -800
const EXT_W = 2000
const TONGUES = Array.from({ length: Math.ceil(EXT_W / 48) }, (_, i) => ({
  x: EXT_X + i * 48,
  h: TONGUE_HEIGHTS[i % TONGUE_HEIGHTS.length],
}))
const SKYLINE = [
  [-420, 380, 90], [-320, 470, 70], [-240, 410, 80], [-150, 500, 60], [-80, 440, 70],
  [400, 450, 60], [470, 390, 85], [565, 480, 70], [645, 420, 90], [750, 500, 80],
]
const FLAME_LAYERS = [
  { color: '#e5341f', height: 95 },
  { color: '#ff8a1f', height: 70 },
  { color: '#ffd23f', height: 42 },
]
const CONFETTI_COLORS = ['#ffd23f', '#3ad1c6', '#ff7ab6', '#7cd35b', '#ff8a1f']

/**
 * Toạ độ y của bước i. Tường gồm các bước từ lowest (sát lửa) tới steps (nóc nhà);
 * vạch xuất phát (bước 0) ở giữa nếu cho phép tụt xuống dưới.
 */
const stepY = (i: number, lowest: number, steps: number) =>
  GROUND_Y - ((i - lowest) / (steps - lowest)) * (GROUND_Y - ROOF_Y)

function flamePath(x0: number, w: number, h: number): string {
  const xm = x0 + w / 2
  return `M${x0} ${H} C${x0} ${H - h * 0.5} ${xm - w * 0.1} ${H - h * 0.7} ${xm} ${H - h} C${xm + w * 0.1} ${H - h * 0.7} ${x0 + w} ${H - h * 0.5} ${x0 + w} ${H}Z`
}

interface Props {
  config: GameConfig
  step: number
  phase: Phase
  feedback: Feedback | null
}

export function Scene({ config, step, phase, feedback }: Props) {
  const steps = config.stepsToWin
  const fire = fireStep(config)
  // Bước thấp nhất còn an toàn nằm sát mặt đất, lửa ở ngay dưới
  const lowest = fire + 1
  const yOf = (i: number) => stepY(i, lowest, steps)
  const spacing = (GROUND_Y - ROOF_Y) / (steps - lowest)
  const shownStep = phase === 'burned' ? fire : Math.max(lowest, Math.min(step, steps))
  const y = yOf(shownStep)
  const badgeR = Math.min(12, spacing * 0.42)
  // Càng gần lửa, lửa càng bốc cao (đo bằng số bước còn cách lửa)
  const gap = Math.max(1, step - fire)
  const danger = step >= 0 ? 0 : Math.min(1, 1 - (gap - 1) / (config.maxMistakes + 1))
  // Ngọn lửa cao 95 đơn vị khi scale = 1; đỉnh lửa ở ngang bước có lửa, cao thêm khi nguy hiểm
  const fireTop = yOf(fire) - danger * spacing * 0.8
  const fireScale = phase === 'burned' ? 4.6 : Math.max(0.5, (H - fireTop) / 95)
  const motion = feedback ? (feedback.correct ? 'is-climbing' : 'is-sliding') : ''

  const windows: { x: number; y: number; lit: boolean }[] = []
  for (let row = 0, wy = ROOF_Y + 30; wy < GROUND_Y - 40; row++, wy += 85) {
    windows.push({ x: 80, y: wy, lit: row % 3 !== 1 }, { x: 280, y: wy, lit: row % 2 === 0 })
  }

  return (
    <svg
      className={`scene phase-${phase}`}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMax meet"
      role="img"
      aria-label={`Nhện Nhí đang ở bước ${Math.max(0, shownStep)} trên ${steps}`}
    >
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1b1f4b" />
          <stop offset="0.55" stopColor="#5b3b7a" />
          <stop offset="1" stopColor="#f2715a" />
        </linearGradient>
        <pattern id="bricks" width="40" height="20" patternUnits="userSpaceOnUse">
          <rect width="40" height="20" fill="#9a4232" />
          <path d="M0 0.5H40M0 10.5H40M20 0V10M0 10V20M40 10V20" stroke="#6e2a20" strokeWidth="1.5" />
        </pattern>
        <linearGradient id="fire-glow" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#ff6a1a" stopOpacity="0.85" />
          <stop offset="1" stopColor="#ff6a1a" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* bầu trời */}
      <rect x={EXT_X} width={EXT_W} height={H} fill="url(#sky)" />
      <circle cx={62} cy={64} r={24} fill="#fff4d6" opacity={0.92} />
      {STARS.map(([sx, sy], i) => (
        <circle key={i} className="star" cx={sx} cy={sy} r={1.6} fill="#fff" style={{ animationDelay: `${i * 0.4}s` }} />
      ))}
      <path d="M0 700V430h22v-38h26V700Z" fill="#2a2350" />
      <path d="M352 700V470h20v-30h28V700Z" fill="#2a2350" />
      {SKYLINE.map(([sx, sy, sw]) => (
        <rect key={sx} x={sx} y={sy} width={sw} height={H - sy} fill="#2a2350" />
      ))}

      {/* toà nhà */}
      <rect x={60} y={ROOF_Y} width={280} height={H - ROOF_Y} fill="url(#bricks)" />
      <rect x={50} y={ROOF_Y - 16} width={300} height={18} rx={3} fill="#5b2a22" />
      {windows.map((w, i) => (
        <g key={i}>
          <rect x={w.x - 4} y={w.y - 4} width={48} height={60} rx={3} fill="#4a1f19" />
          <rect x={w.x} y={w.y} width={40} height={52} rx={2} fill={w.lit ? '#ffd66b' : '#2f2752'} />
          <path d={`M${w.x + 20} ${w.y}V${w.y + 52}M${w.x} ${w.y + 26}H${w.x + 40}`} stroke="#4a1f19" strokeWidth="3" />
        </g>
      ))}

      {/* đường leo + điểm bám */}
      <rect x={158} y={ROOF_Y} width={84} height={H - ROOF_Y} rx={6} fill="#000" opacity={0.14} />
      {/* điểm bám dưới vạch xuất phát: không đánh số để bé không đếm được số lần sai */}
      {Array.from({ length: -lowest }, (_, k) => {
        const hy = yOf(lowest + k)
        return (
          <g key={`low-${k}`} className="hold hold-low">
            <ellipse cx={CX - 22} cy={hy - 3} rx={7} ry={4.5} />
            <ellipse cx={CX + 22} cy={hy - 3} rx={7} ry={4.5} />
          </g>
        )
      })}
      {/* vạch xuất phát */}
      <line className="start-line" x1={150} x2={250} y1={yOf(0)} y2={yOf(0)} />
      {Array.from({ length: steps }, (_, k) => {
        const i = k + 1
        const hy = yOf(i)
        const reached = i <= shownStep
        const color = HOLD_COLORS[k % HOLD_COLORS.length]
        return (
          <g key={i} className={reached ? 'hold reached' : 'hold'}>
            <ellipse cx={CX - 22} cy={hy - 3} rx={7} ry={4.5} fill={color} />
            <ellipse cx={CX + 22} cy={hy - 3} rx={7} ry={4.5} fill={color} />
            <circle cx={372} cy={hy} r={badgeR} className="badge" />
            <text x={372} y={hy} className="badge-text" fontSize={badgeR * 1.05}>
              {i}
            </text>
          </g>
        )
      })}

      {/* cờ đích trên nóc */}
      <g className="goal">
        <rect x={288} y={ROOF_Y - 76} width={4} height={62} fill="#ddd" />
        <path d={`M292 ${ROOF_Y - 76} L330 ${ROOF_Y - 64} L292 ${ROOF_Y - 52}Z`} fill="#ffd23f" />
      </g>

      {/* nhân vật + sợi tơ */}
      <g className={`climber-pos ${motion}`} style={{ transform: `translate(${CX}px, ${y}px)` }}>
        {phase !== 'won' && phase !== 'burned' && (
          <line className="web" x1={0} y1={-78} x2={0} y2={-1400} />
        )}
        <g transform="scale(1.25)">
          <g className="climber-motion">
            <Climber />
          </g>
        </g>
      </g>

      {phase === 'won' &&
        Array.from({ length: 28 }, (_, i) => (
          <rect
            key={i}
            className="confetti"
            x={(i * 53) % W}
            y={-20}
            width={7}
            height={11}
            fill={CONFETTI_COLORS[i % CONFETTI_COLORS.length]}
            style={{ animationDelay: `${(i * 173) % 1600}ms`, animationDuration: `${2 + (i % 5) * 0.3}s` }}
          />
        ))}

      {/* lửa: bốc cao dần khi Nhện Nhí tụt gần tới */}
      <g className="fire" style={{ transform: `scaleY(${fireScale})` }}>
        <rect x={EXT_X} y={H - 150} width={EXT_W} height={150} fill="url(#fire-glow)" opacity={0.5 + danger * 0.5} />
        {FLAME_LAYERS.map((layer) => (
          <g key={layer.color}>
            {TONGUES.map((t, i) => (
              <path
                key={i}
                className="tongue"
                d={flamePath(t.x, 64, layer.height * t.h)}
                fill={layer.color}
                style={{ animationDelay: `${(i * 137) % 600}ms` }}
              />
            ))}
          </g>
        ))}
      </g>

      {phase === 'burned' &&
        [0, 1, 2, 3].map((i) => (
          <circle
            key={i}
            className="smoke"
            cx={CX - 18 + i * 12}
            cy={yOf(fire) - 40}
            r={14}
            style={{ animationDelay: `${0.8 + i * 0.35}s` }}
          />
        ))}
    </svg>
  )
}
