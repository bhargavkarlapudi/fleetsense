import React, { FC, useState } from 'react'
import { KTSVG } from '../../../../../_metronic/helpers'
import { toast } from 'react-toastify'
import type { PmsPostponementRequestDto } from '../../core/pms/_models'
import { approvePostponementRequest, rejectPostponementRequest } from '../../core/pms/_requests'

interface Props {
  visible: boolean
  request: PmsPostponementRequestDto
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

export const PostponementApprovalModal: FC<Props> = ({ visible, request, onClose, onSuccess }) => {
  const [action, setAction] = useState<'approve' | 'reject' | null>(null)
  const [remarks, setRemarks] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleApprove = async () => {
    if (!request.id) return
    setSubmitting(true)
    try {
      await approvePostponementRequest(request.id, remarks || undefined)
      toast.success('Postponement request approved', { position: 'top-center' })
      onSuccess()
      onClose()
    } catch (error: any) {
      console.error('Error approving postponement request:', error)
      toast.error(error?.message || 'Failed to approve request', { position: 'top-center' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleReject = async () => {
    if (!request.id) return
    if (!rejectionReason.trim()) {
      toast.error('Rejection reason is required', { position: 'top-center' })
      return
    }
    setSubmitting(true)
    try {
      await rejectPostponementRequest(request.id, rejectionReason)
      toast.success('Postponement request rejected', { position: 'top-center' })
      onSuccess()
      onClose()
    } catch (error: any) {
      console.error('Error rejecting postponement request:', error)
      toast.error(error?.message || 'Failed to reject request', { position: 'top-center' })
    } finally {
      setSubmitting(false)
    }
  }

  if (!visible) return null

  const reasonCategoryLabels: Record<string, string> = {
    WEATHER: 'Weather',
    PORT_OPS: 'Port Operations',
    SPARES_NOT_AVAILABLE: 'Spares Not Available',
    MANPOWER: 'Manpower',
    EQUIPMENT_UNAVAILABLE: 'Equipment Unavailable',
    SAFETY_CONCERN: 'Safety Concern',
    OTHER: 'Other',
  }

  return (
    <div style={WRAP_STYLE} tabIndex={-1} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className='bg-white text-dark rounded shadow-lg d-flex flex-column'
        style={{ width: '700px', maxWidth: '90vw', maxHeight: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className='d-flex align-items-center justify-content-between border-bottom px-4 py-3 flex-shrink-0'>
          <h5 className='modal-title text-dark m-0'>Review Postponement Request</h5>
          <button type='button' className='btn-close' onClick={onClose}></button>
        </div>

        <div className='flex-grow-1 overflow-auto px-4 py-3'>
          {/* Request Details */}
          <div className='mb-5'>
            <label className={LABEL}>Job Information</label>
            <div className='border rounded p-3 bg-light-subtle'>
              <div>
                <strong>Job Code:</strong> {request.jobCode || '-'}
              </div>
              <div>
                <strong>Job Title:</strong> {request.jobTitle || '-'}
              </div>
            </div>
          </div>

          <div className='mb-5'>
            <label className={LABEL}>Request Details</label>
            <div className='border rounded p-3 bg-light-subtle'>
              <div className='mb-2'>
                <strong>Reason Category:</strong> {reasonCategoryLabels[request.reasonCategory] || request.reasonCategory}
              </div>
              <div className='mb-2'>
                <strong>Reason Details:</strong>
                <div className='mt-1'>{request.reasonDetails || '-'}</div>
              </div>
              {request.proposedDueDate && (
                <div className='mb-2'>
                  <strong>Proposed Due Date:</strong>{' '}
                  {new Date(request.proposedDueDate).toLocaleDateString()}
                </div>
              )}
              {request.proposedDueCounter && (
                <div className='mb-2'>
                  <strong>Proposed Due Counter:</strong> {request.proposedDueCounter.toLocaleString()} hours
                </div>
              )}
              <div className='mb-2'>
                <strong>Requested By:</strong> {request.requestedByName || '-'}
              </div>
              <div>
                <strong>Requested At:</strong>{' '}
                {request.requestedAt ? new Date(request.requestedAt).toLocaleString() : '-'}
              </div>
            </div>
          </div>

          {/* Action Selection */}
          {!action && (
            <div className='mb-5'>
              <label className={LABEL}>Action</label>
              <div className='d-flex gap-3'>
                <button
                  type='button'
                  className='btn btn-success btn-sm'
                  onClick={() => setAction('approve')}
                >
                  Approve
                </button>
                <button
                  type='button'
                  className='btn btn-danger btn-sm'
                  onClick={() => setAction('reject')}
                >
                  Reject
                </button>
              </div>
            </div>
          )}

          {/* Approval Remarks */}
          {action === 'approve' && (
            <div className='mb-5'>
              <label className={LABEL}>Approval Remarks (Optional)</label>
              <textarea
                className='form-control'
                rows={3}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder='Add any remarks for this approval...'
              />
            </div>
          )}

          {/* Rejection Reason */}
          {action === 'reject' && (
            <div className='mb-5'>
              <label className={`${LABEL} required`}>Rejection Reason</label>
              <textarea
                className='form-control'
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder='Provide reason for rejection...'
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
                setRemarks('')
                setRejectionReason('')
              }}
              disabled={submitting}
            >
              Cancel
            </button>
          )}
          {action === 'approve' && (
            <button
              type='button'
              className='btn btn-success btn-sm'
              onClick={handleApprove}
              disabled={submitting}
            >
              {submitting ? 'Approving...' : 'Confirm Approval'}
            </button>
          )}
          {action === 'reject' && (
            <button
              type='button'
              className='btn btn-danger btn-sm'
              onClick={handleReject}
              disabled={submitting || !rejectionReason.trim()}
            >
              {submitting ? 'Rejecting...' : 'Confirm Rejection'}
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

