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

/**
 * Phép cộng: a + b, tổng trong 1..maxSum.
 * Phép trừ: a − b, a trong 1..maxSum, kết quả không âm.
 * Ô trống có thể là kết quả hoặc một số hạng. Không lặp lại đúng câu vừa hỏi.
 */
export function makeQuestion(
  { maxSum, operation, blank }: QuestionOptions,
  prev?: Question | null,
  rng: Rng = Math.random,
): Question {
  let a = 0
  let b = 0
  let op: Op = '+'
  let hidden: Slot = 'result'
  for (let attempt = 0; attempt < 20; attempt++) {
    op = operation === 'add' ? '+' : operation === 'sub' ? '-' : rng() < 0.5 ? '+' : '-'
    hidden = pickSlot(blank, rng)
    const big = randInt(rng, 1, maxSum)
    const part = randInt(rng, 0, big)
    if (op === '+') {
      a = part
      b = big - part
    } else {
      a = big
      b = part
    }
    if (!prev || prev.a !== a || prev.b !== b || prev.op !== op || prev.hidden !== hidden) break
  }
  const result = compute(a, op, b)
  const answer = hidden === 'a' ? a : hidden === 'b' ? b : result
  return { a, b, op, result, hidden, answer, choices: makeChoices(answer, maxSum, rng) }
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
