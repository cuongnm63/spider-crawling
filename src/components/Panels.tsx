import {
  BLANK_OPTIONS,
  CONFIG_FIELDS,
  DEFAULT_CONFIG,
  MODE_OPTIONS,
  OPERATION_OPTIONS,
  timeLimitOf,
  type GameConfig,
  type NumericKey,
} from '../game/config.ts'
import { Modal } from './Modal.tsx'
import { factTable, type Op, type Question, type Slot } from '../game/questions.ts'
import { useEffect, useState } from 'react'
import { fireStep, type GameState } from '../game/game.ts'
import { sfx } from '../game/sound.ts'

/** Bắt đầu kêu tích tắc khi còn số giây này */
const WARN_SECONDS = 3

const opSign = (op: Op) => (op === '+' ? '+' : '−')

const SOUND_OPTIONS: { value: 'on' | 'off'; label: string }[] = [
  { value: 'on', label: 'Bật' },
  { value: 'off', label: 'Tắt' },
]

interface SegmentedProps<T extends string> {
  label: string
  hint: string
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
}

function Segmented<T extends string>({ label, hint, value, options, onChange }: SegmentedProps<T>) {
  return (
    <div className="stepper">
      <div>
        <div className="stepper-label">{label}</div>
        <div className="stepper-hint">{hint}</div>
      </div>
      <div className="segmented" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            className={value === o.value ? 'active' : undefined}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

interface MenuProps {
  /** Dòng giải thích việc nhận sao ở chế độ thi đấu (theo trạng thái đăng nhập) */
  starHint: string
  settings: GameConfig
  onChange: (config: GameConfig) => void
  /** Mở hộp thoại cài đặt (phụ huynh làm phép nhân trước) */
  onEditSettings: () => void
  onStart: () => void
}

export function MenuPanel({ starHint, settings, onChange, onEditSettings, onStart }: MenuProps) {
  const { stepsToWin, maxMistakes, slideOnWrong, maxSum, operation, mode } = settings
  const compete = mode === 'compete'
  const opRule = OPERATION_OPTIONS.find((o) => o.value === operation)?.rule
  return (
    <div className="menu">
      <h1>
        Nhện Nhí <span>Leo Tường</span>
      </h1>

      <div className="modes" role="radiogroup" aria-label="Chế độ chơi">
        {MODE_OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={mode === o.value}
            className={`mode mode-${o.value}${mode === o.value ? ' active' : ''}`}
            onClick={() => onChange({ ...settings, mode: o.value })}
          >
            <span className="mode-icon" aria-hidden="true">
              {o.icon}
            </span>
            <span className="mode-label">{o.label}</span>
            <span className="mode-hint">{o.hint}</span>
          </button>
        ))}
      </div>

      <ul className="rules">
        <li>
          Trả lời đúng {opRule} trong phạm vi {maxSum}: leo lên 1 bước. Càng lên cao câu hỏi càng khó.
        </li>
        <li>Trả lời sai: tụt xuống {slideOnWrong} bước. Trả lời đúng: leo lên lại 1 bước.</li>
        <li>Leo đủ {stepsToWin} bước là thắng.</li>
        {compete && <li>Mỗi câu có {settings.timeLimit} giây, hết giờ tính là sai.</li>}
        <li>
          {maxMistakes > 0
            ? `Dưới chân có lửa: tụt xuống quá ${maxMistakes} bước dưới vạch xuất phát là bị lửa đốt.`
            : 'Dưới chân có lửa: tụt xuống dưới vạch xuất phát là bị lửa đốt.'}
        </li>
        {compete ? (
          <li className="rule-star">{starHint}</li>
        ) : (
          <li>Luyện tập thoải mái: có bảng tính bên cạnh, không tính giờ và không tính sao.</li>
        )}
      </ul>

      <SettingsSummary settings={settings} onEdit={onEditSettings} />

      <button type="button" className="primary" onClick={onStart}>
        {compete ? 'Bắt đầu thi đấu!' : 'Bắt đầu luyện tập!'}
      </button>
    </div>
  )
}

/** Ô cài đặt gọn: tóm tắt các cài đặt hiện tại, bấm vào để chỉnh. */
function SettingsSummary({ settings, onEdit }: { settings: GameConfig; onEdit: () => void }) {
  const chips = [
    settings.operation === 'add' ? 'Phép cộng' : settings.operation === 'sub' ? 'Phép trừ' : 'Cộng và trừ',
    settings.blank === 'result' ? 'Tìm kết quả' : settings.blank === 'operand' ? 'Ô trống' : 'Kết quả + ô trống',
    `Phạm vi ${settings.maxSum}`,
    `${settings.stepsToWin} bước`,
    `Sai tối đa ${settings.maxMistakes}`,
    `Sai tụt ${settings.slideOnWrong}`,
    ...(settings.mode === 'compete' ? [`⏱ ${settings.timeLimit}s mỗi câu`] : []),
    settings.sound ? '🔊 Có tiếng' : '🔇 Tắt tiếng',
  ]
  return (
    <button type="button" className="settings-box" onClick={onEdit}>
      <span className="settings-box-head">
        <span className="settings-box-title">⚙️ Cài đặt</span>
        <span className="settings-box-edit">🔒 Phụ huynh chỉnh</span>
      </span>
      <span className="chips">
        {chips.map((c) => (
          <span key={c} className="chip">
            {c}
          </span>
        ))}
      </span>
    </button>
  )
}

interface SettingsDialogProps {
  settings: GameConfig
  onChange: (config: GameConfig) => void
  onClose: () => void
}

/** Hộp thoại chỉnh toàn bộ cài đặt (thay đổi được áp dụng ngay). */
export function SettingsDialog({ settings, onChange, onClose }: SettingsDialogProps) {
  const compete = settings.mode === 'compete'
  return (
    <Modal labelledBy="settings-title" onClose={onClose} className="settings-modal">
      <div className="settings-head">
        <h2 id="settings-title">⚙️ Cài đặt</h2>
        <button
          type="button"
          className="link"
          onClick={() => onChange({ ...DEFAULT_CONFIG, mode: settings.mode, sound: settings.sound })}
        >
          Mặc định
        </button>
      </div>

      <div className="settings-group">
        <h3>Câu hỏi</h3>
        <Segmented
          label="Phép tính"
          hint="Cả hai: mỗi câu ngẫu nhiên cộng hoặc trừ"
          value={settings.operation}
          options={OPERATION_OPTIONS}
          onChange={(v) => onChange({ ...settings, operation: v })}
        />
        <Segmented
          label="Dạng câu hỏi"
          hint="Kết quả: 1 + 3 = ?  ·  Ô trống: 1 + ☐ = 4"
          value={settings.blank}
          options={BLANK_OPTIONS}
          onChange={(v) => onChange({ ...settings, blank: v })}
        />
        <Stepper settings={settings} onChange={onChange} fieldKey="maxSum" />
      </div>

      <div className="settings-group">
        <h3>Luật chơi</h3>
        <Stepper settings={settings} onChange={onChange} fieldKey="stepsToWin" />
        <Stepper settings={settings} onChange={onChange} fieldKey="maxMistakes" />
        <Stepper settings={settings} onChange={onChange} fieldKey="slideOnWrong" />
        {compete ? (
          <Stepper settings={settings} onChange={onChange} fieldKey="timeLimit" />
        ) : (
          <p className="settings-note">Đồng hồ đếm giờ chỉ có ở chế độ Thi đấu.</p>
        )}
      </div>

      <div className="settings-group">
        <h3>Khác</h3>
        <Segmented
          label="Âm thanh"
          hint="Tiếng đúng/sai, sắp hết giờ, chiến thắng"
          value={settings.sound ? 'on' : 'off'}
          options={SOUND_OPTIONS}
          onChange={(v) => onChange({ ...settings, sound: v === 'on' })}
        />
      </div>

      <button type="button" className="primary" onClick={onClose}>
        Xong
      </button>
    </Modal>
  )
}

function Stepper({
  settings,
  onChange,
  fieldKey,
}: {
  settings: GameConfig
  onChange: (config: GameConfig) => void
  fieldKey: NumericKey
}) {
  const f = CONFIG_FIELDS.find((c) => c.key === fieldKey)
  if (!f) return null
  const value = settings[f.key]
  const step = f.step ?? 1
  return (
    <div className="stepper">
      <div>
        <div className="stepper-label">{f.label}</div>
        <div className="stepper-hint">{f.hint}</div>
      </div>
      <div className="stepper-ctrl">
        <button
          type="button"
          aria-label={`Giảm ${f.label}`}
          disabled={value <= f.min}
          onClick={() => onChange({ ...settings, [f.key]: Math.max(f.min, value - step) })}
        >
          −
        </button>
        <output aria-live="polite">{f.format ? f.format(value) : value}</output>
        <button
          type="button"
          aria-label={`Tăng ${f.label}`}
          disabled={value >= f.max}
          onClick={() => onChange({ ...settings, [f.key]: Math.min(f.max, value + step) })}
        >
          +
        </button>
      </div>
    </div>
  )
}

interface PlayProps {
  state: GameState
  /** Gọi khi hết giờ trả lời (phải ổn định giữa các lần render) */
  onTimeout: () => void
  soundOn: boolean
  onToggleSound: () => void
  onAnswer: (value: number) => void
}

function feedbackMessage(state: GameState): string {
  const { feedback, question, config, step } = state
  if (!feedback) return 'Chọn đáp án đúng để leo lên (có thể bấm phím 1–4).'
  if (feedback.correct) {
    return step >= config.stepsToWin ? 'Tuyệt vời! Về đích rồi!' : 'Đúng rồi! Leo lên 1 bước.'
  }
  const reveal = `${feedback.picked === null ? 'Hết giờ!' : 'Sai rồi!'} ${question.a} ${opSign(question.op)} ${question.b} = ${question.result}.`
  if (step <= fireStep(config)) return `${reveal} Rơi xuống lửa rồi!`
  return `${reveal} Tụt xuống ${config.slideOnWrong} bước.`
}

export function PlayPanel({ state, onTimeout, soundOn, onToggleSound, onAnswer }: PlayProps) {
  const { question, feedback, config, step } = state
  const status = feedback ? (feedback.correct ? 'good' : 'bad') : ''
  const timeLimit = timeLimitOf(config)
  // Không hiện số lần sai: bé chỉ thấy mình đang ở đâu so với đích (và lửa trong cảnh)
  const shown = Math.max(0, step)

  return (
    <div className="play">
      <div className="stats">
        <div className="stat">
          <span className="stat-label">Điểm</span>
          <span className="stat-value">
            {shown}
            <small>/{config.stepsToWin}</small>
          </span>
          <div className="progress" aria-hidden="true">
            <div style={{ width: `${(Math.min(shown, config.stepsToWin) / config.stepsToWin) * 100}%` }} />
          </div>
        </div>
      </div>

      <div className="play-body">
        <div className="play-main">
          <div className={`question ${status}`} aria-live="polite">
            <QuestionSlot question={question} slot="a" revealed={!!feedback} />
            <span className="op">{opSign(question.op)}</span>
            <QuestionSlot question={question} slot="b" revealed={!!feedback} />
            <span className="op">=</span>
            <QuestionSlot question={question} slot="result" revealed={!!feedback} />
          </div>

          {timeLimit > 0 && (
            <Timer key={state.round} limit={timeLimit} paused={!!feedback} onExpire={onTimeout} />
          )}

          <div className="choices">
            {question.choices.map((c, i) => {
              let cls = 'choice'
              if (feedback) {
                if (c === question.answer) cls += ' is-answer'
                else if (c === feedback.picked) cls += ' is-wrong'
              }
              return (
                <button key={c} type="button" className={cls} disabled={!!feedback} onClick={() => onAnswer(c)}>
                  <kbd>{i + 1}</kbd>
                  {c}
                </button>
              )
            })}
          </div>

          <p className={`feedback ${status}`} role="status">
            {feedbackMessage(state)}
          </p>
        </div>

        {/* Bảng tính chỉ để hỗ trợ khi luyện tập; thi đấu thì bé tự tính */}
        {config.mode === 'practice' && <FactTable question={question} maxSum={config.maxSum} />}
      </div>

      <div className="play-links">
        <button type="button" className="link" onClick={onToggleSound} aria-pressed={!soundOn}>
          {soundOn ? 'Tắt tiếng' : 'Bật tiếng'}
        </button>
      </div>
    </div>
  )
}

interface TimerProps {
  limit: number
  paused: boolean
  onExpire: () => void
}

/** Đồng hồ đếm ngược của một câu; tạo mới (theo key) cho mỗi câu, dừng lại khi đang hiện kết quả. */
function Timer({ limit, paused, onExpire }: TimerProps) {
  const [left, setLeft] = useState(limit)

  useEffect(() => {
    if (paused) return
    const end = performance.now() + limit * 1000
    let lastWhole = limit
    const id = setInterval(() => {
      const remaining = Math.max(0, (end - performance.now()) / 1000)
      const whole = Math.ceil(remaining)
      setLeft(remaining)
      if (whole < lastWhole) {
        lastWhole = whole
        if (whole > 0 && whole <= WARN_SECONDS) sfx.tick(whole === 1)
      }
      if (remaining <= 0) {
        clearInterval(id)
        onExpire()
      }
    }, 100)
    return () => clearInterval(id)
  }, [paused, limit, onExpire])

  const secs = Math.ceil(left)
  const urgent = secs <= 3
  return (
    <div className={`timer${urgent ? ' urgent' : ''}${paused ? ' paused' : ''}`} role="timer" aria-label={`Còn ${secs} giây`}>
      <svg className="timer-icon" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="13" r="8" fill="none" stroke="currentColor" strokeWidth="2.2" />
        <path d="M12 9v4l2.5 2M4 5l3-2.5M20 5l-3-2.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
      <div className="timer-bar">
        <div style={{ width: `${(left / limit) * 100}%` }} />
      </div>
      <span className="timer-text">{secs}s</span>
    </div>
  )
}

function QuestionSlot({ question, slot, revealed }: { question: Question; slot: Slot; revealed: boolean }) {
  const value = question[slot]
  if (question.hidden !== slot) return <span>{value}</span>
  return (
    <span className="blank" aria-label={revealed ? String(value) : 'ô trống'}>
      {revealed ? value : '?'}
    </span>
  )
}

/** Bảng tính hỗ trợ cạnh câu hỏi. Không đánh dấu dòng đang hỏi để bé tự tìm. */
function FactTable({ question, maxSum }: { question: Question; maxSum: number }) {
  const { fixed, rows } = factTable(question, maxSum)
  const title = `Bảng ${question.op === '+' ? 'cộng' : 'trừ'} ${fixed}`
  return (
    <section className="facts" aria-label={title}>
      <h3>{title}</h3>
      <ol>
        {rows.map((r) => (
          <li key={`${r.a}-${r.b}`}>
            <span>
              {r.a} {opSign(question.op)} {r.b}
            </span>
            <span className="eq">=</span>
            <span className="sum">{r.result}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}

export type SaveState =
  | { status: 'saving'; kidName: string }
  | { status: 'saved'; kidName: string; earned: number }
  | { status: 'error'; kidName: string }

interface ResultProps {
  state: GameState
  /** Trạng thái lưu sao; null khi không có bé nào được chọn */
  save: SaveState | null
  /** Số sao hiện có của bé (cập nhật trực tiếp từ Firestore) */
  kidStars: number | null
  /** Có thể đăng nhập để lưu sao không (đã cấu hình Firebase) */
  canSave: boolean
  onRestart: () => void
  onMenu: () => void
}

export function ResultPanel({ state, save, kidStars, canSave, onRestart, onMenu }: ResultProps) {
  const won = state.phase === 'won'
  return (
    <div className={`result ${won ? 'won' : 'burned'}`}>
      <h2>{won ? 'Về đích rồi!' : 'Ôi không, bị lửa đốt rồi!'}</h2>
      <p>
        {won
          ? state.mistakes === 0
            ? `Nhện Nhí leo ${state.config.stepsToWin} bước mà không sai lần nào. Giỏi quá!`
            : `Nhện Nhí đã lên tới nóc nhà, sai ${state.mistakes} lần.`
          : `Nhện Nhí leo cao nhất được ${state.bestStep}/${state.config.stepsToWin} bước. Thử lại nhé!`}
      </p>
      <SaveNotice save={save} kidStars={kidStars} won={won} canSave={canSave} compete={state.config.mode === 'compete'} />
      <div className="result-actions">
        <button type="button" className="primary" onClick={onRestart} autoFocus>
          Chơi lại
        </button>
        <button type="button" className="secondary" onClick={onMenu}>
          Đổi cài đặt
        </button>
      </div>
    </div>
  )
}

interface SaveNoticeProps {
  save: SaveState | null
  kidStars: number | null
  won: boolean
  canSave: boolean
  compete: boolean
}

function SaveNotice({ save, kidStars, won, canSave, compete }: SaveNoticeProps) {
  if (!save) {
    if (!won || !canSave) return null
    return (
      <p className="save-notice muted">
        {compete
          ? 'Đăng nhập và chọn bé ở góc phải để được lưu sao.'
          : 'Luyện tập không tính sao. Chọn chế độ Thi đấu để nhận ★ sao nhé!'}
      </p>
    )
  }
  if (save.status === 'saving') return <p className="save-notice muted">Đang lưu cho bé {save.kidName}…</p>
  if (save.status === 'error') {
    return <p className="save-notice bad">Chưa lưu được sao cho bé {save.kidName}. Kiểm tra mạng nhé.</p>
  }
  if (save.earned > 0) {
    return (
      <p className="save-notice good">
        <span className="star-pop">★</span> +{save.earned} sao cho bé {save.kidName}!
        {kidStars !== null && ` Bé đang có ${kidStars} sao.`}
      </p>
    )
  }
  if (save.earned < 0) {
    return (
      <p className="save-notice bad">
        <span className="star-drop">★</span> −{-save.earned} sao của bé {save.kidName}.
        {kidStars !== null && ` Bé còn ${kidStars} sao.`} Cố lên ván sau nhé!
      </p>
    )
  }
  if (compete && !won) {
    return <p className="save-notice muted">Bé {save.kidName} chưa có sao nào để bị trừ. Cố lên ván sau nhé!</p>
  }
  return <p className="save-notice muted">Đã lưu lượt chơi của bé {save.kidName}.</p>
}
