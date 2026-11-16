import type { GameConfig } from './config.ts'
import { makeQuestion, type Question } from './questions.ts'

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
  /** Số thứ tự câu hỏi, tăng mỗi câu mới (dùng để khởi động lại đồng hồ) */
  round: number
  /** Khác null khi đang hiện kết quả câu vừa trả lời (trước khi sang câu mới) */
  feedback: Feedback | null
}

export type GameAction =
  | { type: 'start'; config: GameConfig }
  | { type: 'answer'; value: number }
  | { type: 'timeout' }
  | { type: 'advance' }
  | { type: 'menu' }

export function initGame(config: GameConfig): GameState {
  return {
    phase: 'menu',
    config,
    step: 0,
    bestStep: 0,
    mistakes: 0,
    question: makeQuestion(config),
    round: 0,
    feedback: null,
  }
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'start':
      return { ...initGame(action.config), phase: 'playing' }

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
      if (state.step >= state.config.stepsToWin) return { ...state, phase: 'won', feedback: null }
      if (state.mistakes > state.config.maxMistakes) return { ...state, phase: 'burned', feedback: null }
      return {
        ...state,
        feedback: null,
        question: makeQuestion(state.config, state.question),
        round: state.round + 1,
      }
    }
  }
}
