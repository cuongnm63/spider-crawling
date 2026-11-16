import { useCallback, useEffect, useReducer, useState } from 'react'
import { Scene } from './components/Scene.tsx'
import { MenuPanel, PlayPanel, ResultPanel } from './components/Panels.tsx'
import { loadConfig, saveConfig, type GameConfig } from './game/config.ts'
import { gameReducer, initGame } from './game/game.ts'
import { setSoundEnabled, sfx, unlockAudio } from './game/sound.ts'
import './App.css'

const FEEDBACK_MS = { correct: 900, wrong: 1500 }

function App() {
  const [settings, setSettings] = useState<GameConfig>(loadConfig)
  const [state, dispatch] = useReducer(gameReducer, settings, initGame)

  useEffect(() => setSoundEnabled(settings.sound), [settings.sound])

  // Âm thanh đúng/sai, rồi giữ kết quả trên màn hình một lúc trước khi sang câu mới / kết thúc
  useEffect(() => {
    if (!state.feedback) return
    if (state.feedback.correct) sfx.correct()
    else sfx.wrong()
    const t = setTimeout(
      () => dispatch({ type: 'advance' }),
      state.feedback.correct ? FEEDBACK_MS.correct : FEEDBACK_MS.wrong,
    )
    return () => clearTimeout(t)
  }, [state.feedback])

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
    dispatch({ type: 'start', config: settings })
  }
  const toMenu = () => dispatch({ type: 'menu' })
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
        {state.phase === 'menu' && <MenuPanel settings={settings} onChange={updateSettings} onStart={start} />}
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
          <ResultPanel state={state} onRestart={start} onMenu={toMenu} />
        )}
      </aside>
    </main>
  )
}

export default App
