import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { AccountCorner, RewardsPanel } from './components/Account.tsx'
import { Scene } from './components/Scene.tsx'
import { MenuPanel, PlayPanel, ResultPanel, SettingsDialog, type SaveState } from './components/Panels.tsx'
import { ParentGateDialog } from './components/ParentGate.tsx'
import { earnsStars, loadConfig, saveConfig, type GameConfig } from './game/config.ts'
import { loadDecks, saveDecks } from './game/deckStore.ts'
import { gameReducer, initGame, outcomeAfterFeedback, type GameState } from './game/game.ts'
import { deckSignature } from './game/questions.ts'
import { setSoundEnabled, sfx, unlockAudio } from './game/sound.ts'
import { recordPlay, STARS_PER_LOSS, STARS_PER_WIN, type Kid } from './services/account.ts'
import { useAccount } from './services/useAccount.ts'
import './App.css'

const FEEDBACK_MS = { correct: 900, wrong: 1500 }

function App() {
  const [settings, setSettings] = useState<GameConfig>(loadConfig)
  const [state, dispatch] = useReducer(gameReducer, settings, initGame)
  const account = useAccount()
  const [screen, setScreen] = useState<'game' | 'rewards'>('game')
  const [save, setSave] = useState<SaveState | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  // Đang hỏi phép nhân của phụ huynh trước khi mở cài đặt
  const [gateOpen, setGateOpen] = useState(false)

  // Bé đang chơi mới nhất, đọc khi ván kết thúc để lưu kết quả
  const playerRef = useRef<{ uid: string; kid: Kid } | null>(null)
  useEffect(() => {
    playerRef.current = account.user && account.kid ? { uid: account.user.uid, kid: account.kid } : null
  })

  const saveResult = (final: GameState, outcome: 'won' | 'burned') => {
    const player = playerRef.current
    // Chỉ chế độ thi đấu mới lưu lượt chơi và cộng sao
    if (!player || !earnsStars(final.config)) return
    const kidName = player.kid.name
    setSave({ status: 'saving', kidName })
    recordPlay(player.uid, player.kid.id, {
      won: outcome === 'won',
      step: final.step,
      bestStep: final.bestStep,
      mistakes: final.mistakes,
      config: final.config,
    })
      .then((earned) => setSave({ status: 'saved', kidName, earned }))
      .catch((e) => {
        console.error('[firebase] Không lưu được lượt chơi', e)
        setSave({ status: 'error', kidName })
      })
  }
  const saveResultRef = useRef(saveResult)
  useEffect(() => {
    saveResultRef.current = saveResult
  })

  useEffect(() => setSoundEnabled(settings.sound), [settings.sound])

  // Lưu phần bài còn lại để ván sau không lặp lại câu đã hỏi
  useEffect(() => {
    if (state.phase !== 'menu') saveDecks(deckSignature(state.config), state.decks)
  }, [state.phase, state.config, state.decks])

  // Âm thanh đúng/sai, rồi giữ kết quả trên màn hình một lúc trước khi sang câu mới / kết thúc
  useEffect(() => {
    if (!state.feedback) return
    if (state.feedback.correct) sfx.correct()
    else sfx.wrong()
    const t = setTimeout(
      () => {
        const outcome = outcomeAfterFeedback(state)
        dispatch({ type: 'advance' })
        if (outcome) saveResultRef.current(state, outcome)
      },
      state.feedback.correct ? FEEDBACK_MS.correct : FEEDBACK_MS.wrong,
    )
    return () => clearTimeout(t)
    // state chỉ đổi khi có hành động mới; trong lúc hiện kết quả mọi câu trả lời khác đều bị bỏ qua
  }, [state])

  // Âm thanh chiến thắng / bị lửa đốt
  useEffect(() => {
    if (state.phase === 'won') sfx.win()
    if (state.phase === 'burned') sfx.burn()
  }, [state.phase])

  // Phím 1–4 để chọn đáp án
  useEffect(() => {
    if (state.phase !== 'playing' || state.feedback) return
    const onKey = (e: KeyboardEvent) => {
      const idx = Number(e.key) - 1
      const value = state.question.choices[idx]
      if (value !== undefined) dispatch({ type: 'answer', value })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [state.phase, state.feedback, state.question])

  const updateSettings = (config: GameConfig) => {
    setSettings(config)
    saveConfig(config)
  }
  const toggleSound = () => {
    const sound = !settings.sound
    setSoundEnabled(sound)
    if (sound) unlockAudio()
    updateSettings({ ...settings, sound })
  }
  const start = () => {
    unlockAudio()
    setSave(null)
    dispatch({ type: 'start', config: settings, decks: loadDecks(deckSignature(settings)) })
  }
  const toMenu = () => {
    setSave(null)
    dispatch({ type: 'menu' })
  }
  const onTimeout = useCallback(() => dispatch({ type: 'timeout' }), [])
  const sceneConfig = state.phase === 'menu' ? settings : state.config
  const openRewards = () => {
    if (state.phase !== 'menu') toMenu()
    setScreen('rewards')
  }

  const onRewards = state.phase === 'menu' && screen === 'rewards' && !!account.user && !!account.kid
  // Nút quay lại luôn nằm ở góc trái trên cùng của card
  const back = onRewards
    ? { label: 'Quay lại', onClick: () => setScreen('game') }
    : state.phase !== 'menu'
      ? { label: 'Màn hình chính', onClick: toMenu }
      : null

  let starHint: string
  if (account.status === 'disabled') starHint = 'Chưa kết nối Firebase nên chưa lưu sao.'
  else if (account.kid) {
    starHint = `Bé ${account.kid.name}: thắng được ★ ${STARS_PER_WIN} sao, thua bị trừ ${STARS_PER_LOSS} sao.`
  } else if (account.status === 'signedIn') starHint = 'Chọn bé ở góc phải để tính sao: thắng +1 ★, thua −1 ★.'
  else starHint = 'Phụ huynh đăng nhập ở góc phải để tính sao: thắng +1 ★, thua −1 ★.'

  return (
    <main className="app">
      <div className="scene-wrap">
        <Scene
          config={sceneConfig}
          step={state.step}
          phase={state.phase}
          feedback={state.feedback}
        />
      </div>
      <aside className="panel">
        <div className="panel-top">
          {back ? (
            <button type="button" className="panel-back" onClick={back.onClick}>
              <span aria-hidden="true">←</span> {back.label}
            </button>
          ) : (
            <span />
          )}
          <AccountCorner
            account={account}
            locked={state.phase === 'playing'}
            onOpenRewards={openRewards}
            onSignOut={() => void account.signOut()}
          />
        </div>
        {state.phase === 'menu' &&
          (screen === 'rewards' && account.user && account.kid ? (
            <RewardsPanel uid={account.user.uid} kid={account.kid} />
          ) : (
            <MenuPanel
              starHint={starHint}
              settings={settings}
              onChange={updateSettings}
              onEditSettings={() => setGateOpen(true)}
              onStart={start}
            />
          ))}
        {state.phase === 'playing' && (
          <PlayPanel
            state={state}
            onTimeout={onTimeout}
            soundOn={settings.sound}
            onToggleSound={toggleSound}
            onAnswer={(value) => dispatch({ type: 'answer', value })}
          />
        )}
        {(state.phase === 'won' || state.phase === 'burned') && (
          <ResultPanel
            state={state}
            save={save}
            kidStars={account.kid?.stars ?? null}
            canSave={account.status !== 'disabled'}
            onRestart={start}
            onMenu={toMenu}
          />
        )}
      </aside>

      {settingsOpen && state.phase === 'menu' && (
        <SettingsDialog settings={settings} onChange={updateSettings} onClose={() => setSettingsOpen(false)} />
      )}

      {/* Mỗi lần đổi cài đặt, phụ huynh phải làm đúng một phép nhân */}
      {gateOpen && (
        <ParentGateDialog
          reason="Điền kết quả phép nhân để mở cài đặt."
          onSuccess={() => {
            setGateOpen(false)
            setSettingsOpen(true)
          }}
          onClose={() => setGateOpen(false)}
        />
      )}
    </main>
  )
}

export default App
