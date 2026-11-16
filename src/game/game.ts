import type { GameConfig } from './config.ts'
import { drawQuestion, emptyDecks, type Decks, type Question } from './questions.ts'

export type Phase = 'menu' | 'playing' | 'won' | 'burned'

export interface Feedback {
  correct: boolean
  /** Đáp án đã chọn; null khi hết giờ */
  picked: number | null
}

export interface GameState {
  phase: Phase
  config: GameConfig
  /**
   * Bước hiện tại. Xuất phát ở 0, có thể âm khi tụt xuống dưới vạch xuất phát;
   * lửa nằm ở bước -(maxMistakes + 1).
   */
  step: number
  /** Bước cao nhất từng leo tới trong lượt này */
  bestStep: number
  /** Tổng số lần trả lời sai (chỉ để thống kê, không hiện khi đang chơi) */
  mistakes: number
  question: Question
  /** Các phép tính chưa hỏi, mỗi mức độ một bộ bài; rút dần để không lặp lại */
  decks: Decks
  /** Số thứ tự câu hỏi, tăng mỗi câu mới (dùng để khởi động lại đồng hồ) */
  round: number
  /** Khác null khi đang hiện kết quả câu vừa trả lời (trước khi sang câu mới) */
  feedback: Feedback | null
}

export type GameAction =
  /** decks: bộ bài còn lại từ lần chơi trước (nếu có) để ván mới không lặp câu cũ */
  | { type: 'start'; config: GameConfig; decks?: Decks }
  | { type: 'answer'; value: number }
  | { type: 'timeout' }
  | { type: 'advance' }
  | { type: 'menu' }

export function initGame(config: GameConfig, decks: Decks = emptyDecks()): GameState {
  const draw = drawQuestion(config, decks, null, 0)
  return {
    phase: 'menu',
    config,
    step: 0,
    bestStep: 0,
    mistakes: 0,
    question: draw.question,
    decks: draw.decks,
    round: 0,
    feedback: null,
  }
}

/** Bước có lửa: dưới vạch xuất phát maxMistakes + 1 bước. */
export const fireStep = (config: GameConfig) => -(config.maxMistakes + 1)

/** Kết quả ván chơi sau khi hiện xong câu trả lời hiện tại (null = chơi tiếp). */
export function outcomeAfterFeedback(state: GameState): 'won' | 'burned' | null {
  if (!state.feedback) return null
  if (state.step >= state.config.stepsToWin) return 'won'
  if (state.step <= fireStep(state.config)) return 'burned'
  return null
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'start':
      return { ...initGame(action.config, action.decks), phase: 'playing' }

    case 'menu':
      return initGame(state.config)

    case 'answer':
    case 'timeout': {
      if (state.phase !== 'playing' || state.feedback) return state
      const picked = action.type === 'answer' ? action.value : null
      const correct = picked === state.question.answer
      // Đúng leo lên 1 bước, sai tụt xuống (có thể xuống dưới vạch xuất phát, tới lửa là bị đốt)
      const step = correct
        ? state.step + 1
        : Math.max(fireStep(state.config), state.step - state.config.slideOnWrong)
      return {
        ...state,
        step,
        bestStep: Math.max(state.bestStep, step),
        mistakes: correct ? state.mistakes : state.mistakes + 1,
        feedback: { correct, picked },
      }
    }

    case 'advance': {
      if (!state.feedback) return state
      const outcome = outcomeAfterFeedback(state)
      if (outcome) return { ...state, phase: outcome, feedback: null }
      // Càng leo cao câu hỏi càng khó
      const progress = Math.min(1, Math.max(0, state.step) / state.config.stepsToWin)
      const draw = drawQuestion(state.config, state.decks, state.question, progress)
      return {
        ...state,
        feedback: null,
        question: draw.question,
        decks: draw.decks,
        round: state.round + 1,
      }
    }
  }
}
