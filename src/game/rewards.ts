export interface Reward {
  id: string
  title: string
  /** Số sao cần để đổi */
  cost: number
  /** Biểu tượng tạm thời */
  icon: string
}

/**
 * DANH SÁCH QUÀ TẠM THỜI (placeholder).
 * Sửa tên, giá sao hoặc thêm/bớt quà ở đây. Khi cần phụ huynh tự quản lý quà
 * có thể chuyển danh sách này lên Firestore.
 */
export const REWARDS: Reward[] = [
  { id: 'sticker', title: 'Hình dán siêu nhện', cost: 3, icon: '🕷️' },
  { id: 'cartoon', title: '15 phút xem hoạt hình', cost: 5, icon: '📺' },
  { id: 'icecream', title: 'Một que kem', cost: 8, icon: '🍦' },
  { id: 'park', title: 'Đi chơi công viên', cost: 12, icon: '🎡' },
  { id: 'book', title: 'Một cuốn truyện mới', cost: 15, icon: '📚' },
  { id: 'toy', title: 'Đồ chơi bất ngờ', cost: 25, icon: '🎁' },
]
