export type Operation = 'add' | 'sub' | 'mix'

export const OPERATION_OPTIONS: { value: Operation; label: string; rule: string }[] = [
  { value: 'add', label: 'Cộng', rule: 'phép cộng' },
  { value: 'sub', label: 'Trừ', rule: 'phép trừ' },
  { value: 'mix', label: 'Cả hai', rule: 'phép cộng và trừ' },
]

export type BlankMode = 'result' | 'operand' | 'mix'

export const BLANK_OPTIONS: { value: BlankMode; label: string }[] = [
  { value: 'result', label: 'Kết quả' },
  { value: 'operand', label: 'Ô trống' },
  { value: 'mix', label: 'Cả hai' },
]

export type Mode = 'practice' | 'compete'

export const MODE_OPTIONS: { value: Mode; label: string; icon: string; hint: string }[] = [
  { value: 'practice', label: 'Luyện tập', icon: '🧩', hint: 'Không tính giờ, không tính sao' },
  { value: 'compete', label: 'Thi đấu', icon: '🏆', hint: 'Có đồng hồ, thắng được ★ sao' },
]

export interface GameConfig {
  /** Luyện tập: không giới hạn giờ, không được sao. Thi đấu: có đồng hồ, thắng được sao */
  mode: Mode
  /** Loại phép tính: cộng, trừ hoặc trộn lẫn */
  operation: Operation
  /** Dạng câu hỏi: tìm kết quả (1 + 3 = ?), tìm số trong ô (1 + ☐ = 4) hoặc trộn lẫn */
  blank: BlankMode
  /** Số bước (điểm) cần leo để thắng */
  stepsToWin: number
  /** Số lần được phép sai; sai quá số này sẽ bị lửa đốt */
  maxMistakes: number
  /** Số bước bị tụt xuống mỗi lần trả lời sai */
  slideOnWrong: number
  /** Tính trong phạm vi (số lớn nhất xuất hiện trong phép tính) */
  maxSum: number
  /** Số giây để trả lời mỗi câu ở chế độ thi đấu. Hết giờ tính là sai */
  timeLimit: number
  /** Bật/tắt hiệu ứng âm thanh */
  sound: boolean
}

export const DEFAULT_CONFIG: GameConfig = {
  mode: 'practice',
  operation: 'add',
  blank: 'result',
  stepsToWin: 10,
  maxMistakes: 3,
  slideOnWrong: 1,
  maxSum: 10,
  timeLimit: 10,
  sound: true,
}

export type NumericKey = Exclude<keyof GameConfig, 'mode' | 'operation' | 'blank' | 'sound'>

/** Số giây mỗi câu thực tế; 0 = không giới hạn (chế độ luyện tập) */
export const timeLimitOf = (config: GameConfig) => (config.mode === 'compete' ? config.timeLimit : 0)

/** Ván này thắng có được sao không */
export const earnsStars = (config: GameConfig) => config.mode === 'compete'

export interface ConfigField {
  key: NumericKey
  label: string
  hint: string
  min: number
  max: number
  /** Bước nhảy của nút +/− (mặc định 1) */
  step?: number
  /** Cách hiển thị giá trị (mặc định là số) */
  format?: (value: number) => string
  /** Chỉ hiện ở chế độ thi đấu */
  competeOnly?: boolean
}

export const CONFIG_FIELDS: ConfigField[] = [
  { key: 'stepsToWin', label: 'Số bước để thắng', hint: 'Leo đủ số bước này là về đích', min: 3, max: 30 },
  { key: 'maxMistakes', label: 'Số lần được sai', hint: 'Sai quá số lần này sẽ bị lửa đốt', min: 0, max: 10 },
  { key: 'slideOnWrong', label: 'Tụt khi sai', hint: 'Số bước bị tụt mỗi lần sai', min: 0, max: 5 },
  { key: 'maxSum', label: 'Tính trong phạm vi', hint: 'Số lớn nhất trong phép tính', min: 2, max: 20 },
  {
    key: 'timeLimit',
    label: 'Thời gian mỗi câu',
    hint: 'Hết giờ tính là trả lời sai',
    min: 5,
    max: 60,
    step: 5,
    format: (v) => `${v}s`,
    competeOnly: true,
  },
]

const STORAGE_KEY = 'spider-climb:config'

function clamp(value: unknown, min: number, max: number, fallback: number): number {
  const n = Math.round(Number(value))
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback
}

export function normalizeConfig(raw: Partial<Record<keyof GameConfig, unknown>>): GameConfig {
  const out = { ...DEFAULT_CONFIG }
  const mode = MODE_OPTIONS.find((o) => o.value === raw.mode)
  if (mode) out.mode = mode.value
  // Bản cũ lưu 0 = tắt đồng hồ; giờ tắt đồng hồ bằng chế độ luyện tập
  if (Number(raw.timeLimit) <= 0) raw = { ...raw, timeLimit: undefined }
  const op = OPERATION_OPTIONS.find((o) => o.value === raw.operation)
  if (op) out.operation = op.value
  const blank = BLANK_OPTIONS.find((o) => o.value === raw.blank)
  if (blank) out.blank = blank.value
  if (typeof raw.sound === 'boolean') out.sound = raw.sound
  for (const f of CONFIG_FIELDS) {
    out[f.key] = clamp(raw[f.key], f.min, f.max, DEFAULT_CONFIG[f.key])
  }
  return out
}

export function loadConfig(): GameConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? normalizeConfig(JSON.parse(raw)) : { ...DEFAULT_CONFIG }
  } catch {
    return { ...DEFAULT_CONFIG }
  }
}

export function saveConfig(config: GameConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  } catch {
    // Không lưu được (chế độ ẩn danh...) thì bỏ qua
  }
}
