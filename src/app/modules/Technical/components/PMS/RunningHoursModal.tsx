import React, { FC, useState } from 'react'
import { RunningHourCounterDto, RunningHourReadingDto } from '../../core/pms/_models'
import { createRunningHourReading } from '../../core/pms/_requests'
import { toast } from 'react-toastify'

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
  zIndex: 2100,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

export const RunningHoursModal: FC<Props> = ({ visible, onClose, counter, onSuccess }) => {
  const [formData, setFormData] = useState<{
    readingDate: string
    value: string
  }>({
    readingDate: new Date().toISOString().split('T')[0],
    value: counter.currentValue?.toString() || '0',
  })
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  if (!visible) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: { [key: string]: string } = {}

    if (!formData.readingDate) {
      newErrors.readingDate = 'Reading date is required'
    }

    const newValue = Number(formData.value)
    if (!formData.value || isNaN(newValue)) {
      newErrors.value = 'Reading value is required'
    } else if (newValue < counter.currentValue) {
      newErrors.value = `Reading value must be greater than or equal to current value (${counter.currentValue.toLocaleString()})`
    } else if (counter.maxDailyJumpLimit && (newValue - counter.currentValue) > counter.maxDailyJumpLimit) {
      newErrors.value = `Reading exceeds max daily jump limit of ${counter.maxDailyJumpLimit} hours. Increase: ${newValue - counter.currentValue} hours`
    }

    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return

    setSubmitting(true)
    try {
      const dto: RunningHourReadingDto = {
        counterId: counter.id!,
        readingDate: formData.readingDate,
        value: Number(formData.value),
        source: 'MANUAL',
      }
      await createRunningHourReading(counter.id!, dto)
      toast.success('Reading added successfully', { position: 'top-center' })
      onSuccess()
    } catch (error: any) {
      toast.error(error.message || 'Failed to add reading', { position: 'top-center' })
    } finally {
      setSubmitting(false)
    }
  }

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
          <h5 className='modal-title text-dark m-0'>Add Running Hour Reading</h5>
          <button type='button' className='btn-close' onClick={onClose}></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className='flex-grow-1 overflow-auto px-4 py-3'>
            <div className='mb-5'>
              <label className={LABEL}>Counter</label>
              <input
                type='text'
                className='form-control text-dark'
                value={counter.name}
                disabled
                style={{ backgroundColor: '#f8f9fa' }}
              />
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
                value={counter.currentValue.toLocaleString()}
                disabled
                style={{ backgroundColor: '#f8f9fa' }}
              />
            </div>
            <div className='mb-5'>
              <label className={LABEL}>
                Reading Date <span className='text-danger'>*</span>
              </label>
              <input
                type='date'
                className={`form-control text-dark ${errors.readingDate ? 'is-invalid' : ''}`}
                value={formData.readingDate}
                onChange={(e) => {
                  setFormData({ ...formData, readingDate: e.target.value })
                  if (errors.readingDate) setErrors({ ...errors, readingDate: '' })
                }}
              />
              {errors.readingDate && <div className='invalid-feedback'>{errors.readingDate}</div>}
            </div>
            <div className='mb-5'>
              <label className={LABEL}>
                New Reading Value <span className='text-danger'>*</span>
              </label>
              <input
                type='number'
                className={`form-control text-dark ${errors.value ? 'is-invalid' : ''}`}
                value={formData.value}
                onChange={(e) => {
                  setFormData({ ...formData, value: e.target.value })
                  if (errors.value) setErrors({ ...errors, value: '' })
                }}
                min={counter.currentValue}
                step='0.01'
              />
              {errors.value && <div className='invalid-feedback'>{errors.value}</div>}
              <div className='form-text text-muted'>
                Must be greater than or equal to current value ({counter.currentValue.toLocaleString()})
              </div>
            </div>
          </div>
          <div className='border-top d-flex justify-content-end gap-2 px-4 py-3 flex-shrink-0'>
            <button type='button' className='btn btn-light btn-sm' onClick={onClose}>
              Cancel
            </button>
            <button
              type='submit'
              className='btn btn-primary btn-sm'
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : 'Add Reading'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
