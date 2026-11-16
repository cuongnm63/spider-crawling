import type { User } from 'firebase/auth'
import { useEffect, useState } from 'react'
import { addKid, signInWithGoogle, signOutParent, watchKids, watchUser, type Kid } from './account.ts'
import { firebaseEnabled } from './firebase.ts'

export type AccountStatus = 'disabled' | 'loading' | 'signedOut' | 'signedIn'

export interface Account {
  status: AccountStatus
  user: User | null
  kids: Kid[]
  /** Bé đang chơi (null = chơi không lưu sao) */
  kid: Kid | null
  error: string | null
  selectKid: (kidId: string | null) => void
  addKid: (name: string) => Promise<void>
  signIn: () => Promise<void>
  signOut: () => Promise<void>
}

const selectedKey = (uid: string) => `spider-climb:kid:${uid}`

function readSelected(uid: string): string | null {
  try {
    return localStorage.getItem(selectedKey(uid))
  } catch {
    return null
  }
}

function writeSelected(uid: string, kidId: string | null) {
  try {
    if (kidId) localStorage.setItem(selectedKey(uid), kidId)
    else localStorage.removeItem(selectedKey(uid))
  } catch {
    // bỏ qua
  }
}

function message(e: unknown): string {
  const code = (e as { code?: string })?.code ?? ''
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return ''
  if (code === 'auth/popup-blocked') return 'Trình duyệt đã chặn cửa sổ đăng nhập. Hãy cho phép popup rồi thử lại.'
  if (code === 'auth/unauthorized-domain') return 'Tên miền này chưa được phép đăng nhập (thêm vào Authorized domains trong Firebase).'
  if (code === 'auth/operation-not-allowed') return 'Chưa bật đăng nhập Google trong Firebase Authentication.'
  if (code === 'permission-denied') return 'Không có quyền truy cập dữ liệu.'
  return e instanceof Error ? e.message : 'Có lỗi xảy ra, thử lại nhé.'
}

export function useAccount(): Account {
  // undefined = đang chờ Firebase báo trạng thái đăng nhập
  const [user, setUser] = useState<User | null | undefined>(firebaseEnabled ? undefined : null)
  const [kids, setKids] = useState<Kid[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(
    () =>
      watchUser((u) => {
        setUser(u)
        setKids([])
        setSelectedId(u ? readSelected(u.uid) : null)
      }),
    [],
  )

  const uid = user?.uid
  useEffect(() => {
    if (!uid) return
    return watchKids(uid, setKids, (e) => setError(message(e)))
  }, [uid])

  const kid = kids.find((k) => k.id === selectedId) ?? null

  let status: AccountStatus = 'signedIn'
  if (!firebaseEnabled) status = 'disabled'
  else if (user === undefined) status = 'loading'
  else if (user === null) status = 'signedOut'

  return {
    status,
    user: user ?? null,
    kids,
    kid,
    error,
    selectKid: (kidId) => {
      setSelectedId(kidId)
      if (uid) writeSelected(uid, kidId)
    },
    addKid: async (name) => {
      if (!uid) return
      setError(null)
      try {
        const id = await addKid(uid, name)
        setSelectedId(id)
        writeSelected(uid, id)
      } catch (e) {
        setError(message(e))
      }
    },
    signIn: async () => {
      setError(null)
      try {
        await signInWithGoogle()
      } catch (e) {
        setError(message(e) || null)
      }
    },
    signOut: async () => {
      setError(null)
      await signOutParent()
    },
  }
}
