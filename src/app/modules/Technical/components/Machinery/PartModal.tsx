import React, {FC, useEffect, useState} from 'react'
import type {PartDto} from '../../core/_models'

interface PartModalProps {
  visible: boolean
  subcomponentId: number
  editing?: PartDto
  onClose: () => void
  onSubmit: (data: PartDto) => void
}

const LABEL = 'form-label fw-semibold fs-6 mb-2 text-dark'
const WRAP_STYLE: React.CSSProperties = {
  background: 'rgba(0,0,0,0.5)',
  position: 'fixed',
  inset: 0,
  zIndex: 1050,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

export const PartModal: FC<PartModalProps> = ({visible, subcomponentId, editing, onClose, onSubmit}) => {
  const [formData, setFormData] = useState<PartDto>({
    id: editing?.id,
    subcomponentId: subcomponentId,
    name: editing?.name || '',
    code: editing?.code || '',
  })
  const [errors, setErrors] = useState<{[key: string]: string}>({})

  useEffect(() => {
    if (editing) {
      setFormData({
        id: editing.id,
        subcomponentId: editing.subcomponentId || subcomponentId,
        name: editing.name,
        code: editing.code,
      })
    } else {
      setFormData({
        subcomponentId: subcomponentId,
        name: '',
        code: '',
      })
    }
    setErrors({})
  }, [editing, subcomponentId])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: {[key: string]: string} = {}
    if (!formData.name?.trim()) {
      newErrors.name = 'Name is required'
    }
    setErrors(newErrors)
    if (Object.keys(newErrors).length === 0) {
      onSubmit(formData)
    }
  }

  if (!visible) return null

  return (
    <div style={WRAP_STYLE} tabIndex={-1} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className='bg-white text-dark rounded shadow-lg d-flex flex-column'
        style={{width: '500px', maxWidth: '90vw'}}
        onClick={(e) => e.stopPropagation()}
      >
        <div className='d-flex align-items-center justify-content-between border-bottom px-4 py-3 flex-shrink-0'>
          <h5 className='modal-title text-dark mx-6 mt-6'>{editing ? 'Edit Part' : 'Add Part'}</h5>
          <button type='button' className='btn-close mx-6 mt-6' onClick={onClose}></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className='flex-grow-1 overflow-auto px-4 py-3 m-6'>
            <div className='mb-5'>
              <label className={LABEL}>
                Name <span className='text-danger'>*</span>
              </label>
              <input
                type='text'
                className={`form-control text-dark ${errors.name ? 'is-invalid' : ''}`}
                value={formData.name}
                onChange={(e) => {
                  setFormData({...formData, name: e.target.value})
                  if (errors.name) setErrors({...errors, name: ''})
                }}
                placeholder='e.g., Fuel Injector'
              />
              {errors.name && <div className='invalid-feedback'>{errors.name}</div>}
            </div>
            <div className='mb-5'>
              <label className={LABEL}>Code</label>
              <input
                type='text'
                className='form-control text-dark'
                value={formData.code || ''}
                onChange={(e) => setFormData({...formData, code: e.target.value})}
                placeholder='Optional part code'
              />
            </div>
          </div>
          <div className='border-top d-flex justify-content-end gap-2 px-4 py-3 flex-shrink-0 m-6'>
            <button type='button' className='btn btn-light btn-sm' onClick={onClose}>
              Cancel
            </button>
            <button type='submit' className='btn btn-primary btn-sm'>
              {editing ? 'Update' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default PartModal
