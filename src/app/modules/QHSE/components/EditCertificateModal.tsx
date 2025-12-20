import React, { FC, useEffect, useState } from 'react'

type CertLike = {
  id: number
  certificateName: string
  dateOfIssue?: string
  dateOfExpiry?: string
  remarks?: string
  file?: { name: string }
}

export const EditCertificateModal: FC<{
  visible: boolean
  onClose: () => void
  record: CertLike
  onSubmit: (p: {
    id: number
    certificateName: string
    dateOfIssue?: string
    dateOfExpiry?: string
    remarks?: string
    __file?: File | null
  }) => void
  onViewFile: (id: number) => void
  vesselName?: string
}> = ({ visible, onClose, record, onSubmit, onViewFile, vesselName }) => {
  const [form, setForm] = useState({
    certificateName: '',
    dateOfIssue: '',
    dateOfExpiry: '',
    remarks: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
const [newFile, setNewFile] = useState<File | null>(null)

  useEffect(() => {
    if (!record) return
    setForm({
      certificateName: record.certificateName || '',
      dateOfIssue: (record.dateOfIssue || '').substring(0, 10),
      dateOfExpiry: (record.dateOfExpiry || '').substring(0, 10),
      remarks: record.remarks || '',
    })
    setNewFile(null)
    setErrors({})
  }, [record])

 const v = () => {
  const e: Record<string,string> = {}
  if (!form.certificateName.trim()) e.certificateName = 'Required'
  if (form.dateOfIssue && form.dateOfExpiry &&
      new Date(form.dateOfIssue) > new Date(form.dateOfExpiry)) {
    e.dateOfExpiry = 'Expiry cannot be earlier than Issue date'
  }

  // ⬇️ If a file is chosen, it must be PDF
  if (newFile) {
    const isPdfMime = newFile.type === 'application/pdf'
    const isPdfName = /\.pdf$/i.test(newFile.name || '')
    if (!isPdfMime && !isPdfName) {
      e.file = 'Only PDF files are allowed'
    }
  }

  setErrors(e)
  return Object.keys(e).length === 0
}


  const submit = (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!v()) return
    onSubmit({
      id: record.id,
      certificateName: form.certificateName.trim(),
      dateOfIssue: form.dateOfIssue || undefined,
      dateOfExpiry: form.dateOfExpiry || undefined,
      remarks: form.remarks || undefined,
      __file: newFile || undefined,
    })
  }

  if (!visible) return null
  return (
    <div className="modal fade show d-flex align-items-center justify-content-center"
         style={{background:'rgba(0,0,0,.5)', position:'fixed', inset:0, zIndex:1050}}>
      <div className="modal-dialog modal-lg modal-dialog-centered">
        <div className="modal-content bg-white text-dark">
          <form onSubmit={submit}>
            <div className="modal-header">
              <h5 className="modal-title">Edit Certificate</h5>
              <button type="button" className="btn-close" onClick={onClose}/>
            </div>
            <div className="modal-body">
              <div className="row g-3">
                {!!vesselName && (
                  <div className="col-md-6">
                    <label className="form-label required fw-semibold fs-6 mb-2" style={{ color: '#181C32' }}>Vessel</label>
                    <input className="form-control" disabled value={vesselName}/>
                  </div>
                )}
                <div className="col-12">
                  <label className="form-label required fw-semibold fs-6 mb-2" style={{ color: '#181C32' }}>Certificate Name</label>
                  <input className={`form-control ${errors.certificateName?'is-invalid':''}`}
                         value={form.certificateName}
                         onChange={e=>setForm(s=>({...s, certificateName:e.target.value}))}/>
                  {errors.certificateName && <div className="invalid-feedback">{errors.certificateName}</div>}
                </div>
                <div className="col-md-6">
                  <label className="form-label required fw-semibold fs-6 mb-2" style={{ color: '#181C32' }}>Date of Issue</label>
                  <input type="date" className="form-control"
                         value={form.dateOfIssue}
                         onChange={e=>setForm(s=>({...s, dateOfIssue:e.target.value}))}/>
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-semibold fs-6 mb-2" style={{ color: '#181C32' }}>Date of Expiry</label>
                  <input type="date" className={`form-control ${errors.dateOfExpiry?'is-invalid':''}`}
                         value={form.dateOfExpiry}
                         onChange={e=>setForm(s=>({...s, dateOfExpiry:e.target.value}))}/>
                  {errors.dateOfExpiry && <div className="invalid-feedback">{errors.dateOfExpiry}</div>}
                </div>

                {/* Existing file */}
                <div className="col-12">
                  <label className="form-label required fw-semibold fs-6 mb-2" style={{ color: '#181C32' }}>Existing File</label>
                  <div className="d-flex justify-content-between border rounded p-2">
                    <div className="text-truncate">
                      <span className="fw-semibold">{record.file?.name || record.certificateName}</span>
                    </div>
                    <button type="button" className="btn btn-light-primary btn-sm" onClick={()=>onViewFile(record.id)}>
                      View
                    </button>
                  </div>
                </div>

                {/* Replace */}
                <div className="col-12">
  <label className="form-label fw-semibold fs-6 mb-2" style={{ color: '#181C32' }}>
    Replace File (creates new revision) <span className="text-muted">(PDF only, optional)</span>
  </label>
  <input
    type="file"
    className={`form-control ${errors.file ? 'is-invalid' : ''}`}
    accept=".pdf,application/pdf"
    onChange={e => setNewFile(e.target.files?.[0] || null)}
  />
  {errors.file && <div className="invalid-feedback">{errors.file}</div>}
  {newFile && !errors.file && (
    <div className="form-text">
      Selected: {newFile.name} ({(newFile.size/1024/1024).toFixed(2)} MB)
    </div>
  )}
</div>


                <div className="col-12">
                  <label className="form-label fw-semibold fs-6 mb-2" style={{ color: '#181C32' }}>Remarks</label>
                  <textarea className="form-control" rows={3}
                            value={form.remarks}
                            onChange={e=>setForm(s=>({...s, remarks:e.target.value}))}/>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-light btn-sm" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn_primary">Save Changes</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
