// src/app/modules/Technical/pages/Machinery/SubcomponentModal.tsx
import React, { FC, useEffect, useState } from 'react'
import type { SubcomponentDto, EquipmentComponentDto } from '../../core/_models'

interface SubcomponentModalProps {
  visible: boolean
  componentId: number
  editing?: SubcomponentDto
  onClose: () => void
  onSubmit: (data: SubcomponentDto) => void
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

export const SubcomponentModal: FC<SubcomponentModalProps> = ({
  visible,
  componentId,
  editing,
  onClose,
  onSubmit,
}) => {
  const [formData, setFormData] = useState<SubcomponentDto>({
    equipmentComponent: editing?.equipmentComponent || ({ id: componentId } as EquipmentComponentDto),
    name: editing?.name || '',
    subComponentCode: editing?.subComponentCode || '',
    subComponentFunctionDescription: editing?.subComponentFunctionDescription || '',
    subComponentParticulars: editing?.subComponentParticulars || '',
    maker: editing?.maker || '',
  })
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  useEffect(() => {
    if (editing) {
      setFormData({
        equipmentComponent: editing.equipmentComponent || ({ id: componentId } as EquipmentComponentDto),
        name: editing.name,
        subComponentCode: editing.subComponentCode || '',
        subComponentFunctionDescription: editing.subComponentFunctionDescription || '',
        subComponentParticulars: editing.subComponentParticulars || '',
        maker: editing.maker || '',
      })
    } else {
      setFormData({
        equipmentComponent: { id: componentId } as EquipmentComponentDto,
        name: '',
        subComponentCode: '',
        subComponentFunctionDescription: '',
        subComponentParticulars: '',
        maker: '',
      })
    }
    setErrors({})
  }, [editing, componentId])

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
          <h5 className='modal-title text-dark mx-6 mt-6'>{editing ? 'Edit Subcomponent' : 'Add Subcomponent'}</h5>
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
                placeholder='e.g., Fuel Injector, Piston Ring'
              />
              {errors.name && <div className='invalid-feedback'>{errors.name}</div>}
            </div>

            {/* SubComponent Code (SubSystem Code) */}
            <div className='mb-5'>
              <label className={LABEL}>SubComponent Code (SubSystem Code)</label>
              <input
                type='text'
                className='form-control text-dark'
                value={formData.subComponentCode || ''}
                onChange={(e) => {
                  const value = e.target.value.slice(0, 8) // Max 8 chars
                  setFormData({ ...formData, subComponentCode: value })
                }}
                placeholder='SubComponent code'
                maxLength={8}
              />
              <div className='form-text text-muted'>Max 8 characters</div>
            </div>

            {/* SubComponent Function Description */}
            <div className='mb-5'>
              <label className={LABEL}>SubComponent Function Description</label>
              <input
                type='text'
                className='form-control text-dark'
                value={formData.subComponentFunctionDescription || ''}
                onChange={(e) => {
                  const value = e.target.value.slice(0, 150) // Max 150 chars
                  setFormData({ ...formData, subComponentFunctionDescription: value })
                }}
                placeholder='Function description'
                maxLength={150}
              />
              <div className='form-text text-muted'>Max 150 characters</div>
            </div>

            {/* SubComponent Particulars */}
            <div className='mb-5'>
              <label className={LABEL}>SubComponent Particulars</label>
              <textarea
                className='form-control text-dark'
                rows={4}
                value={formData.subComponentParticulars || ''}
                onChange={(e) => setFormData({ ...formData, subComponentParticulars: e.target.value })}
                placeholder='Detailed subcomponent particulars (optional)'
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
                placeholder='SubComponent manufacturer'
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
