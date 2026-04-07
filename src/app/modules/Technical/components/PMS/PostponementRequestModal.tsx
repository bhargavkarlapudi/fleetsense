import React, { FC, useState, useEffect } from 'react'
import { KTSVG } from '../../../../../_metronic/helpers'
import { toast } from 'react-toastify'
import type { PmsJobDto, PmsPostponementRequestDto, PmsPostponementReasonCategory } from '../../core/pms/_models'
import { createPostponementRequest, listJobAttachments } from '../../core/pms/_requests'
import type { PmsJobAttachmentDto } from '../../core/pms/_models'

interface Props {
  visible: boolean
  job: PmsJobDto
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

const REASON_CATEGORIES: { value: PmsPostponementReasonCategory; label: string }[] = [
  { value: 'WEATHER', label: 'Weather' },
  { value: 'PORT_OPS', label: 'Port Operations' },
  { value: 'SPARES_NOT_AVAILABLE', label: 'Spares Not Available' },
  { value: 'MANPOWER', label: 'Manpower' },
  { value: 'EQUIPMENT_UNAVAILABLE', label: 'Equipment Unavailable' },
  { value: 'SAFETY_CONCERN', label: 'Safety Concern' },
  { value: 'OTHER', label: 'Other' },
]

export const PostponementRequestModal: FC<Props> = ({ visible, job, onClose, onSuccess }) => {
  const [formData, setFormData] = useState<Partial<PmsPostponementRequestDto>>({
    jobId: job.id!,
    reasonCategory: 'OTHER',
    reasonDetails: '',
    proposedDueDate: job.dueDate || undefined,
    proposedDueCounter: job.dueCounter || undefined,
    evidenceAttachmentId: undefined,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [attachments, setAttachments] = useState<PmsJobAttachmentDto[]>([])
  const [loadingAttachments, setLoadingAttachments] = useState(false)

  useEffect(() => {
    if (visible && job.id) {
      loadAttachments()
    }
  }, [visible, job.id])

  const loadAttachments = async () => {
    if (!job.id) return
    setLoadingAttachments(true)
    try {
      const data = await listJobAttachments(job.id)
      setAttachments(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error loading attachments:', error)
    } finally {
      setLoadingAttachments(false)
    }
  }

  const validate = () => {
    const e: Record<string, string> = {}

    if (!formData.reasonCategory) {
      e.reasonCategory = 'Reason category is required'
    }
    if (!formData.reasonDetails?.trim()) {
      e.reasonDetails = 'Reason details are required'
    }
    if (!formData.proposedDueDate && !formData.proposedDueCounter) {
      e.proposedDueDate = 'Either proposed due date or due counter is required'
    }

    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setSubmitting(true)
    try {
      await createPostponementRequest(formData as PmsPostponementRequestDto)
      toast.success('Postponement request submitted successfully', { position: 'top-center' })
      onSuccess()
      onClose()
    } catch (error: any) {
      console.error('Error creating postponement request:', error)
      toast.error(error?.message || 'Failed to submit postponement request', { position: 'top-center' })
    } finally {
      setSubmitting(false)
    }
  }

  if (!visible) return null

  return (
    <div style={WRAP_STYLE} tabIndex={-1} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className='bg-white text-dark rounded shadow-lg d-flex flex-column'
        style={{ width: '700px', maxWidth: '90vw', maxHeight: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className='d-flex align-items-center justify-content-between border-bottom px-4 py-3 flex-shrink-0'>
          <h5 className='modal-title text-dark m-0'>Request Postponement</h5>
          <button type='button' className='btn-close' onClick={onClose}></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className='flex-grow-1 overflow-auto px-4 py-3'>
            {/* Job Info */}
            <div className='mb-5'>
              <label className={LABEL}>Job</label>
              <div className='border rounded p-3 bg-light-subtle'>
                <div>
                  <strong>Code:</strong> {job.jobCode || '-'}
                </div>
                <div>
                  <strong>Title:</strong> {job.title || '-'}
                </div>
                <div>
                  <strong>Current Due Date:</strong>{' '}
                  {job.dueDate ? new Date(job.dueDate).toLocaleDateString() : '-'}
                </div>
                {job.dueCounter && (
                  <div>
                    <strong>Current Due Counter:</strong> {job.dueCounter.toLocaleString()} hours
                  </div>
                )}
              </div>
            </div>

            {/* Reason Category */}
            <div className='mb-5'>
              <label className={`${LABEL} required`}>Reason Category</label>
              <select
                className={`form-select ${errors.reasonCategory ? 'is-invalid' : ''}`}
                value={formData.reasonCategory || ''}
                onChange={(e) => {
                  setFormData((prev) => ({
                    ...prev,
                    reasonCategory: e.target.value as PmsPostponementReasonCategory,
                  }))
                  setErrors((prev) => ({ ...prev, reasonCategory: '' }))
                }}
              >
                <option value=''>Select Reason Category</option>
                {REASON_CATEGORIES.map((rc) => (
                  <option key={rc.value} value={rc.value}>
                    {rc.label}
                  </option>
                ))}
              </select>
              {errors.reasonCategory && <div className='invalid-feedback'>{errors.reasonCategory}</div>}
            </div>

            {/* Reason Details */}
            <div className='mb-5'>
              <label className={`${LABEL} required`}>Reason Details</label>
              <textarea
                className={`form-control ${errors.reasonDetails ? 'is-invalid' : ''}`}
                rows={4}
                value={formData.reasonDetails || ''}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, reasonDetails: e.target.value }))
                  setErrors((prev) => ({ ...prev, reasonDetails: '' }))
                }}
                placeholder='Provide detailed reason for postponement...'
              />
              {errors.reasonDetails && <div className='invalid-feedback'>{errors.reasonDetails}</div>}
            </div>

            {/* Proposed Due Date */}
            <div className='mb-5'>
              <label className={LABEL}>Proposed Due Date</label>
              <input
                type='date'
                className={`form-control ${errors.proposedDueDate ? 'is-invalid' : ''}`}
                value={formData.proposedDueDate || ''}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, proposedDueDate: e.target.value || undefined }))
                  setErrors((prev) => ({ ...prev, proposedDueDate: '' }))
                }}
              />
              {errors.proposedDueDate && <div className='invalid-feedback'>{errors.proposedDueDate}</div>}
            </div>

            {/* Proposed Due Counter */}
            {job.scheduleType === 'RUNNING_HOURS' ||
            job.scheduleType === 'HYBRID_WHICHEVER_FIRST' ||
            job.scheduleType === 'HYBRID_BOTH_REQUIRED' ? (
              <div className='mb-5'>
                <label className={LABEL}>Proposed Due Counter (Hours)</label>
                <input
                  type='number'
                  className='form-control'
                  min={0}
                  value={formData.proposedDueCounter ?? ''}
                  onChange={(e) => {
                    setFormData((prev) => ({
                      ...prev,
                      proposedDueCounter: e.target.value ? Number(e.target.value) : undefined,
                    }))
                  }}
                  placeholder='Enter proposed due counter in hours'
                />
              </div>
            ) : null}

            {/* Evidence Attachment */}
            {attachments.length > 0 && (
              <div className='mb-5'>
                <label className={LABEL}>Evidence Attachment (Optional)</label>
                <select
                  className='form-select'
                  value={formData.evidenceAttachmentId ?? ''}
                  onChange={(e) => {
                    setFormData((prev) => ({
                      ...prev,
                      evidenceAttachmentId: e.target.value ? Number(e.target.value) : undefined,
                    }))
                  }}
                >
                  <option value=''>None</option>
                  {attachments.map((att) => (
                    <option key={att.id} value={att.id}>
                      {att.fileName}
                    </option>
                  ))}
                </select>
                <div className='text-muted fs-7 mt-2'>
                  Select an existing attachment as evidence for this postponement request.
                </div>
              </div>
            )}

            <div className='alert alert-info'>
              <strong>Note:</strong> This request will be sent to shore for approval. The job will remain in its
              current state until approved or rejected.
            </div>
          </div>

          <div className='border-top d-flex justify-content-end gap-2 px-4 py-3 flex-shrink-0'>
            <button type='button' className='btn btn-light btn-sm' onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type='submit' className='btn btn-primary btn-sm' disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

