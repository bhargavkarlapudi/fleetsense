// src/app/modules/Technical/pages/Machinery/ComponentModal.tsx
import React, { FC, useEffect, useState } from 'react'
import type { EquipmentComponentDto } from '../../core/_models'

interface ComponentModalProps {
  visible: boolean
  equipmentId: number
  editing?: EquipmentComponentDto
  onClose: () => void
  onSubmit: (data: EquipmentComponentDto) => void
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

export const ComponentModal: FC<ComponentModalProps> = ({
  visible,
  equipmentId,
  editing,
  onClose,
  onSubmit,
}) => {
  const [formData, setFormData] = useState<EquipmentComponentDto>({
    equipmentId: editing?.equipmentId || equipmentId,
    name: editing?.name || '',
    code: editing?.code || '',
    description: editing?.description || '',
    componentCode: editing?.componentCode || '',
    componentDescription: editing?.componentDescription || '',
    systemSerialNumber: editing?.systemSerialNumber || '',
    systemParticulars: editing?.systemParticulars || '',
    maker: editing?.maker || '',
  })
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  useEffect(() => {
    if (editing) {
      setFormData({
        equipmentId: editing.equipmentId,
        name: editing.name,
        code: editing.code || '',
        description: editing.description || '',
        componentCode: editing.componentCode || '',
        componentDescription: editing.componentDescription || '',
        systemSerialNumber: editing.systemSerialNumber || '',
        systemParticulars: editing.systemParticulars || '',
        maker: editing.maker || '',
      })
    } else {
      setFormData({
        equipmentId,
        name: '',
        code: '',
        description: '',
        componentCode: '',
        componentDescription: '',
        systemSerialNumber: '',
        systemParticulars: '',
        maker: '',
      })
    }
    setErrors({})
  }, [editing, equipmentId])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: { [key: string]: string } = {}
    if (!formData.name.trim()) {
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
        style={{ width: '600px', maxWidth: '90vw' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className='d-flex align-items-center justify-content-between border-bottom px-4 py-3 flex-shrink-0'>
          <h5 className='modal-title text-dark mx-6 mt-6'>{editing ? 'Edit Component' : 'Add Component'}</h5>
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
                  setFormData({ ...formData, name: e.target.value })
                  if (errors.name) setErrors({ ...errors, name: '' })
                }}
                placeholder='e.g., Cylinder Head, Fuel Pump'
              />
              {errors.name && <div className='invalid-feedback'>{errors.name}</div>}
            </div>
            <div className='mb-5'>
              <label className={LABEL}>Code</label>
              <input
                type='text'
                className='form-control text-dark'
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder='Optional component code'
              />
            </div>
            <div className='mb-5'>
              <label className={LABEL}>Description</label>
              <textarea
                className='form-control text-dark'
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder='Component description (optional)'
              />
            </div>

            {/* Component Code (System Code) */}
            <div className='mb-5'>
              <label className={LABEL}>Component Code (System Code)</label>
              <input
                type='text'
                className='form-control text-dark'
                value={formData.componentCode || ''}
                onChange={(e) => {
                  const value = e.target.value.slice(0, 8) // Max 8 chars
                  setFormData({ ...formData, componentCode: value })
                }}
                placeholder='e.g., MEB&W 6G, TG-TCA66'
                maxLength={8}
              />
              <div className='form-text text-muted'>Max 8 characters</div>
            </div>

            {/* Component Description */}
            <div className='mb-5'>
              <label className={LABEL}>Component Description</label>
              <input
                type='text'
                className='form-control text-dark'
                value={formData.componentDescription || ''}
                onChange={(e) => {
                  const value = e.target.value.slice(0, 150) // Max 150 chars
                  setFormData({ ...formData, componentDescription: value })
                }}
                placeholder='Component description'
                maxLength={150}
              />
              <div className='form-text text-muted'>Max 150 characters</div>
            </div>

            {/* System Serial Number */}
            <div className='mb-5'>
              <label className={LABEL}>System Serial Number</label>
              <input
                type='text'
                className='form-control text-dark'
                value={formData.systemSerialNumber || ''}
                onChange={(e) => setFormData({ ...formData, systemSerialNumber: e.target.value })}
                placeholder='System serial number'
              />
            </div>

            {/* System Particulars */}
            <div className='mb-5'>
              <label className={LABEL}>System Particulars</label>
              <textarea
                className='form-control text-dark'
                rows={4}
                value={formData.systemParticulars || ''}
                onChange={(e) => setFormData({ ...formData, systemParticulars: e.target.value })}
                placeholder='Detailed system particulars (optional)'
              />
              <div className='form-text text-muted'>Max 2000 characters</div>
            </div>

            {/* Maker */}
            <div className='mb-5'>
              <label className={LABEL}>Maker</label>
              <input
                type='text'
                className='form-control text-dark'
                value={formData.maker || ''}
                onChange={(e) => {
                  const value = e.target.value.slice(0, 60) // Max 60 chars
                  setFormData({ ...formData, maker: value })
                }}
                placeholder='Component manufacturer'
                maxLength={60}
              />
              <div className='form-text text-muted'>Max 60 characters</div>
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
