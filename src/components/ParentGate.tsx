import { useState, type FormEvent } from 'react'
import { Modal } from './Modal.tsx'

interface Problem {
  a: number
  b: number
}

/** Phép nhân dễ với người lớn nhưng bé mẫu giáo/lớp 1 chưa làm được */
function newProblem(prev?: Problem): Problem {
  for (;;) {
    const p = { a: 6 + Math.floor(Math.random() * 4), b: 3 + Math.floor(Math.random() * 7) }
    if (!prev || p.a !== prev.a || p.b !== prev.b) return p
  }
}

interface ParentGateProps {
  /** Lời nhắc: phụ huynh làm phép tính để làm gì */
  reason: string
  onSuccess: () => void
  onClose: () => void
}

/** Cổng phụ huynh: điền đúng kết quả một phép nhân mới được tiếp tục. Mỗi lần mở là một phép tính mới. */
export function ParentGateDialog({ reason, onSuccess, onClose }: ParentGateProps) {
  const [problem, setProblem] = useState(() => newProblem())
  const [value, setValue] = useState('')
  const [wrong, setWrong] = useState(false)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!value.trim()) return
    if (Number(value.trim()) === problem.a * problem.b) {
      onSuccess()
      return
    }
    setWrong(true)
    setValue('')
    setProblem(newProblem(problem))
  }

  return (
    <Modal labelledBy="gate-title" onClose={onClose} className="gate-modal">
      <div className="gate-icon" aria-hidden="true">
        🔒
      </div>
      <h2 id="gate-title">Dành cho phụ huynh</h2>
      <p className="gate-lead">{reason}</p>
      <form className="gate-form" onSubmit={submit}>
        <label className="gate-question" htmlFor="gate-answer">
          {problem.a} × {problem.b} =
        </label>
        <input
          id="gate-answer"
          className={wrong ? 'gate-input shake' : 'gate-input'}
          key={`${problem.a}x${problem.b}`}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          maxLength={3}
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/\D/g, ''))}
          aria-describedby="gate-msg"
        />
        <button type="submit" className="primary" disabled={!value.trim()}>
          Mở cài đặt
        </button>
      </form>
      <p id="gate-msg" className={wrong ? 'gate-msg bad' : 'gate-msg'} role="status">
        {wrong ? 'Chưa đúng, thử phép tính mới nhé.' : ''}
      </p>
      <button type="button" className="link" onClick={onClose}>
        Huỷ
      </button>
    </Modal>
  )
}
