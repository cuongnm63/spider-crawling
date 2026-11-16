import type { GameConfig } from './config.ts'
import { drawQuestion, type Question } from './questions.ts'

export type Phase = 'menu' | 'playing' | 'won' | 'burned'

export interface Feedback {
  correct: boolean
  /** Đáp án đã chọn; null khi hết giờ */
  picked: number | null
}

export interface GameState {
  phase: Phase
  config: GameConfig
  /** Bước hiện tại = điểm hiện tại */
  step: number
  /** Bước cao nhất từng leo tới trong lượt này */
  bestStep: number
  mistakes: number
  question: Question
  /** Các phép tính chưa hỏi (bộ bài); rút dần để không lặp lại */
  deck: string[]
  /** Số thứ tự câu hỏi, tăng mỗi câu mới (dùng để khởi động lại đồng hồ) */
  round: number
  /** Khác null khi đang hiện kết quả câu vừa trả lời (trước khi sang câu mới) */
  feedback: Feedback | null
}

export type GameAction =
  /** deck: bộ bài còn lại từ lần chơi trước (nếu có) để ván mới không lặp câu cũ */
  | { type: 'start'; config: GameConfig; deck?: string[] }
  | { type: 'answer'; value: number }
  | { type: 'timeout' }
  | { type: 'advance' }
  | { type: 'menu' }

export function initGame(config: GameConfig, deck: string[] = []): GameState {
  const draw = drawQuestion(config, deck)
  return {
    phase: 'menu',
    config,
    step: 0,
    bestStep: 0,
    mistakes: 0,
    question: draw.question,
    deck: draw.deck,
    round: 0,
    feedback: null,
  }
}

/** Kết quả ván chơi sau khi hiện xong câu trả lời hiện tại (null = chơi tiếp). */
export function outcomeAfterFeedback(state: GameState): 'won' | 'burned' | null {
  if (!state.feedback) return null
  if (state.step >= state.config.stepsToWin) return 'won'
  if (state.mistakes > state.config.maxMistakes) return 'burned'
  return null
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'start':
      return { ...initGame(action.config, action.deck), phase: 'playing' }

    case 'menu':
      return initGame(state.config)

    case 'answer':
    case 'timeout': {
      if (state.phase !== 'playing' || state.feedback) return state
      const picked = action.type === 'answer' ? action.value : null
      const correct = picked === state.question.answer
      const step = correct ? state.step + 1 : Math.max(0, state.step - state.config.slideOnWrong)
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
      const draw = drawQuestion(state.config, state.deck, state.question)
      return {
        ...state,
        feedback: null,
        question: draw.question,
        deck: draw.deck,
        round: state.round + 1,
      }
    }
  }
}
