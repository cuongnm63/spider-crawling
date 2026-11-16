import { emptyDecks, LEVELS, type Decks } from './questions.ts'

/**
 * Lưu các bộ bài (các phép tính chưa hỏi) trong trình duyệt để ván sau rút tiếp,
 * không lặp lại câu của ván trước cho tới khi dùng hết bộ bài.
 */
const STORAGE_KEY = 'spider-climb:deck'

export function loadDecks(signature: string): Decks {
  const decks = emptyDecks()
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
    if (saved?.signature !== signature || typeof saved.decks !== 'object' || !saved.decks) return decks
    for (const level of LEVELS) {
      const list: unknown = saved.decks[level]
      if (Array.isArray(list)) decks[level] = list.filter((k): k is string => typeof k === 'string')
    }
  } catch {
    // Dữ liệu hỏng thì dùng bộ bài mới
  }
  return decks
}

export function saveDecks(signature: string, decks: Decks): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ signature, decks }))
  } catch {
    // Không lưu được thì ván sau dùng bộ bài mới
  }
}
