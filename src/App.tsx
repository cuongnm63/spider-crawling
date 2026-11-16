import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { AccountBar, RewardsPanel } from './components/Account.tsx'
import { Scene } from './components/Scene.tsx'
import { MenuPanel, PlayPanel, ResultPanel, type SaveState } from './components/Panels.tsx'
import { loadConfig, saveConfig, type GameConfig } from './game/config.ts'
import { gameReducer, initGame, outcomeAfterFeedback, type GameState } from './game/game.ts'
import { setSoundEnabled, sfx, unlockAudio } from './game/sound.ts'
import { recordPlay, type Kid } from './services/account.ts'
import { useAccount } from './services/useAccount.ts'
import './App.css'

const FEEDBACK_MS = { correct: 900, wrong: 1500 }

function App() {
  const [settings, setSettings] = useState<GameConfig>(loadConfig)
  const [state, dispatch] = useReducer(gameReducer, settings, initGame)
  const account = useAccount()
  const [screen, setScreen] = useState<'game' | 'rewards'>('game')
  const [save, setSave] = useState<SaveState | null>(null)

  // Bé đang chơi mới nhất, đọc khi ván kết thúc để lưu kết quả
  const playerRef = useRef<{ uid: string; kid: Kid } | null>(null)
  useEffect(() => {
    playerRef.current = account.user && account.kid ? { uid: account.user.uid, kid: account.kid } : null
  })

  const saveResult = (final: GameState, outcome: 'won' | 'burned') => {
    const player = playerRef.current
    if (!player) return
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
    dispatch({ type: 'start', config: settings })
  }
  const toMenu = () => {
    setSave(null)
    dispatch({ type: 'menu' })
  }
  const onTimeout = useCallback(() => dispatch({ type: 'timeout' }), [])
  const sceneConfig = state.phase === 'menu' ? settings : state.config

  return (
    <main className="app">
      <div className="scene-wrap">
        <Scene
          config={sceneConfig}
          step={state.step}
          mistakes={state.mistakes}
          phase={state.phase}
          feedback={state.feedback}
        />
      </div>
      <aside className="panel">
        {state.phase === 'menu' &&
          (screen === 'rewards' && account.user && account.kid ? (
            <RewardsPanel uid={account.user.uid} kid={account.kid} onBack={() => setScreen('game')} />
          ) : (
            <MenuPanel
              header={<AccountBar account={account} onOpenRewards={() => setScreen('rewards')} />}
              settings={settings}
              onChange={updateSettings}
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
            onMenu={toMenu}
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
    </main>
  )
}

export default App
