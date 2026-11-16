import type { GameConfig } from './config.ts'

export type Op = '+' | '-'
/** Vị trí ô trống cần điền: số thứ nhất, số thứ hai hoặc kết quả */
export type Slot = 'a' | 'b' | 'result'

export interface Question {
  a: number
  b: number
  op: Op
  result: number
  hidden: Slot
  /** Giá trị của ô trống */
  answer: number
  choices: number[]
}

type Rng = () => number
type QuestionOptions = Pick<GameConfig, 'maxSum' | 'operation' | 'blank'>

const randInt = (rng: Rng, min: number, max: number) => min + Math.floor(rng() * (max - min + 1))

function shuffle<T>(items: T[], rng: Rng): T[] {
  const arr = [...items]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randInt(rng, 0, i)
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export const compute = (a: number, op: Op, b: number) => (op === '+' ? a + b : a - b)

/**
 * Chọn vị trí ô trống. Ở chế độ trộn, câu tìm số trong ô (khó hơn) xuất hiện nhiều dần
 * theo tiến độ: đầu ván khoảng 20%, gần đích khoảng 80%.
 */
function pickSlot(blank: GameConfig['blank'], progress: number, rng: Rng): Slot {
  const operand: Slot = rng() < 0.5 ? 'a' : 'b'
  if (blank === 'result') return 'result'
  if (blank === 'operand') return operand
  return rng() < 0.2 + 0.6 * progress ? operand : 'result'
}

/** Khoá của một phép tính (không tính vị trí ô trống), ví dụ "3+4" hoặc "7-2". */
export const equationKey = (a: number, op: Op, b: number) => `${a}${op}${b}`

/** Nhận dạng bộ bài theo cài đặt; đổi cài đặt thì dùng bộ bài mới. */
export const deckSignature = ({ maxSum, operation }: QuestionOptions) => `v2:${operation}:${maxSum}`

/** Mức độ của phép tính. 'zero' là các câu có số 0 (5 + 0, 7 − 0, 4 − 4), rất dễ nên chỉ thỉnh thoảng mới hỏi. */
export type Level = 'zero' | 'easy' | 'medium' | 'hard'
export const LEVELS: Level[] = ['zero', 'easy', 'medium', 'hard']
const GRADED: Level[] = ['easy', 'medium', 'hard']

/** Mỗi mức độ một bộ bài riêng (các phép tính chưa hỏi) */
export type Decks = Record<Level, string[]>
export const emptyDecks = (): Decks => ({ zero: [], easy: [], medium: [], hard: [] })

/** Xác suất mỗi câu là câu có số 0 */
export const ZERO_CHANCE = 0.08

const hasZero = (a: number, op: Op, b: number) => a === 0 || b === 0 || (op === '-' && a === b)

/**
 * Độ khó ước lượng: số càng lớn càng khó; cộng/trừ với số nhỏ (7 + 1, 9 − 1) dễ hơn
 * hai số cỡ nhau (4 + 5, 9 − 5); phép trừ khó hơn phép cộng một chút.
 */
function difficulty(a: number, op: Op, b: number): number {
  return op === '+' ? a + b + 0.3 * Math.min(a, b) : a + 0.3 * Math.min(b, a - b) + 0.5
}

/**
 * Mọi phép tính có thể hỏi theo cài đặt:
 * - Phép cộng: a + b, tổng trong 1..maxSum.
 * - Phép trừ: a − b, a trong 1..maxSum, kết quả không âm.
 */
export function allEquations({ maxSum, operation }: Pick<QuestionOptions, 'maxSum' | 'operation'>): string[] {
  const keys: string[] = []
  if (operation !== 'sub') {
    for (let a = 0; a <= maxSum; a++) for (let b = 0; a + b <= maxSum; b++) if (a + b > 0) keys.push(equationKey(a, '+', b))
  }
  if (operation !== 'add') {
    for (let a = 1; a <= maxSum; a++) for (let b = 0; b <= a; b++) keys.push(equationKey(a, '-', b))
  }
  return keys
}

/** Chia phép tính theo mức độ: câu có số 0 riêng, còn lại xếp theo độ khó rồi chia 3 phần đều nhau. */
export function equationLevels(opts: Pick<QuestionOptions, 'maxSum' | 'operation'>): Decks {
  const levels = emptyDecks()
  const graded: { key: string; d: number }[] = []
  for (const key of allEquations(opts)) {
    const { a, op, b } = parseKey(key)
    if (hasZero(a, op, b)) levels.zero.push(key)
    else graded.push({ key, d: difficulty(a, op, b) })
  }
  graded.sort((x, y) => x.d - y.d || (x.key < y.key ? -1 : 1))
  const n = graded.length
  const cut1 = Math.ceil(n / 3)
  const cut2 = Math.ceil((2 * n) / 3)
  levels.easy = graded.slice(0, cut1).map((g) => g.key)
  levels.medium = graded.slice(cut1, cut2).map((g) => g.key)
  levels.hard = graded.slice(cut2).map((g) => g.key)
  return levels
}

/** Mức độ theo tiến độ leo (0 = chân tường, 1 = về đích): 1/3 đầu dễ, giữa vừa, cuối khó. */
export function levelFor(progress: number): Level {
  return progress < 1 / 3 ? 'easy' : progress < 2 / 3 ? 'medium' : 'hard'
}

function parseKey(key: string): { a: number; op: Op; b: number } {
  const m = /^(\d+)([+-])(\d+)$/.exec(key)
  if (!m) throw new Error(`Khoá phép tính không hợp lệ: ${key}`)
  return { a: Number(m[1]), op: m[2] as Op, b: Number(m[3]) }
}

/** Xáo các phép tính; nếu lá đầu trùng câu vừa hỏi thì đẩy xuống cuối. */
function reshuffle(keys: string[], avoidKey: string | null, rng: Rng): string[] {
  const deck = shuffle(keys, rng)
  if (deck.length > 1 && deck[0] === avoidKey) deck.push(deck.shift() as string)
  return deck
}

/**
 * Rút câu hỏi tiếp theo:
 * - Chọn mức độ theo tiến độ (càng lên cao càng khó), thỉnh thoảng (ZERO_CHANCE) là câu có số 0.
 * - Mỗi mức độ có bộ bài riêng: không phép tính nào lặp lại cho tới khi dùng hết bộ bài của mức đó,
 *   hết thì xáo lại (không trùng ngay câu vừa hỏi).
 * Trả về câu hỏi và các bộ bài còn lại.
 */
export function drawQuestion(
  opts: QuestionOptions,
  decks: Decks,
  prev?: Question | null,
  progress = 0,
  rng: Rng = Math.random,
): { question: Question; decks: Decks } {
  const levels = equationLevels(opts)
  const target = levelFor(progress)
  // Phạm vi nhỏ có thể thiếu mức nào đó: lấy mức gần nhất còn phép tính
  const byDistance = [...GRADED].sort(
    (x, y) => Math.abs(GRADED.indexOf(x) - GRADED.indexOf(target)) - Math.abs(GRADED.indexOf(y) - GRADED.indexOf(target)),
  )
  const order: Level[] = rng() < ZERO_CHANCE ? ['zero', ...byDistance] : [...byDistance, 'zero']
  const level = order.find((l) => levels[l].length > 0) as Level

  const valid = new Set(levels[level])
  let rest = (decks[level] ?? []).filter((k) => valid.has(k))
  if (rest.length === 0) rest = reshuffle(levels[level], prev ? equationKey(prev.a, prev.op, prev.b) : null, rng)
  const [key, ...remaining] = rest

  const { a, op, b } = parseKey(key)
  const hidden = pickSlot(opts.blank, progress, rng)
  const result = compute(a, op, b)
  const answer = hidden === 'a' ? a : hidden === 'b' ? b : result
  return {
    question: { a, b, op, result, hidden, answer, choices: makeChoices(answer, opts.maxSum, rng) },
    decks: { ...decks, [level]: remaining },
  }
}

/** 4 đáp án (hoặc ít hơn nếu phạm vi nhỏ): đáp án đúng, tối đa 2 số gần, còn lại ngẫu nhiên. */
function makeChoices(answer: number, maxSum: number, rng: Rng): number[] {
  // Số 0 chỉ là lựa chọn khi đáp án chính là 0 (câu có số 0 vốn đã hiếm)
  const min = answer === 0 ? 0 : 1
  const count = Math.min(4, maxSum - min + 1)
  const set = new Set([answer])
  const near = shuffle(
    [answer - 1, answer + 1, answer - 2, answer + 2].filter((n) => n >= min && n <= maxSum),
    rng,
  )
  for (const n of near.slice(0, 2)) {
    if (set.size < count) set.add(n)
  }
  const others = shuffle(
    Array.from({ length: maxSum - min + 1 }, (_, i) => min + i).filter((n) => !set.has(n)),
    rng,
  )
  for (const n of others) {
    if (set.size >= count) break
    set.add(n)
  }
  return shuffle([...set], rng)
}

export interface FactRow {
  a: number
  b: number
  result: number
}

/**
 * Bảng tính hỗ trợ: giữ cố định số đang hiện, thay đổi số ở vị trí ô trống.
 * Bảng bỏ các dòng có số 0 (trừ khi chính câu đang hỏi có số 0).
 * - Ô trống là kết quả hoặc số thứ hai: a ± 1, a ± 2, ...
 * - Ô trống là số thứ nhất: 1 + b, 2 + b, ... hoặc (b + 1) − b, (b + 2) − b, ...
 */
export function factTable(q: Question, maxSum: number): { fixed: number; rows: FactRow[] } {
  const rows: FactRow[] = []
  const hiddenA = q.hidden === 'a'
  // k là số thay đổi theo từng dòng
  let [lo, hi] = hiddenA ? (q.op === '+' ? [1, maxSum - q.b] : [q.b + 1, maxSum]) : q.op === '+' ? [1, maxSum - q.a] : [1, q.a - 1]
  const own = hiddenA ? q.a : q.b
  lo = Math.min(lo, own)
  hi = Math.max(hi, own)
  for (let k = lo; k <= hi; k++) {
    const [a, b] = hiddenA ? [k, q.b] : [q.a, k]
    rows.push({ a, b, result: compute(a, q.op, b) })
  }
  return { fixed: hiddenA ? q.b : q.a, rows }
}
