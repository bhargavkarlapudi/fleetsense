import React, { FC, useEffect, useState } from 'react'
import type { RiskAssessmentRecord } from '../../core/_models'

type Props = {
  visible: boolean
  onClose: () => void
  record: RiskAssessmentRecord
  onSubmit: (data: {
    id: number
    dateOfIssue?: string
    remarks?: string
    __file?: File | null
  }) => void
  onViewFile: (id: number) => void
  vesselName?: string
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

const toInputDate = (iso?: string) => (iso ? iso.substring(0, 10) : '')

export const EditRiskAssessmentModal: FC<Props> = ({
  visible,
  onClose,
  record,
  onSubmit,
  onViewFile,
  vesselName,
}) => {
  const [formData, setFormData] = useState({
    dateOfIssue: '',
    remarks: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [newFile, setNewFile] = useState<File | null>(null)

  useEffect(() => {
    if (record) {
      setFormData({
        dateOfIssue: toInputDate(record.dateOfIssue),
        remarks: record.remarks || '',
      })
      setErrors({})
      setNewFile(null)
    }
  }, [record])

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }))
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!formData.dateOfIssue) e.dateOfIssue = 'Date of Issue is required'
    if (!formData.remarks || formData.remarks.trim().length === 0)
      e.remarks = 'Remarks is required'
    if (formData.remarks && formData.remarks.length > 500)
      e.remarks = 'Remarks cannot exceed 500 characters'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!validate()) return
    if (newFile && newFile.size === 0) {
      setErrors((p) => ({ ...p, __file: 'Selected file is empty' }))
      return
    }

    onSubmit({
      id: record.id,
      dateOfIssue: formData.dateOfIssue || undefined,
      remarks: formData.remarks || undefined,
      __file: newFile,
    })
  }

  const handleClose = () => onClose()

  if (!visible) return null

  return (
    <div style={WRAP_STYLE} tabIndex={-1}>
      <div
        className='bg-white text-dark rounded shadow-lg d-flex flex-column'
        style={{
          width: '70vw',
          height: '70vh',
          maxWidth: '1100px',
          maxHeight: '800px',
        }}
      >
        {/* Header */}
        <div className='d-flex align-items-center justify-content-between border-bottom px-4 py-3 flex-shrink-0'>
          <h5 className='modal-title text-dark m-6'>Edit Risk Assessment Form</h5>
          <button type='button' className='btn-close m-6' onClick={handleClose}></button>
        </div>

        {/* Body with inner scroll */}
        <div className='flex-grow-1 overflow-auto px-4 py-3 m-6'>
          <form onSubmit={handleSubmit} id='edit-risk-assessment-form'>
            <div className='row g-3'>
              {vesselName && (
                <div className='col-md-6'>
                  <label className={LABEL}>Vessel</label>
                  <input type='text' className='form-control' value={vesselName} disabled />
                  <div className='form-text'>Vessel cannot be changed once form is created.</div>
                </div>
              )}

              <div className='col-md-6'>
                <label className={LABEL}>Form Number</label>
                <input
                  type='text'
                  className='form-control'
                  value={record.assessmentNumber}
                  disabled
                />
                <div className='form-text'>
                  Form number is auto-generated (O-RAF / V-RAF) and cannot be edited.
                </div>
              </div>

              <div className='col-12'>
                <label className={LABEL}>Existing File</label>
                <div className='d-flex align-items-center justify-content-between border rounded p-2'>
                  <div className='text-truncate' title={record.file.name}>
                    <span className='fw-semibold'>{record.file.name || '-'}</span>
                  </div>
                  <button
                    type='button'
                    className='btn btn-light-primary btn-sm'
                    onClick={() => onViewFile(record.id)}
                  >
                    View
                  </button>
                </div>
              </div>

              <div className='col-12'>
                <label className={LABEL}>Replace File (creates new revision)</label>
                <input
                  type='file'
                  className='form-control'
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null
                    setNewFile(f)
                    if (errors.__file) setErrors((p) => ({ ...p, __file: '' }))
                  }}
                  accept='.pdf,.doc,.docx,.xlsx,.xls,.ppt,.pptx'
                />
                {newFile && (
                  <div className='form-text'>
                    Selected: {newFile.name} ({(newFile.size / 1024 / 1024).toFixed(2)} MB)
                  </div>
                )}
                <div className='form-text'>
                  Selecting a new file will create the next revision.
                </div>
                {errors.__file && <div className='text-danger small mt-1'>{errors.__file}</div>}
              </div>

              <div className='col-md-4'>
                <label className={LABEL}>
                  Date of Issue <span style={{ color: '#dc3545' }}>*</span>
                </label>
                <input
                  type='date'
                  name='dateOfIssue'
                  className={`form-control ${errors.dateOfIssue ? 'is-invalid' : ''}`}
                  value={formData.dateOfIssue}
                  onChange={handleInputChange}
                />
                {errors.dateOfIssue && <div className='invalid-feedback'>{errors.dateOfIssue}</div>}
              </div>

              <div className='col-12'>
                <label className={LABEL}>
                  Remarks <span style={{ color: '#dc3545' }}>*</span>
                </label>
                <textarea
                  name='remarks'
                  className={`form-control ${errors.remarks ? 'is-invalid' : ''}`}
                  rows={3}
                  value={formData.remarks}
                  onChange={handleInputChange}
                  maxLength={500}
                />
                <div className='form-text'>{formData.remarks.length}/500</div>
                {errors.remarks && <div className='invalid-feedback'>{errors.remarks}</div>}
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className='border-top d-flex justify-content-end gap-2 px-4 py-3 flex-shrink-0'>
          <button type='button' className='btn btn-light btn-sm' onClick={handleClose}>
            Cancel
          </button>
          <button
            type='button'
            className='btn btn_primary btn-sm'
            onClick={() => {
              const form = document.getElementById('edit-risk-assessment-form') as HTMLFormElement
              if (form) {
                form.requestSubmit()
              } else {
                handleSubmit({ preventDefault: () => {} } as React.FormEvent)
              }
            }}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}