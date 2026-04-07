import React, { FC, useState, useEffect } from 'react'
import { PmsTemplateDto } from '../../core/pms/_models'

interface Props {
  visible: boolean
  onClose: () => void
  template: PmsTemplateDto
  onSubmit: (data: PmsTemplateDto) => void
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

export const EditTemplateModal: FC<Props> = ({ visible, onClose, template, onSubmit }) => {
  const [formData, setFormData] = useState<PmsTemplateDto>(template)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  useEffect(() => {
    setFormData(template)
    setErrors({})
  }, [template])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: { [key: string]: string } = {}
    if (!formData.name.trim()) {
      newErrors.name = 'Template name is required'
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
        style={{
          width: '800px',
          maxWidth: '90vw',
          maxHeight: '90vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className='d-flex align-items-center justify-content-between border-bottom px-4 py-3 flex-shrink-0'>
          <h5 className='modal-title text-dark m-0'>Edit PMS Template</h5>
          <button type='button' className='btn-close' onClick={onClose}></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className='flex-grow-1 overflow-auto px-4 py-3'>
            <div className='row g-3'>
              <div className='col-md-12'>
                <label className={LABEL}>
                  Template Name <span className='text-danger'>*</span>
                </label>
                <input
                  type='text'
                  className={`form-control text-dark ${errors.name ? 'is-invalid' : ''}`}
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value })
                    if (errors.name) setErrors({ ...errors, name: '' })
                  }}
                />
                {errors.name && <div className='invalid-feedback'>{errors.name}</div>}
              </div>
              <div className='col-md-12'>
                <label className={LABEL}>Description</label>
                <textarea
                  className='form-control text-dark'
                  rows={3}
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className='col-md-6'>
                <label className={LABEL}>Machinery Type</label>
                <input
                  type='text'
                  className='form-control text-dark'
                  value={formData.machineryType || ''}
                  onChange={(e) => setFormData({ ...formData, machineryType: e.target.value })}
                />
              </div>
              <div className='col-md-6'>
                <label className={LABEL}>Maker</label>
                <input
                  type='text'
                  className='form-control text-dark'
                  value={formData.maker || ''}
                  onChange={(e) => setFormData({ ...formData, maker: e.target.value })}
                />
              </div>
              <div className='col-md-6'>
                <label className={LABEL}>Model</label>
                <input
                  type='text'
                  className='form-control text-dark'
                  value={formData.model || ''}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                />
              </div>
              <div className='col-md-3'>
                <label className={LABEL}>Power (kW)</label>
                <input
                  type='number'
                  className='form-control text-dark'
                  value={formData.power || ''}
                  onChange={(e) => setFormData({ ...formData, power: e.target.value || undefined })}
                />
              </div>
              <div className='col-md-3'>
                <label className={LABEL}>Cylinders</label>
                <input
                  type='number'
                  className='form-control text-dark'
                  value={formData.cylinders || ''}
                  onChange={(e) => setFormData({ ...formData, cylinders: e.target.value ? Number(e.target.value) : undefined })}
                />
              </div>
              <div className='col-md-12'>
                <div className='form-check'>
                  <input
                    className='form-check-input'
                    type='checkbox'
                    checked={formData.active ?? true}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  />
                  <label className='form-check-label'>Active</label>
                </div>
              </div>
            </div>
          </div>
          <div className='border-top d-flex justify-content-end gap-2 px-4 py-3 flex-shrink-0'>
            <button type='button' className='btn btn-light btn-sm' onClick={onClose}>
              Cancel
            </button>
            <button type='submit' className='btn btn-primary btn-sm'>
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

