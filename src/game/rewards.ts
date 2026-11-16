export interface Reward {
  id: string
  title: string
  /** Số sao cần để đổi */
  cost: number
  /** Ảnh thật của món quà (file trong public/rewards/ hoặc link ảnh sản phẩm) */
  image: string
  /** 'contain' cho ảnh sản phẩm nền trắng để không bị cắt mất hình */
  fit?: 'cover' | 'contain'
  /** Trang sản phẩm để bố mẹ xem/mua */
  link?: string
  /** Biểu tượng dự phòng khi ảnh chưa tải được */
  icon: string
}

const img = (file: string) => `${import.meta.env.BASE_URL}rewards/${file}`

/** Ảnh sản phẩm trên CDN của MyKingdom (dùng link trực tiếp, không lưu bản sao vào repo) */
const mykingdomImg = (file: string) => `https://cdn.shopify.com/s/files/1/0731/6514/4343/files/${file}_480x.jpg`
const mykingdomLink = (slug: string) => `https://www.mykingdom.com.vn/products/${slug}`

/**
 * Danh sách quà. Sửa tên, giá sao hoặc thêm/bớt quà ở đây
 * (ảnh mới đặt vào public/rewards/, nên thu nhỏ còn khoảng 480px).
 *
 * Nguồn ảnh (Wikimedia Commons, không cần ghi công):
 * - tv.jpg: "Plasma display.jpg", phạm vi công cộng (public domain)
 *   https://commons.wikimedia.org/wiki/File:Plasma_display.jpg
 * - hotwheels.jpg: "HOT WHEELS MAINLINE 2013 - CHEVY CAMARO.jpg", CC0
 *   https://commons.wikimedia.org/wiki/File:HOT_WHEELS_MAINLINE_2013_-_CHEVY_CAMARO.jpg
 * - Khủng long, LEGO, bộ đường đua Hot Wheels: ảnh sản phẩm của MyKingdom (mykingdom.com.vn), hiện bằng link trực tiếp
 */
export const REWARDS: Reward[] = [
  { id: 'tv', title: 'Xem Tivi', cost: 15, image: img('tv.jpg'), icon: '📺' },
  { id: 'hotwheels', title: 'Đồ chơi Hot Wheels', cost: 30, image: img('hotwheels.jpg'), icon: '🏎️' },
  {
    id: 'dino-trex',
    title: 'Mô hình khủng long T-Rex',
    cost: 30,
    image: mykingdomImg('mo-hinh-dong-vat-khung-long-tyrannosaurus-rex-collecta-88118_3'),
    fit: 'contain',
    link: mykingdomLink('mo-hinh-dong-vat-khung-long-tyrannosaurus-rex-collecta-88118'),
    icon: '🦖',
  },
  {
    id: 'lego-pteranodon',
    title: 'LEGO Khủng long bay Pteranodon',
    cost: 40,
    image: mykingdomImg('do-choi-lap-rap-khung-long-con-pteranodon-lego-jurassic-77977_10'),
    fit: 'contain',
    link: mykingdomLink('do-choi-lap-rap-khung-long-con-pteranodon-lego-jurassic-77977'),
    icon: '🦕',
  },
  {
    id: 'hotwheels-launcher',
    title: 'Hot Wheels Bệ phóng lên cao',
    cost: 40,
    image: mykingdomImg('HDR82-FWM85'),
    fit: 'contain',
    link: mykingdomLink('do-choi-be-phong-len-cao-hot-wheels-hdr82-fwm85'),
    icon: '🚀',
  },
  {
    id: 'lego-dino-bricks',
    title: 'LEGO Bộ gạch khủng long',
    cost: 50,
    image: mykingdomImg('bo-gach-chi-tiet-chu-de-khung-long-lego-classic-11041'),
    fit: 'contain',
    link: mykingdomLink('bo-gach-chi-tiet-chu-de-khung-long-lego-classic-11041'),
    icon: '🧱',
  },
  {
    id: 'hotwheels-burger-loop',
    title: 'Hot Wheels Tiệm Burger lượn vòng',
    cost: 50,
    image: mykingdomImg('do-choi-mo-hinh-hot-wheels-city-tiem-burger-luon-vong-hot-wheels-city-hot-wheels-jnv02-hdr24_1'),
    fit: 'contain',
    link: mykingdomLink('do-choi-mo-hinh-hot-wheels-city-tiem-burger-luon-vong-hot-wheels-city-hot-wheels-jnv02-hdr24'),
    icon: '🍔',
  },
]
