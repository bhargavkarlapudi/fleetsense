import React from 'react'

type Props = {
  isOpen: boolean
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'danger' | 'primary'
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}

const ConfirmDialog: React.FC<Props> = ({
  isOpen,
  title = 'Confirm action',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'danger',
  busy = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null

  return (
    <div
      className='confirm-overlay'
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel()
      }}
    >
      <div className='confirm-panel' role='dialog' aria-modal='true' onMouseDown={(e) => e.stopPropagation()}>
        <div className='confirm-header'>
          <div className='confirm-title'>{title}</div>
          <button className='confirm-close' type='button' onClick={onCancel} aria-label='Close'>
            ×
          </button>
        </div>
        <div className='confirm-body'>
          <p className='confirm-message'>{message}</p>
        </div>
        <div className='confirm-footer'>
          <button className='btn btn-light' type='button' onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </button>
          <button
            className={`btn ${tone === 'danger' ? 'btn-danger' : 'btn-primary'}`}
            type='button'
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? 'Please wait…' : confirmLabel}
          </button>
        </div>
      </div>

      <style>{`
        .confirm-overlay {
          position: fixed;
          inset: 0;
          z-index: 1060;
          background: rgba(0, 0, 0, 0.45);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
        }
        .confirm-panel {
          width: min(520px, calc(100vw - 32px));
          background: #fff;
          border-radius: 14px;
          box-shadow: 0 18px 50px rgba(0,0,0,0.2);
          overflow: hidden;
        }
        .confirm-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 18px 10px 18px;
          border-bottom: 1px solid #eef0f5;
        }
        .confirm-title {
          font-size: 16px;
          font-weight: 700;
          color: #181C32;
        }
        .confirm-close {
          border: none;
          background: #f5f8fa;
          color: #181C32;
          width: 32px;
          height: 32px;
          border-radius: 8px;
          cursor: pointer;
          display: grid;
          place-items: center;
          font-size: 18px;
        }
        .confirm-close:hover { background: #eef2f7; }
        .confirm-body {
          padding: 16px 18px 8px 18px;
        }
        .confirm-message {
          margin: 0;
          color: #3F4254;
          font-size: 14px;
          line-height: 1.5;
        }
        .confirm-footer {
          padding: 12px 18px 16px 18px;
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          border-top: 1px solid #eef0f5;
        }
      `}</style>
    </div>
  )
}

export default ConfirmDialog
