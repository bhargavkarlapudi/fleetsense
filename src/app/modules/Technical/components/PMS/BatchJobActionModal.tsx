import React, { FC, useState } from 'react'
import { KTSVG } from '../../../../../_metronic/helpers'
import { toast } from 'react-toastify'
import { bulkDeferJobs, bulkCancelJobs } from '../../core/pms/_requests'

interface Props {
  visible: boolean
  selectedJobIds: number[]
  onClose: () => void
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

export const BatchJobActionModal: FC<Props> = ({ visible, selectedJobIds, onClose, onSuccess }) => {
  const selectedCount = selectedJobIds.length
  const [action, setAction] = useState<'defer' | 'cancel' | null>(null)
  const [reason, setReason] = useState('')
  const [newDueDate, setNewDueDate] = useState('')
  const [newDueCounter, setNewDueCounter] = useState<number | undefined>()
  const [submitting, setSubmitting] = useState(false)

  const handleDefer = async () => {
    if (!reason.trim()) {
      toast.error('Reason is required', { position: 'top-center' })
      return
    }
    if (selectedJobIds.length === 0) {
      toast.error('No jobs selected', { position: 'top-center' })
      return
    }
    setSubmitting(true)
    try {
      const result = await bulkDeferJobs(
        selectedJobIds,
        reason,
        newDueDate || undefined,
        newDueCounter || undefined
      )
      toast.success(
        `Deferred ${result.successful.length} job(s)${result.failed && Object.keys(result.failed).length > 0 ? `. ${Object.keys(result.failed).length} failed.` : ''}`,
        { position: 'top-center' }
      )
      onSuccess()
      onClose()
    } catch (error: any) {
      toast.error(error?.message || 'Failed to defer jobs', { position: 'top-center' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = async () => {
    if (!reason.trim()) {
      toast.error('Reason is required', { position: 'top-center' })
      return
    }
    if (selectedJobIds.length === 0) {
      toast.error('No jobs selected', { position: 'top-center' })
      return
    }
    setSubmitting(true)
    try {
      const result = await bulkCancelJobs(selectedJobIds, reason)
      toast.success(
        `Cancelled ${result.successful.length} job(s)${result.failed && Object.keys(result.failed).length > 0 ? `. ${Object.keys(result.failed).length} failed.` : ''}`,
        { position: 'top-center' }
      )
      onSuccess()
      onClose()
    } catch (error: any) {
      toast.error(error?.message || 'Failed to cancel jobs', { position: 'top-center' })
    } finally {
      setSubmitting(false)
    }
  }

  if (!visible) return null

  return (
    <div style={WRAP_STYLE} tabIndex={-1} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className='bg-white text-dark rounded shadow-lg d-flex flex-column'
        style={{ width: '600px', maxWidth: '90vw', maxHeight: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className='d-flex align-items-center justify-content-between border-bottom px-4 py-3 flex-shrink-0'>
          <h5 className='modal-title text-dark m-0'>Batch Actions ({selectedCount} jobs)</h5>
          <button type='button' className='btn-close' onClick={onClose}></button>
        </div>

        <div className='flex-grow-1 overflow-auto px-4 py-3'>
          {!action && (
            <div className='mb-5'>
              <label className={LABEL}>Select Action</label>
              <div className='d-flex gap-3'>
                <button
                  type='button'
                  className='btn btn-warning btn-sm'
                  onClick={() => setAction('defer')}
                >
                  Defer Jobs
                </button>
                <button
                  type='button'
                  className='btn btn-danger btn-sm'
                  onClick={() => setAction('cancel')}
                >
                  Cancel Jobs
                </button>
              </div>
            </div>
          )}

          {action === 'defer' && (
            <>
              <div className='mb-5'>
                <label className={`${LABEL} required`}>Reason</label>
                <textarea
                  className='form-control'
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder='Enter reason for deferring jobs...'
                  required
                />
              </div>
              <div className='mb-5'>
                <label className={LABEL}>New Due Date (Optional)</label>
                <input
                  type='date'
                  className='form-control'
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                />
              </div>
              <div className='mb-5'>
                <label className={LABEL}>New Due Counter - Hours (Optional)</label>
                <input
                  type='number'
                  className='form-control'
                  min={0}
                  value={newDueCounter ?? ''}
                  onChange={(e) => setNewDueCounter(e.target.value ? Number(e.target.value) : undefined)}
                  placeholder='Enter new due counter in hours'
                />
              </div>
            </>
          )}

          {action === 'cancel' && (
            <div className='mb-5'>
              <label className={`${LABEL} required`}>Reason</label>
              <textarea
                className='form-control'
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder='Enter reason for cancelling jobs...'
                required
              />
            </div>
          )}
        </div>

        <div className='border-top d-flex justify-content-end gap-2 px-4 py-3 flex-shrink-0'>
          {action && (
            <button
              type='button'
              className='btn btn-light btn-sm'
              onClick={() => {
                setAction(null)
                setReason('')
                setNewDueDate('')
                setNewDueCounter(undefined)
              }}
              disabled={submitting}
            >
              Back
            </button>
          )}
          {action === 'defer' && (
            <button
              type='button'
              className='btn btn-warning btn-sm'
              onClick={handleDefer}
              disabled={submitting || !reason.trim()}
            >
              {submitting ? 'Deferring...' : 'Confirm Defer'}
            </button>
          )}
          {action === 'cancel' && (
            <button
              type='button'
              className='btn btn-danger btn-sm'
              onClick={handleCancel}
              disabled={submitting || !reason.trim()}
            >
              {submitting ? 'Cancelling...' : 'Confirm Cancel'}
            </button>
          )}
          {!action && (
            <button type='button' className='btn btn-light btn-sm' onClick={onClose}>
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

