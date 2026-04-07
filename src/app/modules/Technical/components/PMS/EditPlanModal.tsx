import React, { FC, useState, useEffect } from 'react'
import { PmsPlanDto, PmsPlanStatus } from '../../core/pms/_models'
import type { Vessel } from '../../../Management/core/_models'

interface Props {
  visible: boolean
  onClose: () => void
  plan: PmsPlanDto
  onSubmit: (data: PmsPlanDto) => void
  vessels: Vessel[]
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

export const EditPlanModal: FC<Props> = ({ visible, onClose, plan, onSubmit, vessels }) => {
  const [formData, setFormData] = useState<PmsPlanDto>(plan)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  useEffect(() => {
    setFormData(plan)
    setErrors({})
  }, [plan])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: { [key: string]: string } = {}
    if (!formData.name.trim()) {
      newErrors.name = 'Plan name is required'
    }
    if (!formData.vesselId) {
      newErrors.vesselId = 'Vessel is required'
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
          width: '700px',
          maxWidth: '90vw',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className='d-flex align-items-center justify-content-between border-bottom px-4 py-3 flex-shrink-0'>
          <h5 className='modal-title text-dark m-0'>Edit PMS Plan</h5>
          <button type='button' className='btn-close' onClick={onClose}></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className='flex-grow-1 overflow-auto px-4 py-3'>
            <div className='mb-5'>
              <label className={LABEL}>
                Vessel <span className='text-danger'>*</span>
              </label>
              <select
                className={`form-select text-dark ${errors.vesselId ? 'is-invalid' : ''}`}
                value={formData.vesselId}
                onChange={(e) => {
                  setFormData({ ...formData, vesselId: Number(e.target.value) })
                  if (errors.vesselId) setErrors({ ...errors, vesselId: '' })
                }}
                disabled
                style={{ backgroundColor: '#f8f9fa' }}
              >
                {vessels.map(v => (
                  <option key={v.id} value={v.id}>
                    {(v as any).fleet_name || v.name || `Vessel ${v.id}`}
                  </option>
                ))}
              </select>
            </div>
            <div className='mb-5'>
              <label className={LABEL}>
                Plan Name <span className='text-danger'>*</span>
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
            <div className='mb-5'>
              <label className={LABEL}>Description</label>
              <textarea
                className='form-control text-dark'
                rows={3}
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className='mb-5'>
              <label className={LABEL}>Status</label>
              <select
                className='form-select text-dark'
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as PmsPlanStatus })}
              >
                <option value='DRAFT'>Draft</option>
                <option value='ACTIVE'>Active</option>
                <option value='SUSPENDED'>Suspended</option>
                <option value='ARCHIVED'>Archived</option>
              </select>
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

