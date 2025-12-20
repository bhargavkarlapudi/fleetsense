import React, { FC, useState, useMemo, useEffect } from 'react'

type VesselLiteLocal = {
  id: number
  name: string
  fleet_name?: string
  companyGroupAdminId?: number
  companyAdminId?: number
}

type CompanyGroup = { id: number; name: string }
type Subcompany = { id: number; name: string; companyId: number }

type Props = {
  visible: boolean
  onClose: () => void
  onSubmit: (data: {
    vesselId: number
    dateOfIssue?: string
    remarks?: string
    __file: File
  }) => void
  vessels: VesselLiteLocal[]
  companies: CompanyGroup[]
  subcompanies: Subcompany[]
  showCompanyFilters?: boolean
  isCrew?: boolean
  defaultVesselId?: number
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

export const AddRiskAssessmentModal: FC<Props> = ({
  visible,
  onClose,
  onSubmit,
  vessels,
  companies,
  subcompanies,
  showCompanyFilters = true,
  isCrew = false,
  defaultVesselId,
}) => {
  const [companyId, setCompanyId] = useState<string>('')
  const [subcompanyId, setSubcompanyId] = useState<string>('')
  const [vesselId, setVesselId] = useState<string>('')
  
  const [formData, setFormData] = useState({
    dateOfIssue: '',
    remarks: '',
  })
  const [file, setFile] = useState<File | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Filter vessels based on company/subcompany selection
  const vesselsForModal = useMemo(() => {
    let list = vessels
    if (companyId) {
      const cid = Number(companyId)
      list = list.filter(v =>
        Number((v as any).companyGroupAdminId ?? (v as any).companyGroupId ?? (v as any).cgaid?.id) === cid
      )
    }
    if (subcompanyId) {
      const scid = Number(subcompanyId)
      list = list.filter(v =>
        Number((v as any).companyAdminId ?? (v as any).companyId) === scid
      )
    }
    return list
  }, [vessels, companyId, subcompanyId])

  const subcompaniesForCompany = useMemo(() => {
    if (!companyId) return []
    const cid = Number(companyId)
    return subcompanies.filter(sc => sc.companyId === cid)
  }, [subcompanies, companyId])

  const hasSubcompaniesForCompany = subcompaniesForCompany.length > 0

  // Auto-select vessel for crew or if only one vessel available
  useEffect(() => {
    if (isCrew && defaultVesselId && !vesselId) {
      setVesselId(String(defaultVesselId))
    }
  }, [isCrew, defaultVesselId, vesselId])

  useEffect(() => {
    if (!vesselId && vesselsForModal.length === 1) {
      setVesselId(String(vesselsForModal[0].id))
    }
  }, [vesselsForModal, vesselId])

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null
    setFile(f)
    if (errors.file) setErrors((prev) => ({ ...prev, file: '' }))
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!vesselId && !isCrew) e.vesselId = 'Vessel is required'
    if (!formData.dateOfIssue) e.dateOfIssue = 'Date of Issue is required'
    if (!file) e.file = 'File is required'
    if (!formData.remarks || formData.remarks.trim().length === 0)
      e.remarks = 'Remarks is required'
    if (formData.remarks && formData.remarks.length > 500)
      e.remarks = 'Remarks cannot exceed 500 characters'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const reset = () => {
    setFormData({
      dateOfIssue: '',
      remarks: '',
    })
    setFile(null)
    setErrors({})
    setCompanyId('')
    setSubcompanyId('')
    setVesselId('')
  }

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!validate() || !file) return
    if (!isCrew && !vesselId) return
    if (isCrew && !vesselId && !defaultVesselId) return

    onSubmit({
      vesselId: Number(vesselId || defaultVesselId),
      dateOfIssue: formData.dateOfIssue,
      remarks: formData.remarks,
      __file: file,
    })
    reset()
    onClose()
  }

  const handleClose = () => {
    reset()
    onClose()
  }

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
          <h5 className='modal-title text-dark m-6'>Add Risk Assessment Form</h5>
          <button type='button' className='btn-close m-6' onClick={handleClose} />
        </div>

        {/* Body with inner scroll */}
        <div className='flex-grow-1 overflow-auto px-4 py-3 m-6'>
          <form onSubmit={handleSubmit} id='add-risk-assessment-form'>
            <div className='row g-3'>
              {/* Company */}
              {showCompanyFilters && (
                <div className='col-md-4'>
                  <label className={LABEL}>Company</label>
                  <select
                    className='form-select text-dark'
                    value={companyId}
                    onChange={(e) => {
                      setCompanyId(e.target.value)
                      setSubcompanyId('')
                      setVesselId('')
                    }}
                  >
                    <option value=''>All Companies</option>
                    {companies.map((c) => (
                      <option key={c.id} value={String(c.id)}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Subcompany */}
              {showCompanyFilters &&
                Boolean(companyId) &&
                hasSubcompaniesForCompany && (
                  <div className='col-md-4'>
                    <label className={LABEL}>Subcompany</label>
                    <select
                      className='form-select text-dark'
                      value={subcompanyId}
                      onChange={(e) => {
                        setSubcompanyId(e.target.value)
                        setVesselId('')
                      }}
                    >
                      <option value=''>All Subcompanies</option>
                      {subcompaniesForCompany.map((sc) => (
                        <option key={sc.id} value={String(sc.id)}>
                          {sc.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

              {/* Vessel */}
              {!isCrew && (
                <div className='col-md-4'>
                  <label className={LABEL}>
                    Vessel <span style={{ color: '#dc3545' }}>*</span>
                  </label>
                  <select
                    className={`form-select text-dark ${errors.vesselId ? 'is-invalid' : ''}`}
                    value={vesselId}
                    onChange={(e) => setVesselId(e.target.value)}
                  >
                    <option value=''>Select Vessel</option>
                    {vesselsForModal.map((v) => (
                      <option key={v.id} value={String(v.id)}>
                        {v.fleet_name || v.name || `Vessel ${v.id}`}
                      </option>
                    ))}
                  </select>
                  {errors.vesselId && <div className='invalid-feedback'>{errors.vesselId}</div>}
                </div>
              )}

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
                <div className='form-text'>
                  Expiry = Issue + 5 years.
                </div>
                {errors.dateOfIssue && <div className='invalid-feedback'>{errors.dateOfIssue}</div>}
              </div>

              <div className='col-md-8'>
                <label className={LABEL}>
                  Upload File <span style={{ color: '#dc3545' }}>*</span>
                </label>
                <input
                  type='file'
                  className={`form-control ${errors.file ? 'is-invalid' : ''}`}
                  onChange={handleFileChange}
                  accept='.pdf,.doc,.docx,.xlsx,.xls,.ppt,.pptx'
                />
                {file && (
                  <div className='form-text'>
                    Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </div>
                )}
                {errors.file && <div className='invalid-feedback'>{errors.file}</div>}
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
              const form = document.getElementById('add-risk-assessment-form') as HTMLFormElement
              if (form) {
                form.requestSubmit()
              } else {
                handleSubmit({ preventDefault: () => {} } as React.FormEvent)
              }
            }}
          >
            Add Form
          </button>
        </div>
      </div>
    </div>
  )
}