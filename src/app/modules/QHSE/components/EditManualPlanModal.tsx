import React, { FC, useEffect, useState } from 'react'

type ManualPlanRecordLike = {
  id: number
  name: string
  dateOfApproval?: string
  revisionNo?: string
  approvedBy?: string
  remarks?: string
  uploadedDate?: string
  file?: { name: string }          // <-- so we can display current file name
}

export interface EditManualPlanModalProps {
  visible: boolean
  onClose: () => void
  record: ManualPlanRecordLike
  onSubmit: (data: {
    id: number
    name: string
    revisionNo?: string
    approvedBy?: string
    remarks?: string
    dateOfApproval?: string
    __file?: File | null           // 🔴 send selected new file up
  }) => void
  onViewFile: (id: number) => void // <-- parent will open ManualPlanViewer
  companyName?: string
}

const toInputDate = (iso?: string) => {
  if (!iso) return ''
  return iso.length >= 10 ? iso.substring(0, 10) : iso
}

export const EditManualPlanModal: FC<EditManualPlanModalProps> = ({
  visible,
  onClose,
  record,
  onSubmit,
  onViewFile,
  companyName,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    revisionNo: '',
    approvedBy: '',
    dateOfApproval: '',
    remarks: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [newFile, setNewFile] = useState<File | null>(null) // 🔴 local state

  useEffect(() => {
    if (record) {
      setFormData({
        name: record.name || '',
        revisionNo: record.revisionNo || '',
        approvedBy: record.approvedBy || '',
        dateOfApproval: toInputDate(record.dateOfApproval),
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
    setFormData((p) => ({ ...p, [name]: value }))
    if (errors[name]) setErrors((p) => ({ ...p, [name]: '' }))
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!formData.name.trim()) e.name = 'Name is required'
    if (formData.remarks && formData.remarks.length > 500)
      e.remarks = 'Remarks cannot exceed 500 characters'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!validate()) return
if (newFile && newFile.size === 0) {
  setErrors(prev => ({ ...prev, __file: 'Selected file is empty' }))
  return
}
    onSubmit({
      id: record.id,
      name: formData.name.trim(),
      revisionNo: formData.revisionNo || undefined,
      approvedBy: formData.approvedBy || undefined,
      dateOfApproval: formData.dateOfApproval || undefined,
      remarks: formData.remarks || undefined,
      __file: newFile,         // 🔴 bubble new file to parent
    })
  }

  const handleClose = () => onClose()

  if (!visible) return null

  return (
    <div
      className='modal fade show d-flex align-items-center justify-content-center'
      tabIndex={-1}
      style={{
        backgroundColor: 'rgba(0,0,0,0.5)',
        position: 'fixed',
        inset: 0,
        zIndex: 1050,
      }}
    >
      <div className='modal-dialog modal-lg modal-dialog-centered' role='dialog' aria-modal='true'>
        <div className='modal-content bg-white text-dark'>
          <form onSubmit={handleSubmit}>
            <div className='modal-header'>
              <h5 className='modal-title'>Edit Manual/Plan</h5>
              <button type='button' className='btn-close' onClick={handleClose}></button>
            </div>

            <div className='modal-body'>
              <div className='row g-3'>
                <div className='col-12'>
                  <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>
                    Manual/Plan Name
                  </label>
                  <input
                    type='text'
                    name='name'
                    className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder='Enter manual/plan name'
                    style={{ color: '#000' }}     // <-- ensure visible text
                  />
                  {errors.name && <div className='invalid-feedback'>{errors.name}</div>}
                </div>

                {/* Read-only company info */}
                {!!companyName && (
                  <div className='col-md-6'>
                    <label className='form-label fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>
                      Company
                    </label>
                    <input type='text' className='form-control' value={companyName} disabled style={{ color: '#000' }} />
                  </div>
                )}

                {/* Existing file */}
                <div className='col-12'>
                  <label className='form-label fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>
                    Existing File
                  </label>
                  <div className='d-flex align-items-center justify-content-between border rounded p-2'>
                    <div
                      className='text-truncate'
                      title={record?.file?.name || record?.name || '-'}
                      style={{ color: '#000' }}
                    >
                      <span className='fw-semibold'>{record?.file?.name || '-'}</span>
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

                {/* Replace File (Optional) */}
<div className='col-12'>
  <label className='form-label fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>
    Replace File (creates new revision)
  </label>
  <input
  type='file'
  className='form-control'
  onChange={(e) => {
    const f = e.target.files?.[0] || null
    setNewFile(f)              // <-- this is the missing line
  }}
  accept=".pdf,.doc,.docx,.xlsx,.xls,.ppt,.pptx"
/>
{newFile && (
  <div className='form-text'>
    Selected: {newFile.name} ({(newFile.size/1024/1024).toFixed(2)} MB)
  </div>
)}

  <div className='form-text'>Selecting a new file will create the next revision.</div>
</div>


                <div className='col-md-6'>
                  <label className='form-label fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>
                    Approved By
                  </label>
                  <input
                    type='text'
                    name='approvedBy'
                    className='form-control'
                    value={formData.approvedBy}
                    onChange={handleInputChange}
                    placeholder='Enter approver name'
                    style={{ color: '#000' }}
                  />
                </div>

                <div className='col-md-6'>
                  <label className='form-label fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>
                    Date of Approval
                  </label>
                  <input
                    type='date'
                    name='dateOfApproval'
                    className='form-control'
                    value={formData.dateOfApproval}
                    onChange={handleInputChange}
                    style={{ color: '#000' }}
                  />
                </div>

                <div className='col-12'>
                  <label className='form-label fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>
                    Remarks
                  </label>
                  <textarea
                    name='remarks'
                    className={`form-control ${errors.remarks ? 'is-invalid' : ''}`}
                    rows={4}
                    value={formData.remarks}
                    onChange={handleInputChange}
                    maxLength={500}
                    placeholder='Enter remarks (max 500 characters)'
                    style={{ color: '#000' }}
                  />
                  <div className='form-text'>{formData.remarks.length}/500 characters</div>
                  {errors.remarks && <div className='invalid-feedback'>{errors.remarks}</div>}
                </div>
              </div>
            </div>

            <div className='modal-footer'>
              <button type='button' className='btn btn-light btn-sm' onClick={handleClose}>
                Cancel
              </button>
              <button type='submit' className='btn btn_primary'>
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
