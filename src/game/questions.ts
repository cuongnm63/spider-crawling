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

function pickSlot(blank: GameConfig['blank'], rng: Rng): Slot {
  const operand: Slot = rng() < 0.5 ? 'a' : 'b'
  if (blank === 'result') return 'result'
  if (blank === 'operand') return operand
  return rng() < 0.5 ? 'result' : operand
}

/** Khoá của một phép tính (không tính vị trí ô trống), ví dụ "3+4" hoặc "7-2". */
export const equationKey = (a: number, op: Op, b: number) => `${a}${op}${b}`

/** Nhận dạng bộ bài theo cài đặt; đổi cài đặt thì dùng bộ bài mới. */
export const deckSignature = ({ maxSum, operation }: QuestionOptions) => `${operation}:${maxSum}`

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

function parseKey(key: string): { a: number; op: Op; b: number } {
  const m = /^(\d+)([+-])(\d+)$/.exec(key)
  if (!m) throw new Error(`Khoá phép tính không hợp lệ: ${key}`)
  return { a: Number(m[1]), op: m[2] as Op, b: Number(m[3]) }
}

/** Bộ bài mới đã xáo; nếu lá đầu trùng câu vừa hỏi thì đẩy xuống cuối. */
export function newDeck(opts: QuestionOptions, avoidKey?: string | null, rng: Rng = Math.random): string[] {
  const deck = shuffle(allEquations(opts), rng)
  if (deck.length > 1 && deck[0] === avoidKey) deck.push(deck.shift() as string)
  return deck
}

/**
 * Rút câu hỏi tiếp theo từ bộ bài: không phép tính nào lặp lại cho tới khi dùng hết bộ bài,
 * hết thì xáo bộ mới (không trùng ngay câu vừa hỏi). Trả về câu hỏi và phần bài còn lại.
 */
export function drawQuestion(
  opts: QuestionOptions,
  deck: string[],
  prev?: Question | null,
  rng: Rng = Math.random,
): { question: Question; deck: string[] } {
  const valid = new Set(allEquations(opts))
  let rest = deck.filter((k) => valid.has(k))
  if (rest.length === 0) rest = newDeck(opts, prev ? equationKey(prev.a, prev.op, prev.b) : null, rng)
  const [key, ...remaining] = rest
  const { a, op, b } = parseKey(key)
  const hidden = pickSlot(opts.blank, rng)
  const result = compute(a, op, b)
  const answer = hidden === 'a' ? a : hidden === 'b' ? b : result
  return {
    question: { a, b, op, result, hidden, answer, choices: makeChoices(answer, opts.maxSum, rng) },
    deck: remaining,
  }
}

/** 4 đáp án (hoặc ít hơn nếu phạm vi nhỏ): đáp án đúng, tối đa 2 số gần, còn lại ngẫu nhiên. */
function makeChoices(answer: number, maxSum: number, rng: Rng): number[] {
  const count = Math.min(4, maxSum + 1)
  const set = new Set([answer])
  const near = shuffle(
    [answer - 1, answer + 1, answer - 2, answer + 2].filter((n) => n >= 0 && n <= maxSum),
    rng,
  )
  for (const n of near.slice(0, 2)) {
    if (set.size < count) set.add(n)
  }
  while (set.size < count) set.add(randInt(rng, 0, maxSum))
  return shuffle([...set], rng)
}

export interface FactRow {
  a: number
  b: number
  result: number
}

/**
 * Bảng tính hỗ trợ: giữ cố định số đang hiện, thay đổi số ở vị trí ô trống.
 * - Ô trống là kết quả hoặc số thứ hai: a ± 1, a ± 2, ...
 * - Ô trống là số thứ nhất: 0 ± b, 1 ± b, ...
 */
export function factTable(q: Question, maxSum: number): { fixed: number; rows: FactRow[] } {
  const rows: FactRow[] = []
  if (q.hidden === 'a') {
    const [from, to] = q.op === '+' ? [0, maxSum - q.b] : [q.b, maxSum]
    for (let k = from; k <= to; k++) rows.push({ a: k, b: q.b, result: compute(k, q.op, q.b) })
    return { fixed: q.b, rows }
  }
  const from = q.hidden === 'result' && q.b !== 0 ? 1 : 0
  const to = q.op === '+' ? maxSum - q.a : q.a
  for (let k = from; k <= to; k++) rows.push({ a: q.a, b: k, result: compute(q.a, q.op, k) })
  return { fixed: q.a, rows }
}
