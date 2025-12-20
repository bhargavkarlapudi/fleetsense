// src/app/modules/QHSE/components/NearMissSubmitModal.tsx
import React, {FC} from 'react'

type SubmitModalProps = {
  visible: boolean
  onCancel: () => void
  onConfirm: () => void
}

const SUBMIT_MODAL_WRAPPER: React.CSSProperties = {
  background: 'rgba(0,0,0,0.5)',
  position: 'fixed',
  inset: 0,
  zIndex: 2100,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

export const NearMissSubmitModal: FC<SubmitModalProps> = ({visible, onCancel, onConfirm}) => {
  if (!visible) return null

  return (
    <div style={SUBMIT_MODAL_WRAPPER}>
      <div
        className='bg-white rounded shadow-lg p-12'
        style={{width: '400px', maxWidth: '90vw'}}
      >
        <h5 className='mb-3 text-dark'>Submit Near Miss Report</h5>
        <p className='mb-4 text-dark'>
          Are you sure you want to <strong>submit this Near Miss report</strong>? Once submitted,
          it will no longer be editable (only review / closure details can be added later from shore).
        </p>
        <div className='d-flex justify-content-end gap-2'>
          <button
            type='button'
            className='btn btn-light btn-sm'
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type='button'
            className='btn btn_primary btn-sm'
            onClick={onConfirm}
          >
            Yes, Submit
          </button>
        </div>
      </div>
    </div>
  )
}
