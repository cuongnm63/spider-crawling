export interface Reward {
  id: string
  title: string
  /** Số sao cần để đổi */
  cost: number
  /** Ảnh thật của món quà (đặt trong public/rewards/) */
  image: string
  /** Biểu tượng dự phòng khi ảnh chưa tải được */
  icon: string
}

const img = (file: string) => `${import.meta.env.BASE_URL}rewards/${file}`

/**
 * Danh sách quà. Sửa tên, giá sao hoặc thêm/bớt quà ở đây
 * (ảnh mới đặt vào public/rewards/, nên thu nhỏ còn khoảng 480px).
 *
 * Nguồn ảnh (Wikimedia Commons, không cần ghi công):
 * - tv.jpg: "Plasma display.jpg", phạm vi công cộng (public domain)
 *   https://commons.wikimedia.org/wiki/File:Plasma_display.jpg
 * - hotwheels.jpg: "HOT WHEELS MAINLINE 2013 - CHEVY CAMARO.jpg", CC0
 *   https://commons.wikimedia.org/wiki/File:HOT_WHEELS_MAINLINE_2013_-_CHEVY_CAMARO.jpg
 */
export const REWARDS: Reward[] = [
  { id: 'tv', title: 'Xem Tivi', cost: 15, image: img('tv.jpg'), icon: '📺' },
  { id: 'hotwheels', title: 'Đồ chơi Hot Wheels', cost: 30, image: img('hotwheels.jpg'), icon: '🏎️' },
]
