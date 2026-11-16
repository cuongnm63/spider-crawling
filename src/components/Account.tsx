import { useEffect, useState, type FormEvent } from 'react'
import { REWARDS, type Reward } from '../game/rewards.ts'
import { sfx } from '../game/sound.ts'
import { NotEnoughStarsError, redeemReward, watchRedemptions, type Kid, type Redemption } from '../services/account.ts'
import type { Account } from '../services/useAccount.ts'

const MAX_NAME = 20

function AddKidForm({ onAdd, onCancel }: { onAdd: (name: string) => Promise<void>; onCancel?: () => void }) {
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setBusy(true)
    await onAdd(name)
    setBusy(false)
    setName('')
  }
  return (
    <form className="add-kid" onSubmit={submit}>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Tên của bé"
        maxLength={MAX_NAME}
        aria-label="Tên của bé"
        autoFocus
      />
      <button type="submit" className="btn-small primary-small" disabled={busy || !name.trim()}>
        Thêm
      </button>
      {onCancel && (
        <button type="button" className="btn-small" onClick={onCancel}>
          Huỷ
        </button>
      )}
    </form>
  )
}

interface AccountBarProps {
  account: Account
  onOpenRewards: () => void
}

/** Khu vực tài khoản ở màn hình chính: đăng nhập phụ huynh, chọn bé, xem sao. */
export function AccountBar({ account, onOpenRewards }: AccountBarProps) {
  const [adding, setAdding] = useState(false)
  const { status, kids, kid, user, error } = account

  if (status === 'disabled') {
    return <p className="account-note">Chế độ chơi thử: chưa kết nối Firebase nên chưa lưu sao.</p>
  }
  if (status === 'loading') {
    return <div className="account account-muted">Đang kiểm tra đăng nhập…</div>
  }
  if (status === 'signedOut') {
    return (
      <div className="account">
        <p className="account-lead">Đăng nhập để lưu sao mỗi lần thắng và đổi quà.</p>
        <button type="button" className="google-btn" onClick={() => void account.signIn()}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.6 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h6a5 5 0 0 1-2.2 3.3v2.7h3.6c2-1.9 3.2-4.7 3.2-8z" />
            <path fill="#34A853" d="M12 23c3 0 5.5-1 7.4-2.7l-3.6-2.8c-1 .7-2.3 1.1-3.8 1.1-2.9 0-5.4-2-6.3-4.6H2v2.9A11 11 0 0 0 12 23z" />
            <path fill="#FBBC05" d="M5.7 14c-.2-.7-.4-1.3-.4-2s.1-1.4.4-2V7.1H2a11 11 0 0 0 0 9.8L5.7 14z" />
            <path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2 7.1L5.7 10c.9-2.7 3.4-4.6 6.3-4.6z" />
          </svg>
          Phụ huynh đăng nhập Google
        </button>
        {error && <p className="account-error">{error}</p>}
      </div>
    )
  }

  return (
    <div className="account">
      <div className="account-head">
        <span>Ai đang chơi?</span>
        <button type="button" className="link" onClick={() => void account.signOut()}>
          Đăng xuất
        </button>
      </div>

      {kids.length > 0 && (
        <div className="kid-list" role="radiogroup" aria-label="Chọn bé">
          {kids.map((k) => (
            <button
              key={k.id}
              type="button"
              role="radio"
              aria-checked={kid?.id === k.id}
              className={kid?.id === k.id ? 'kid active' : 'kid'}
              onClick={() => account.selectKid(kid?.id === k.id ? null : k.id)}
            >
              <span className="kid-name">{k.name}</span>
              <span className="kid-stars">★ {k.stars}</span>
            </button>
          ))}
          {!adding && (
            <button type="button" className="kid add" onClick={() => setAdding(true)}>
              + Thêm bé
            </button>
          )}
        </div>
      )}

      {(adding || kids.length === 0) && (
        <AddKidForm
          onAdd={async (name) => {
            await account.addKid(name)
            setAdding(false)
          }}
          onCancel={kids.length > 0 ? () => setAdding(false) : undefined}
        />
      )}

      {kid ? (
        <div className="kid-summary">
          <span>
            Bé <b>{kid.name}</b> có <b className="star">★ {kid.stars}</b> sao
          </span>
          <button type="button" className="btn-small primary-small" onClick={onOpenRewards}>
            Đổi quà
          </button>
        </div>
      ) : (
        kids.length > 0 && <p className="account-note">Chọn tên bé để được lưu sao khi thắng.</p>
      )}

      <p className="account-parent">Phụ huynh: {user?.displayName || user?.email}</p>
      {error && <p className="account-error">{error}</p>}
    </div>
  )
}

/** Ảnh thật của món quà; nếu ảnh lỗi thì hiện biểu tượng dự phòng. */
function RewardImage({ reward }: { reward: Reward }) {
  const [failed, setFailed] = useState(false)
  if (failed) {
    return (
      <span className="reward-icon" aria-hidden="true">
        {reward.icon}
      </span>
    )
  }
  return (
    <img
      className="reward-photo"
      src={reward.image}
      alt={reward.title}
      width={480}
      height={360}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  )
}

function RewardThumb({ rewardId }: { rewardId: string }) {
  const reward = REWARDS.find((r) => r.id === rewardId)
  if (!reward) return <span aria-hidden="true">🎁</span>
  return <img className="redemption-thumb" src={reward.image} alt="" width={40} height={30} loading="lazy" />
}

interface RewardsPanelProps {
  uid: string
  kid: Kid
  onBack: () => void
}

/** Màn hình đổi quà (danh sách quà tạm thời trong src/game/rewards.ts). */
export function RewardsPanel({ uid, kid, onBack }: RewardsPanelProps) {
  const [history, setHistory] = useState<Redemption[]>([])
  const [confirming, setConfirming] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<{ kind: 'good' | 'bad'; text: string } | null>(null)

  useEffect(
    () => watchRedemptions(uid, kid.id, setHistory, () => setNotice({ kind: 'bad', text: 'Không tải được quà đã đổi.' })),
    [uid, kid.id],
  )

  const redeem = async (reward: Reward) => {
    setBusy(true)
    setNotice(null)
    try {
      await redeemReward(uid, kid.id, reward)
      sfx.win()
      setNotice({ kind: 'good', text: `Đã đổi "${reward.title}"! Nhờ bố mẹ trao quà nhé.` })
    } catch (e) {
      setNotice({
        kind: 'bad',
        text: e instanceof NotEnoughStarsError ? 'Chưa đủ sao để đổi quà này.' : 'Không đổi được quà, thử lại nhé.',
      })
    } finally {
      setBusy(false)
      setConfirming(null)
    }
  }


  return (
    <div className="rewards">
      <button type="button" className="link back" onClick={onBack}>
        ← Quay lại
      </button>
      <h2>Đổi quà</h2>
      <p className="rewards-balance">
        Bé <b>{kid.name}</b> đang có <b className="star">★ {kid.stars}</b> sao
      </p>
      <p className="account-note">Danh sách quà tạm thời, sẽ cập nhật sau.</p>

      <div className="reward-grid">
        {REWARDS.map((r) => {
          const enough = kid.stars >= r.cost
          return (
            <div key={r.id} className={enough ? 'reward-card' : 'reward-card locked'}>
              <RewardImage reward={r} />
              <span className="reward-title">{r.title}</span>
              <span className="reward-cost">★ {r.cost}</span>
              {confirming === r.id ? (
                <div className="reward-confirm">
                  <button
                    type="button"
                    className="btn-small primary-small"
                    disabled={busy}
                    onClick={() => void redeem(r)}
                  >
                    {busy ? 'Đang đổi…' : 'Chắc chắn'}
                  </button>
                  <button type="button" className="btn-small" disabled={busy} onClick={() => setConfirming(null)}>
                    Thôi
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="btn-small"
                  disabled={!enough || busy}
                  onClick={() => setConfirming(r.id)}
                >
                  {enough ? 'Đổi quà' : `Cần thêm ${r.cost - kid.stars} sao`}
                </button>
              )}
            </div>
          )
        })}
      </div>

      {notice && (
        <p className={`rewards-notice ${notice.kind}`} role="status">
          {notice.text}
        </p>
      )}

      <h3>Quà đã đổi</h3>
      {history.length === 0 ? (
        <p className="account-note">Chưa đổi quà nào.</p>
      ) : (
        <ul className="redemptions">
          {history.map((h) => (
            <li key={h.id}>
              <span className="redemption-title">
                <RewardThumb rewardId={h.rewardId} />
                {h.title}
              </span>
              <span className="redemption-cost">−{h.cost} ★</span>
              <span className={`redemption-status ${h.status}`}>{h.status === 'given' ? 'Đã nhận' : 'Chờ nhận quà'}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
