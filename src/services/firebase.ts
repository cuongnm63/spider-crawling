import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'

/**
 * Cấu hình web của Firebase đọc từ biến môi trường VITE_FIREBASE_* (file .env).
 * Cấu hình này không phải bí mật: quyền truy cập dữ liệu do Firestore Rules
 * và danh sách tên miền được phép (Authorized domains) của Firebase Auth kiểm soát.
 */
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const firebaseEnabled = Boolean(config.apiKey && config.projectId && config.appId)

let app: FirebaseApp | null = null
let auth: Auth | null = null
let db: Firestore | null = null

if (firebaseEnabled) {
  app = initializeApp(config)
  auth = getAuth(app)
  db = getFirestore(app)
} else {
  console.warn('[firebase] Chưa có cấu hình VITE_FIREBASE_* — game chạy ở chế độ không lưu sao.')
}

export { auth, db }
