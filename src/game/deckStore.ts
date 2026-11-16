/**
 * Lưu bộ bài (các phép tính chưa hỏi) trong trình duyệt để ván sau rút tiếp,
 * không lặp lại câu của ván trước cho tới khi dùng hết bộ bài.
 */
const STORAGE_KEY = 'spider-climb:deck'

export function loadDeck(signature: string): string[] {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
    if (saved?.signature !== signature || !Array.isArray(saved.deck)) return []
    return saved.deck.filter((k: unknown): k is string => typeof k === 'string')
  } catch {
    return []
  }
}

export function saveDeck(signature: string, deck: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ signature, deck }))
  } catch {
    // Không lưu được thì ván sau dùng bộ bài mới
  }
}
