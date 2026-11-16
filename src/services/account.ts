import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth'
import {
  collection,
  doc,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  writeBatch,
  type Timestamp,
  type Unsubscribe,
} from 'firebase/firestore'
import type { GameConfig } from '../game/config.ts'
import type { Reward } from '../game/rewards.ts'
import { auth, db } from './firebase.ts'

/**
 * Cấu trúc dữ liệu Firestore (mỗi tài khoản Google của phụ huynh là một "gia đình"):
 *   families/{uid}/kids/{kidId}                      hồ sơ bé: tên, số sao...
 *   families/{uid}/kids/{kidId}/plays/{playId}       mỗi lượt chơi
 *   families/{uid}/kids/{kidId}/redemptions/{id}     mỗi lần đổi quà
 */

/** Số sao nhận được mỗi lần thắng */
export const STARS_PER_WIN = 1

export interface Kid {
  id: string
  name: string
  /** Số sao hiện có (sau khi trừ quà đã đổi) */
  stars: number
  /** Tổng số sao đã từng kiếm được */
  totalStars: number
  wins: number
  plays: number
}

export interface Redemption {
  id: string
  rewardId: string
  title: string
  cost: number
  status: 'pending' | 'given'
  createdAt: Date | null
}

export interface PlayRecord {
  won: boolean
  step: number
  bestStep: number
  mistakes: number
  config: GameConfig
}

function requireDb() {
  if (!db) throw new Error('Firebase chưa được cấu hình')
  return db
}

const kidsCol = (uid: string) => collection(requireDb(), 'families', uid, 'kids')
const kidDoc = (uid: string, kidId: string) => doc(requireDb(), 'families', uid, 'kids', kidId)

// ---------- Đăng nhập ----------

export function watchUser(cb: (user: User | null) => void): Unsubscribe {
  if (!auth) {
    cb(null)
    return () => {}
  }
  return onAuthStateChanged(auth, cb)
}

export async function signInWithGoogle(): Promise<void> {
  if (!auth) throw new Error('Firebase chưa được cấu hình')
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  await signInWithPopup(auth, provider)
}

export async function signOutParent(): Promise<void> {
  if (auth) await signOut(auth)
}

// ---------- Hồ sơ bé ----------

export function watchKids(uid: string, cb: (kids: Kid[]) => void, onError: (e: Error) => void): Unsubscribe {
  return onSnapshot(
    query(kidsCol(uid), orderBy('createdAt')),
    (snap) =>
      cb(
        snap.docs.map((d) => {
          const v = d.data()
          return {
            id: d.id,
            name: String(v.name ?? ''),
            stars: Number(v.stars ?? 0),
            totalStars: Number(v.totalStars ?? 0),
            wins: Number(v.wins ?? 0),
            plays: Number(v.plays ?? 0),
          }
        }),
      ),
    onError,
  )
}

export async function addKid(uid: string, name: string): Promise<string> {
  const ref = doc(kidsCol(uid))
  await setDoc(ref, { name: name.trim(), stars: 0, totalStars: 0, wins: 0, plays: 0, createdAt: serverTimestamp() })
  return ref.id
}

// ---------- Lượt chơi & sao ----------

/** Lưu một lượt chơi; thắng thì cộng STARS_PER_WIN sao. Trả về số sao được cộng. */
export async function recordPlay(uid: string, kidId: string, play: PlayRecord): Promise<number> {
  const earned = play.won ? STARS_PER_WIN : 0
  const batch = writeBatch(requireDb())
  batch.set(doc(collection(kidDoc(uid, kidId), 'plays')), {
    ...play,
    starsEarned: earned,
    createdAt: serverTimestamp(),
  })
  batch.update(kidDoc(uid, kidId), {
    plays: increment(1),
    wins: increment(play.won ? 1 : 0),
    stars: increment(earned),
    totalStars: increment(earned),
  })
  await batch.commit()
  return earned
}

// ---------- Đổi quà ----------

export class NotEnoughStarsError extends Error {}

/** Đổi quà: kiểm tra đủ sao, trừ sao và ghi lại yêu cầu đổi quà trong cùng một giao dịch. */
export async function redeemReward(uid: string, kidId: string, reward: Reward): Promise<void> {
  const database = requireDb()
  const kidRef = kidDoc(uid, kidId)
  const redemptionRef = doc(collection(kidRef, 'redemptions'))
  await runTransaction(database, async (tx) => {
    const snap = await tx.get(kidRef)
    const stars = Number(snap.data()?.stars ?? 0)
    if (stars < reward.cost) throw new NotEnoughStarsError('Chưa đủ sao')
    tx.update(kidRef, { stars: stars - reward.cost })
    tx.set(redemptionRef, {
      rewardId: reward.id,
      title: reward.title,
      cost: reward.cost,
      status: 'pending',
      createdAt: serverTimestamp(),
    })
  })
}

export function watchRedemptions(
  uid: string,
  kidId: string,
  cb: (items: Redemption[]) => void,
  onError: (e: Error) => void,
): Unsubscribe {
  return onSnapshot(
    query(collection(kidDoc(uid, kidId), 'redemptions'), orderBy('createdAt', 'desc'), limit(20)),
    (snap) =>
      cb(
        snap.docs.map((d) => {
          const v = d.data()
          return {
            id: d.id,
            rewardId: String(v.rewardId),
            title: String(v.title),
            cost: Number(v.cost),
            status: v.status === 'given' ? 'given' : 'pending',
            createdAt: (v.createdAt as Timestamp | null)?.toDate() ?? null,
          }
        }),
      ),
    onError,
  )
}
