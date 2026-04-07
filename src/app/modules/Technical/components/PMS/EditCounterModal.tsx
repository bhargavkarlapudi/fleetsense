import React, { FC, useState, useEffect } from 'react'
import { updateRunningHourCounter } from '../../core/pms/_requests'
import { toast } from 'react-toastify'
import type { RunningHourCounterDto } from '../../core/pms/_models'

interface Props {
  visible: boolean
  onClose: () => void
  counter: RunningHourCounterDto
  onSuccess: () => void
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

export const EditCounterModal: FC<Props> = ({ visible, onClose, counter, onSuccess }) => {
  const [formData, setFormData] = useState<{
    name: string
    maxDailyJumpLimit: string
  }>({
    name: counter.name || '',
    maxDailyJumpLimit: counter.maxDailyJumpLimit?.toString() || '',
  })
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (visible && counter) {
      setFormData({
        name: counter.name || '',
        maxDailyJumpLimit: counter.maxDailyJumpLimit?.toString() || '',
      })
      setErrors({})
    }
  }, [visible, counter])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: { [key: string]: string } = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Counter name is required'
    }
    if (formData.maxDailyJumpLimit && Number(formData.maxDailyJumpLimit) <= 0) {
      newErrors.maxDailyJumpLimit = 'Max daily jump limit must be greater than 0'
    }

    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return

    setSubmitting(true)
    try {
      await updateRunningHourCounter(counter.id!, {
        name: formData.name.trim(),
        maxDailyJumpLimit: formData.maxDailyJumpLimit ? Number(formData.maxDailyJumpLimit) : undefined,
      })
      toast.success('Counter updated successfully', { position: 'top-center' })
      onSuccess()
    } catch (error: any) {
      console.error('Error updating counter:', error)
      toast.error(error.message || 'Failed to update counter', { position: 'top-center' })
    } finally {
      setSubmitting(false)
    }
  }

  if (!visible) return null

  return (
    <div style={WRAP_STYLE} tabIndex={-1} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className='bg-white text-dark rounded shadow-lg d-flex flex-column'
        style={{
          width: '600px',
          maxWidth: '90vw',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className='d-flex align-items-center justify-content-between border-bottom px-4 py-3 flex-shrink-0'>
          <h5 className='modal-title text-dark m-0'>Edit Counter</h5>
          <button type='button' className='btn-close' onClick={onClose}></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className='flex-grow-1 overflow-auto px-4 py-3'>
            <div className='mb-5'>
              <label className={LABEL}>
                Counter Name <span className='text-danger'>*</span>
              </label>
              <input
                type='text'
                className={`form-control text-dark ${errors.name ? 'is-invalid' : ''}`}
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value })
                  if (errors.name) setErrors({ ...errors, name: '' })
                }}
                placeholder='e.g., Main Engine Running Hours'
              />
              {errors.name && <div className='invalid-feedback'>{errors.name}</div>}
            </div>
            <div className='mb-5'>
              <label className={LABEL}>
                Max Daily Jump Limit <span className='text-danger'>*</span>
              </label>
              <input
                type='number'
                className={`form-control text-dark ${errors.maxDailyJumpLimit ? 'is-invalid' : ''}`}
                value={formData.maxDailyJumpLimit}
                onChange={(e) => {
                  setFormData({ ...formData, maxDailyJumpLimit: e.target.value })
                  if (errors.maxDailyJumpLimit) setErrors({ ...errors, maxDailyJumpLimit: '' })
                }}
                placeholder='e.g., 24 (hours)'
                min='1'
              />
              {errors.maxDailyJumpLimit && <div className='invalid-feedback'>{errors.maxDailyJumpLimit}</div>}
              <div className='form-text text-muted'>
                Maximum allowed increase in running hours per day. Readings exceeding this limit will be flagged as invalid.
              </div>
            </div>
            <div className='mb-5'>
              <label className={LABEL}>Equipment</label>
              <input
                type='text'
                className='form-control text-dark'
                value={counter.equipmentName || '-'}
                disabled
                style={{ backgroundColor: '#f8f9fa' }}
              />
            </div>
            <div className='mb-5'>
              <label className={LABEL}>Current Value</label>
              <input
                type='text'
                className='form-control text-dark'
                value={counter.currentValue?.toLocaleString() || '0'}
                disabled
                style={{ backgroundColor: '#f8f9fa' }}
              />
            </div>
          </div>
          <div className='border-top d-flex justify-content-end gap-2 px-4 py-3 flex-shrink-0'>
            <button type='button' className='btn btn-light btn-sm' onClick={onClose}>
              Cancel
            </button>
            <button type='submit' className='btn btn-primary btn-sm' disabled={submitting}>
              {submitting ? 'Updating...' : 'Update Counter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

