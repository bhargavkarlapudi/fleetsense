import React, { FC, useState } from 'react'
import { toast } from 'react-toastify'

export interface AddManualPlanModalProps {
  visible: boolean
  onClose: () => void
  onSubmit: (data: {
    name: string
    revisionNo?: string
    approvedBy?: string
    remarks?: string
    companyGroupAdminId?: number | null
    companyAdminId?: number | null
    vesselId?: number | null
    __file: File
    dateOfApproval?: string
  }) => void

  // Top-level vs scoped
  isTopLevel: boolean

  // Only used when isTopLevel === true
  companies: Array<{ id: number; name: string }>
  selectedCompanyId: number | ''
  setSelectedCompanyId: (v: number | '') => void
  isLoadingCompanies?: boolean

  // Only used when isTopLevel === false
  derivedCompanyGroupId: number | null
}

export const AddManualPlanModal: FC<AddManualPlanModalProps> = ({
  visible,
  onClose,
  onSubmit,

  isTopLevel,
  companies,
  selectedCompanyId,
  setSelectedCompanyId,
  isLoadingCompanies,

  derivedCompanyGroupId,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    approvedBy: '',
    remarks: '',
    dateOfApproval: '',
  })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setSelectedFile(file)
    if (errors.file) setErrors((prev) => ({ ...prev, file: '' }))
  }

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {}
    if (isTopLevel && !selectedCompanyId) newErrors.company = 'Company is required'
    if (!isTopLevel && !derivedCompanyGroupId) newErrors.company = 'No company is assigned'
    if (!formData.name.trim()) newErrors.name = 'Name is required'
    if (!selectedFile) newErrors.file = 'File upload is required'
    if (formData.remarks && formData.remarks.length > 500)
      newErrors.remarks = 'Remarks cannot exceed 500 characters'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const resetForm = () => {
    setFormData({
      name: '',
      approvedBy: '',
      remarks: '',
      dateOfApproval: '',
    })
    setSelectedFile(null)
    setErrors({})
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm() || !selectedFile) return

    // Decide which CGA id to send
    const companyGroupAdminId = isTopLevel
      ? (selectedCompanyId || null)
      : (derivedCompanyGroupId ?? null)

    onSubmit({
      name: formData.name,
      approvedBy: formData.approvedBy || undefined,
      remarks: formData.remarks || undefined,
      dateOfApproval: formData.dateOfApproval || undefined,

      // file to page so it can call createManualPlan(...)
      __file: selectedFile,

      // company-only fields (we don’t use companyAdminId/vesselId here)
      companyGroupAdminId,
      companyAdminId: null,
      vesselId: null,
    })

    resetForm()
    onClose()
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  if (!visible) return null

  return (
    <div
      className="modal fade show d-flex align-items-center justify-content-center"
      tabIndex={-1}
      style={{
        backgroundColor: 'rgba(0,0,0,0.5)',
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 1050,
      }}
    >
      <div className="modal-dialog modal-lg modal-dialog-centered" role="document">
        <div className="modal-content bg-white" style={{ color: '#181C32' }}>
          <form onSubmit={handleSubmit}>
            <div className="modal-header">
              <h5 className="modal-title">Add Manual/Plan</h5>
              <button type="button" className="btn-close" onClick={handleClose}></button>
            </div>

            <div className="modal-body">
              <div className="row g-3">
                <div className="col-12">
                  <label className="form-label required fw-semibold fs-6 mb-2" style={{ color: '#181C32' }}>
                    Manual/Plan Name
                  </label>
                  <input
                    type="text"
                    className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Enter manual/plan name"
                    style={{ color: '#000' }}
                  />
                  {errors.name && <div className="invalid-feedback">{errors.name}</div>}
                </div>

                {/* Company dropdown only for top-level users */}
                {isTopLevel && (
                  <div className="col-md-6">
                    <label className="form-label required fw-semibold fs-6 mb-2" style={{ color: '#181C32' }}>
                      Company
                    </label>
                    <select
                      className={`form-select ${errors.company ? 'is-invalid' : ''}`}
                      value={selectedCompanyId || ''}
                      onChange={(e) => setSelectedCompanyId(e.target.value ? Number(e.target.value) : '')}
                      disabled={!!isLoadingCompanies}
                    >
                      {/* No "All" — pick explicit company */}
                      {companies.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    {errors.company && <div className="invalid-feedback">{errors.company}</div>}
                  </div>
                )}

                <div className="col-12">
                  <label className="form-label required fw-semibold fs-6 mb-2" style={{ color: '#181C32' }}>
                    Upload File
                  </label>
                  <input
                    type="file"
                    className={`form-control ${errors.file ? 'is-invalid' : ''}`}
                    onChange={handleFileChange}
                    accept=".pdf,.doc,.docx,.xlsx,.xls,.ppt,.pptx"
                  />
                  {selectedFile && (
                    <div className="mt-2">
                      <small className="text-muted">
                        Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                      </small>
                    </div>
                  )}
                  {errors.file && <div className="invalid-feedback">{errors.file}</div>}
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-semibold fs-6 mb-2" style={{ color: '#181C32' }}>
                    Approved By
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    name="approvedBy"
                    value={formData.approvedBy}
                    onChange={handleInputChange}
                    placeholder="Enter approver name"
                    style={{ color: '#000' }}
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-semibold fs-6 mb-2" style={{ color: '#181C32' }}>
                    Date of Approval
                  </label>
                  <input
                    type="date"
                    className="form-control"
                    name="dateOfApproval"
                    value={formData.dateOfApproval}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="col-12">
                  <label className="form-label fw-semibold fs-6 mb-2" style={{ color: '#181C32' }}>
                    Remarks
                  </label>
                  <textarea
                    className={`form-control ${errors.remarks ? 'is-invalid' : ''}`}
                    name="remarks"
                    value={formData.remarks}
                    onChange={handleInputChange}
                    rows={4}
                    placeholder="Enter remarks (max 500 characters)"
                    maxLength={500}
                    style={{ color: '#000' }}
                  />
                  <div className="form-text">{formData.remarks.length}/500 characters</div>
                  {errors.remarks && <div className="invalid-feedback">{errors.remarks}</div>}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-light btn-sm" onClick={handleClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn_primary">
                Add Manual/Plan
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
