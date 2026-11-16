import { useEffect, useRef, type ReactNode } from 'react'

interface ModalProps {
  children: ReactNode
  /** Đóng bằng Esc hoặc bấm ra ngoài; bỏ trống = hộp thoại bắt buộc, không tự đóng được */
  onClose?: () => void
  labelledBy: string
  className?: string
}

/** Hộp thoại dùng <dialog> gốc của trình duyệt (giữ focus bên trong, có nền mờ). */
export function Modal({ children, onClose, labelledBy, className }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (dialog && !dialog.open) dialog.showModal()
    return () => dialog?.close()
  }, [])

  return (
    <dialog
      ref={ref}
      className={className ? `modal ${className}` : 'modal'}
      aria-labelledby={labelledBy}
      onCancel={(e) => {
        e.preventDefault()
        onClose?.()
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.()
      }}
    >
      <div className="modal-body">{children}</div>
    </dialog>
  )
}
